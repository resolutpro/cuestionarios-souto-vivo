import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertSubmissionSchema,
  submissionFilterSchema,
  loginSchema,
  insertOcrJobSchema,
  insertGoogleFormsConfigSchema,
} from "@shared/schema";
import { z } from "zod";

// Mapeo de campos de texto simple (Texto -> Campo BD)
const TEXT_FIELDS_MAP: Record<string, string> = {
  "Nombre y apellidos": "nombreApellidos",
  "Nombre y apellidos:": "nombreApellidos",
  "Teléfono de contacto": "telefono",
  "Teléfono de contacto:": "telefono",
  "Correo electrónico": "email",
  "Correo electrónico:": "email",
  "Localidad": "localidad",
  "Localidad:": "localidad",
  "Referencia catastral": "referenciasCatastrales" // Coincidencia parcial
};

// Configuración para campos duplicados que dependen del orden de aparición
// "Baja", "Media", "Alta" aparecen primero en la sección PENDIENTE y luego en PEDREGOSIDAD
const ORDER_DEPENDENT_FIELDS: Record<string, string[]> = {
  "Baja": ["pendiente", "pedregosidad"],
  "Media": ["pendiente", "pedregosidad"],
  "Alta": ["pendiente", "pedregosidad"]
};

// Mapeo de opciones únicas (Radio buttons) que no se repiten
const ENUM_MAPPING: Record<string, { field: string, value: string }> = {
  // Género
  "Mujer": { field: "genero", value: "mujer" },
  "Hombre": { field: "genero", value: "hombre" },
  "Otros/es": { field: "genero", value: "otros" },
  // Edad
  "Menos de 35 años": { field: "edad", value: "menos_35" },
  "Entre 35 y 50 años": { field: "edad", value: "entre_35_50" },
  "Más de 50 años": { field: "edad", value: "mas_50" },
  // Relación
  "Propietario/a": { field: "relacionFinca", value: "propietario" },
  "Arrendatario/a": { field: "relacionFinca", value: "arrendatario" },
  "Gestor/a": { field: "relacionFinca", value: "gestor" },
  // Superficie
  "Menos de 1 ha": { field: "superficieCategoria", value: "menos_1ha" },
  "Entre 1 y 5 ha": { field: "superficieCategoria", value: "entre_1_5ha" },
  "Más de 5 ha": { field: "superficieCategoria", value: "mas_5ha" },
  // Uso suelo
  "Cultivo activo": { field: "usoSuelo", value: "cultivo_activo" },
  "Pasto": { field: "usoSuelo", value: "pasto" },
  "Monte": { field: "usoSuelo", value: "monte" },
  "Sin uso / abandonado": { field: "usoSuelo", value: "sin_uso" },
  // Acceso (Regular solo aparece aquí según el PDF)
  "Bueno (acceso con vehículo)": { field: "acceso", value: "bueno" },
  "Regular": { field: "acceso", value: "regular" },
  "Malo": { field: "acceso", value: "malo" },
  // Agua
  "No lo sé": { field: "agua", value: "no_se" }, // Cuidado, "No lo sé" puede repetirse
};

// Listas para campos de selección múltiple (Arrays)
const ARRAY_FIELDS_MAP: Record<string, string> = {
  // Producción
  "Madera": "produccionPrincipal",
  "Leña": "produccionPrincipal",
  "Castaña": "produccionPrincipal",
  // Necesidades
  "Mejora de la productividad": "necesidades",
  "Control del matorral": "necesidades",
  "Prevención de incendios": "necesidades",
  // ... añade aquí el resto de opciones de los checkboxes múltiples
};

const ocrStatusSchema = z.object({
  status: z.enum([
    "pendiente_ocr",
    "ocr_completado",
    "pendiente_revision",
    "aprobado",
    "rechazado",
  ]),
  submissionId: z.string().optional(),
});

const ocrFieldUpdateSchema = z.object({
  manualValue: z.string().optional(),
  isCorrect: z.boolean().optional(),
  comment: z.string().optional(),
  isVerified: z.boolean().optional(),
});

const googleFormsConfigInputSchema = z.object({
  formId: z.string().min(1, "El ID del formulario es requerido"),
  formUrl: z.string().optional(),
});

const googleFormsToggleSchema = z.object({
  isActive: z.boolean(),
});

const duplicateCheckSchema = z.object({
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  localidad: z.string().optional(),
  referencias: z.string().optional(),
});
import multer from "multer";
import path from "path";
import fs from "fs";
import { analyzeForm } from "./lib/document-ai";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

declare module "express-session" {
  interface SessionData {
    user?: {
      username: string;
      isAuthenticated: boolean;
    };
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user?.isAuthenticated) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

const OCR_MAPPING: Record<string, string> = {
  // Datos personales
  "Nombre": "nombreApellidos",
  "Apellidos": "nombreApellidos",
  "Nombre y Apellidos": "nombreApellidos",
  "Nombre y apellidos": "nombreApellidos",
  "Teléfono": "telefono",
  "Email": "email",
  "Correo electrónico": "email",
  "Localidad": "localidad",
  "Municipio": "localidad",
  "Localidad / Municipio": "localidad",
  "Género": "genero",
  "Edad": "edad",
  "Relación con la finca": "relacionFinca",
  "Titularidad compartida": "titularidadCompartida",
  "Agricultor/a a título principal": "agricultorTituloPrincipal",

  // Características de la finca
  "Referencia Catastral": "referenciasCatastrales",
  "Referencias Catastrales": "referenciasCatastrales",
  "Referencia catastral": "referenciasCatastrales",
  "Superficie": "superficieCategoria",
  "Uso del suelo": "usoSuelo",
  "En producción": "enProduccion",
  "Acceso": "acceso",
  "Agua": "agua",
  "Pendiente": "pendiente",
  "Pedregosidad": "pedregosidad",

  // Interés y gobernanza
  "Grado de interés": "gradoInteres",
  "Nivel de actuación": "nivelActuacion",
  "Relevo generacional": "relevoGeneracional",
  "Colaboración": "colaboracion",
  "Minifundio": "minifundio",
  "Cesión de tierras": "cesionTierras"
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Datos inválidos" });
      }

      const { username, password } = result.data;

      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminUsername || !adminPassword) {
        return res
          .status(500)
          .json({ error: "Configuración de admin no disponible" });
      }

      if (username === adminUsername && password === adminPassword) {
        req.session.user = {
          username,
          isAuthenticated: true,
        };
        return res.json({ success: true, username });
      }

      return res.status(401).json({ error: "Credenciales incorrectas" });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session?.user?.isAuthenticated) {
      return res.json({ username: req.session.user.username });
    }
    return res.status(401).json({ error: "No autenticado" });
  });

  app.get("/api/submissions", requireAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filterResult = submissionFilterSchema.safeParse({
        status: req.query.status || undefined,
        source: req.query.source || undefined,
        genero: req.query.genero || undefined,
        edad: req.query.edad || undefined,
        relacionFinca: req.query.relacionFinca || undefined,
        agricultorTituloPrincipal:
          req.query.agricultorTituloPrincipal || undefined,
        superficieCategoria: req.query.superficieCategoria || undefined,
        usoSuelo: req.query.usoSuelo || undefined,
        enProduccion:
          req.query.enProduccion === "true"
            ? true
            : req.query.enProduccion === "false"
              ? false
              : undefined,
        acceso: req.query.acceso || undefined,
        agua: req.query.agua || undefined,
        pendiente: req.query.pendiente || undefined,
        pedregosidad: req.query.pedregosidad || undefined,
        gradoInteres: req.query.gradoInteres || undefined,
        nivelActuacion: req.query.nivelActuacion || undefined,
        localidad: (req.query.localidad as string) || undefined,
        search: (req.query.search as string) || undefined,
      });

      if (!filterResult.success) {
        return res.status(400).json({ error: "Filtros inválidos" });
      }

      const result = await storage.getSubmissions(
        filterResult.data,
        page,
        limit,
      );
      return res.json(result);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/submissions/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/submissions/recent", requireAuth, async (req, res) => {
    try {
      const submissions = await storage.getRecentSubmissions(5);
      return res.json(submissions);
    } catch (error) {
      console.error("Error fetching recent submissions:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/submissions/export", requireAuth, async (req, res) => {
    try {
      const filterResult = submissionFilterSchema.safeParse({
        status: req.query.status || undefined,
        source: req.query.source || undefined,
        search: (req.query.search as string) || undefined,
      });

      const filters = filterResult.success ? filterResult.data : {};
      const result = await storage.getSubmissions(filters, 1, 10000);

      const format = (req.query.format as string) || "csv";

      if (format === "csv") {
        const headers = [
          "ID",
          "Nombre",
          "Teléfono",
          "Email",
          "Localidad",
          "Género",
          "Edad",
          "Relación Finca",
          "Agricultor Principal",
          "Referencias Catastrales",
          "Superficie",
          "Tipo Finca",
          "Uso Suelo",
          "En Producción",
          "Acceso",
          "Agua",
          "Pendiente",
          "Pedregosidad",
          "Grado Interés",
          "Nivel Actuación",
          "Estado",
          "Fuente",
          "Fecha Creación",
        ];

        const rows = result.submissions.map((s) => [
          s.id,
          s.nombreApellidos || "",
          s.telefono || "",
          s.email || "",
          s.localidad || "",
          s.genero || "",
          s.edad || "",
          s.relacionFinca || "",
          s.agricultorTituloPrincipal || "",
          s.referenciasCatastrales || "",
          s.superficieCategoria || "",
          (s.tipoFinca || []).join("; "),
          s.usoSuelo || "",
          s.enProduccion ? "Sí" : "No",
          s.acceso || "",
          s.agua || "",
          s.pendiente || "",
          s.pedregosidad || "",
          s.gradoInteres || "",
          s.nivelActuacion || "",
          s.status || "",
          s.source || "",
          s.createdAt ? new Date(s.createdAt).toISOString() : "",
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map((row) =>
            row
              .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
              .join(","),
          ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=cuestionarios_souto_vivo_${new Date().toISOString().split("T")[0]}.csv`,
        );
        return res.send("\ufeff" + csvContent);
      } else {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=cuestionarios_souto_vivo_${new Date().toISOString().split("T")[0]}.csv`,
        );

        const headers = [
          "ID",
          "Nombre",
          "Teléfono",
          "Email",
          "Localidad",
          "Estado",
          "Fuente",
          "Fecha",
        ];

        const rows = result.submissions.map((s) => [
          s.id,
          s.nombreApellidos || "",
          s.telefono || "",
          s.email || "",
          s.localidad || "",
          s.status || "",
          s.source || "",
          s.createdAt ? new Date(s.createdAt).toISOString() : "",
        ]);

        const csvContent = [
          headers.join("\t"),
          ...rows.map((row) => row.join("\t")),
        ].join("\n");

        return res.send("\ufeff" + csvContent);
      }
    } catch (error) {
      console.error("Error exporting submissions:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/submissions/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Cuestionario no encontrado" });
      }
      return res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/submissions", requireAuth, async (req, res) => {
    try {
      const result = insertSubmissionSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Validation error:", result.error);
        return res
          .status(400)
          .json({ error: "Datos inválidos", details: result.error.errors });
      }

      const data = {
        ...result.data,
        status: (result.data.status === "enviado" || !result.data.status) ? "aprobado" : result.data.status
      };

      const submission = await storage.createSubmission(data as any);
      return res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/submissions/:id/status", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      if (!["borrador", "enviado", "aprobado", "rechazado", "pendiente"].includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const submission = await storage.updateSubmissionStatus(
        id,
        status,
      );
      if (!submission) {
        return res.status(404).json({ error: "Cuestionario no encontrado" });
      }

      return res.json(submission);
    } catch (error) {
      console.error("Error updating submission status:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/ocr/jobs", requireAuth, async (req, res) => {
    try {
      const jobs = await storage.getOcrJobs();
      return res.json(jobs);
    } catch (error) {
      console.error("Error fetching OCR jobs:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/ocr/jobs/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const job = await storage.getOcrJob(id);
      if (!job) {
        return res.status(404).json({ error: "Trabajo OCR no encontrado" });
      }
      const fields = await storage.getOcrExtractedFields(id);
      return res.json({ ...job, extractedFields: fields });
    } catch (error) {
      console.error("Error fetching OCR job:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post(
    "/api/ocr/upload",
    requireAuth,
    upload.array("files", 10),
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No se han subido archivos" });
        }

        const jobs = [];
        for (const file of files) {
          const job = await storage.createOcrJob({
            fileName: file.originalname,
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            status: "pendiente_ocr",
            createdBy: req.session?.user?.username,
          });

          jobs.push(job);

          // Procesar con Google Cloud Document AI
          (async () => {
            try {
              const fileContent = fs.readFileSync(path.join(process.cwd(), job.fileUrl));
              // 1. Obtenemos la lista ordenada
              const extractedFieldsList = await analyzeForm(fileContent, file.mimetype);

              // Inicializar datos del submission
              const submissionData: any = {
                source: "ocr",
                status: "pendiente",
                createdBy: req.session?.user?.username,
                necesidades: [],
                produccionPrincipal: [],
                formacion: [],
                gobernanzaComunidad: [],
                tipoFinca: []
              };

              // Contadores para campos repetidos (ej: Media)
              const fieldCounters: Record<string, number> = {};

              // 2. Recorremos la lista EN ORDEN
              for (const item of extractedFieldsList) {
                const cleanKey = item.key.trim();
                const cleanValue = item.value.trim();

                // Guardar log para depuración
                await storage.createOcrExtractedField({
                  ocrJobId: job.id,
                  fieldName: cleanKey,
                  proposedValue: cleanValue,
                  confidence: item.confidence,
                  isVerified: false,
                });

                // A) Campos de Texto (Nombre, Email...) - No miramos si está checkeado, cogemos el valor
                let isTextField = false;
                for (const [textKey, dbField] of Object.entries(TEXT_FIELDS_MAP)) {
                  if (cleanKey.includes(textKey)) { // Coincidencia flexible
                    submissionData[dbField] = cleanValue;
                    isTextField = true;
                    break;
                  }
                }
                if (isTextField) continue;

                // B) Checkboxes y Radio Buttons
                // Detectar si está marcado (☑, X, Si, Selected...)
                const isChecked = cleanValue.includes("☑") || cleanValue.toLowerCase() === "si" || cleanValue.toUpperCase() === "X";

                if (isChecked) {
                  // Manejo de ORDEN (Pendiente vs Pedregosidad)
                  if (ORDER_DEPENDENT_FIELDS[cleanKey]) {
                    fieldCounters[cleanKey] = (fieldCounters[cleanKey] || 0) + 1;
                    const index = fieldCounters[cleanKey] - 1;
                    const targetField = ORDER_DEPENDENT_FIELDS[cleanKey][index];
                    
                    if (targetField) {
                      submissionData[targetField] = cleanKey.toLowerCase(); // "media", "alta"...
                    }
                  } 
                  // Mapeo directo (Género, Edad...)
                  else if (ENUM_MAPPING[cleanKey]) {
                    const { field, value } = ENUM_MAPPING[cleanKey];
                    submissionData[field] = value;
                  }
                  // Arrays (Producción, Necesidades...)
                  else if (ARRAY_FIELDS_MAP[cleanKey]) {
                    const arrayField = ARRAY_FIELDS_MAP[cleanKey];
                    if (submissionData[arrayField]) {
                      submissionData[arrayField].push(cleanKey);
                    }
                  }
                }
              }

              // Crear la submission con los datos procesados
              const submission = await storage.createSubmission(submissionData);
              await storage.updateOcrJobStatus(job.id, "pendiente_revision", submission.id);

            } catch (err) {
              console.error(`Error en procesamiento OCR para ${job.id}:`, err);
              await storage.updateOcrJobStatus(job.id, "pendiente_ocr");
            }
          })();
        }

        return res
          .status(201)
          .json({
            jobs,
            message: `${jobs.length} archivo(s) subido(s) correctamente`,
          });
      } catch (error) {
        console.error("Error uploading files:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
    },
  );

  app.post(
    "/api/ocr/jobs/:id/check-duplicates",
    requireAuth,
    async (req, res) => {
      try {
        const id = req.params.id as string;
        const result = duplicateCheckSchema.safeParse(req.body);
        if (!result.success) {
          return res
            .status(400)
            .json({ error: "Datos inválidos", details: result.error.errors });
        }

        const { nombre, telefono, localidad, referencias } = result.data;
        const duplicates = await storage.checkDuplicates(
          nombre || "",
          telefono || "",
          localidad || "",
          referencias || "",
        );

        if (duplicates.length > 0) {
          const job = await storage.getOcrJob(id);
          if (job) {
            await storage.updateOcrJobWithDuplicateWarning(
              id,
              `Posibles duplicados encontrados: ${duplicates.map((d) => d.nombreApellidos).join(", ")}`,
            );
          }
        }

        return res.json({
          hasDuplicates: duplicates.length > 0,
          duplicates: duplicates.map((d) => ({
            id: d.id,
            nombre: d.nombreApellidos,
            telefono: d.telefono,
            localidad: d.localidad,
            referencias: d.referenciasCatastrales,
          })),
        });
      } catch (error) {
        console.error("Error checking duplicates:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
    },
  );

  app.patch("/api/ocr/jobs/:id/status", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const result = ocrStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Datos inválidos", details: result.error.errors });
      }

      const { status, submissionId } = result.data;
      const job = await storage.updateOcrJobStatus(
        id,
        status,
        submissionId,
      );
      if (!job) {
        return res.status(404).json({ error: "Trabajo OCR no encontrado" });
      }

      return res.json(job);
    } catch (error) {
      console.error("Error updating OCR job status:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/ocr/fields/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const result = ocrFieldUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Datos inválidos", details: result.error.errors });
      }

      const field = await storage.updateOcrExtractedField(
        id,
        result.data,
      );
      if (!field) {
        return res.status(404).json({ error: "Campo no encontrado" });
      }
      return res.json(field);
    } catch (error) {
      console.error("Error updating OCR field:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.use("/uploads", requireAuth, (req, res, next) => {
    const requestedPath = req.path.replace(/^\/+/, "");
    const sanitizedPath = path.basename(requestedPath);
    const filePath = path.join(uploadsDir, sanitizedPath);

    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    if (fs.existsSync(resolvedPath)) {
      return res.sendFile(resolvedPath);
    }
    return res.status(404).json({ error: "Archivo no encontrado" });
  });

  app.get("/api/google-forms/config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getGoogleFormsConfig();
      return res.json(config);
    } catch (error) {
      console.error("Error fetching Google Forms config:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/google-forms/config", requireAuth, async (req, res) => {
    try {
      const result = googleFormsConfigInputSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Datos inválidos", details: result.error.errors });
      }

      const { formId, formUrl } = result.data;
      const config = await storage.saveGoogleFormsConfig(formId, formUrl);
      return res.json(config);
    } catch (error) {
      console.error("Error saving Google Forms config:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/google-forms/config/toggle", requireAuth, async (req, res) => {
    try {
      const result = googleFormsToggleSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Datos inválidos", details: result.error.errors });
      }

      const { isActive } = result.data;
      const config = await storage.toggleGoogleFormsActive(isActive);
      if (!config) {
        return res.status(404).json({ error: "Configuración no encontrada" });
      }
      return res.json(config);
    } catch (error) {
      console.error("Error toggling Google Forms active:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/google-forms/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getGoogleFormsStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching Google Forms stats:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/google-forms/responses", requireAuth, async (req, res) => {
    try {
      const responses = await storage.getGoogleFormsResponses();
      return res.json(responses);
    } catch (error) {
      console.error("Error fetching Google Forms responses:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/google-forms/sync", requireAuth, async (req, res) => {
    try {
      await storage.updateGoogleFormsLastSync();
      return res.json({
        processed: 0,
        message: "Sincronización completada (simulada)",
      });
    } catch (error) {
      console.error("Error syncing Google Forms:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Añadir este endpoint específico para Google Forms
  app.post("/api/webhooks/google-forms", async (req, res) => {
    try {
      const data = req.body;

      // Mapeo exacto de los campos del formulario a tu esquema de BD
      const submissionData = {
        source: "google_forms",
        status: "aprobado",
        nombreApellidos: data.nombre,
        localidad: data.localidad,
        telefono: data.telefono,
        email: data.email,
        genero: data.genero, // mujer, hombre, otros
        edad: data.edad, // menos_35, entre_35_50, mas_50
        relacionFinca: data.relacion, // propietario, arrendatario, gestor, otra
        relacionFincaOtra: data.relacion_otra,
        agricultorTituloPrincipal: data.atp, // si, no_complementario
        asociacionPertenece: data.asociacion,

        referenciasCatastrales: data.catastro,
        superficieCategoria: data.superficie, // menos_1ha, entre_1_5ha, mas_5ha, otra, no_se
        tipoFinca: data.tipo_finca, // Array
        usoSuelo: data.uso_suelo,
        enProduccion: data.en_produccion === "si",

        acceso: data.acceso,
        agua: data.agua,
        pendiente: data.pendiente,
        pedregosidad: data.pedregosidad,

        necesidades: data.necesidades, // Array
        objetivosModelo: data.modelos, // Array
        produccionPrincipal: data.produccion, // Array

        gradoInteres: data.interes,
        nivelActuacion: data.nivel,
        disponibilidad: data.disponibilidad,
        relevoGeneracional: data.relevo,

        formacion: data.formacion,
        colaboracion: data.colaboracion,
        minifundio: data.minifundio,
        cesionTierras: data.cesion,
        gobernanzaComunidad: data.gobernanza,

        observaciones: data.observaciones,
        consentimientoTratamiento: true,
        fechaFirma: new Date(),
      };

      const submission = await storage.createSubmission(submissionData as any);
      return res.status(201).json({ success: true, id: submission.id });
    } catch (error) {
      console.error("Error en webhook:", error);
      return res.status(500).json({ error: "Error al guardar" });
    }
  });

  return httpServer;
}
