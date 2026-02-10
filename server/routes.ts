import { db } from "./db";
import { submissions, eq } from "@shared/schema";
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

// 1. CAMPOS DE TEXTO SIMPLE (Mapas por página para mayor precisión)
const PAGE_TEXT_FIELDS: Record<number, Record<string, string>> = {
  1: {
    "nombre y apellidos": "nombreApellidos",
    "telefono de contacto": "telefono",
    "correo electronico": "email",
    localidad: "localidad",
    "pertenece usted a alguna asociacion": "asociacionPertenece",
  },
  2: {
    "referencia catastral o poligono y parcela": "referenciasCatastrales",
    "otro especificar uso suelo": "usoSueloOtro",
  },
  3: {
    "otras especificar necesidades": "necesidadesOtras",
    "otros objetivos especificar": "otrosObjetivosTexto",
  },
  4: {
    "otros especificar formacion": "formacionOtro",
  },
  5: {
    otros: "gobernanzaOtro",
    "comentarios dudas o propuestas adicionales": "observaciones",
  },
};

// 2. CAMPOS POSICIONALES (Contadores por página)
// Esta lógica se basa estrictamente en el orden de aparición por página
const POSITIONAL_MAPPING: Record<
  number,
  Record<string, { field: string; value: any }[]>
> = {
  1: {
    si: [
      { field: "titularidadCompartida", value: "si" }, // 1º Sí
      { field: "agricultorTituloPrincipal", value: "si" }, // 2º Sí
    ],
    no: [
      { field: "titularidadCompartida", value: "no" }, // 1º No
      { field: "agricultorTituloPrincipal", value: "no_complementario" }, // 2º No
    ],
  },
  2: {
    si: [
      { field: "enProduccion", value: true }, // 1º Sí
      { field: "agua", value: "si" }, // 2º Sí
    ],
    no: [
      { field: "enProduccion", value: false }, // 1º No
      { field: "agua", value: "no" }, // 2º No
    ],
    baja: [
      { field: "pendiente", value: "baja" }, // 1º Baja
      { field: "pedregosidad", value: "baja" }, // 2º Baja
    ],
    media: [
      { field: "pendiente", value: "media" }, // 1º Media
      { field: "pedregosidad", value: "media" }, // 2º Media
    ],
    alta: [
      { field: "pendiente", value: "alta" }, // 1º Alta
      { field: "pedregosidad", value: "alta" }, // 2º Alta
    ],
  },
  5: {
    si: [
      { field: "minifundio", value: "si_mucho" }, // 1º Sí ("Sí, mucho") - El prompt dice 3º Sí global pero es 1º de pág 5
      { field: "cesionTierras", value: "si_contrato" }, // 2º Sí ("Sí, bajo un contrato...")
      { field: "cesionTierras", value: "si_municipio" }, // 3º Sí ("Sí, pero solo a alguien...")
    ],
    no: [
      { field: "minifundio", value: "no_adecuado" }, // 1º No ("No, el tamaño es adecuado")
      { field: "cesionTierras", value: "no" }, // 2º No ("No, no tengo interés...")
    ],
  },
};

// 3. MAPEO DE ENUMS (Checkboxes de opción única o radio buttons con texto distintivo)
const ENUM_MAPPING: Record<
  number,
  Record<string, { field: string; value: string }>
> = {
  1: {
    mujer: { field: "genero", value: "mujer" },
    hombre: { field: "genero", value: "hombre" },
    "otros/es": { field: "genero", value: "otros" },
    "menos de 35 años": { field: "edad", value: "menos_35" },
    "entre 35 y 50 años": { field: "edad", value: "entre_35_50" },
    "más de 50 años": { field: "edad", value: "mas_50" },
    "propietario/a": { field: "relacionFinca", value: "propietario" },
    "arrendatario/a": { field: "relacionFinca", value: "arrendatario" },
    "gestor/a": { field: "relacionFinca", value: "gestor" },
    "otra (especificar)": { field: "relacionFinca", value: "otra" },
  },
  2: {
    "menos de 1 ha": { field: "superficieCategoria", value: "menos_1ha" },
    "entre 1 y 5 ha": { field: "superficieCategoria", value: "entre_1_5ha" },
    "más de 5 ha": { field: "superficieCategoria", value: "mas_5ha" },
    "otra (especificar)": { field: "superficieCategoria", value: "otra" },
    "no lo sé / pendiente de consultar": {
      field: "superficieCategoria",
      value: "no_se",
    },
    "cultivo activo": { field: "usoSuelo", value: "cultivo_activo" },
    pasto: { field: "usoSuelo", value: "pasto" },
    monte: { field: "usoSuelo", value: "monte" },
    "sin uso / abandonado": { field: "usoSuelo", value: "sin_uso" },
    "bueno (acceso con vehículo)": { field: "acceso", value: "bueno" },
    regular: { field: "acceso", value: "regular" },
    malo: { field: "acceso", value: "malo" },
    "no lo sé": { field: "agua", value: "no_se" },
  },
  3: {
    alto: { field: "gradoInteres", value: "alto" },
    medio: { field: "gradoInteres", value: "medio" },
    bajo: { field: "gradoInteres", value: "bajo" },
  },
  4: {
    "solo diagnóstico y propuesta técnica": {
      field: "nivelActuacion",
      value: "solo_diagnostico",
    },
    "implantación de actuaciones piloto": {
      field: "nivelActuacion",
      value: "implantacion",
    },
    "sí hay familiares o personas interesadas": {
      field: "relevoGeneracional",
      value: "si_familiares",
    },
    "no existe riesgo de abandono tras mi jubilación": {
      field: "relevoGeneracional",
      value: "no_riesgo_abandono",
    },
    "estoy buscando a alguien que quiera trabajarla": {
      field: "relevoGeneracional",
      value: "buscando",
    },
  },
  5: {
    "sí me interesa integrarme en una agrupación": {
      field: "colaboracion",
      value: "si_agrupacion",
    },
    "sí pero solo para acciones puntuales": {
      field: "colaboracion",
      value: "si_puntuales",
    },
    "no prefiero mantener la gestión de mi finca": {
      field: "colaboracion",
      value: "no_individual",
    },
    "no lo sé necesitaría asesoramiento jurídico": {
      field: "colaboracion",
      value: "no_se_asesoria",
    },
    "sí aunque dificulta las tareas es asumible": {
      field: "minifundio",
      value: "si_asumible",
    },
    "sí mucho": { field: "minifundio", value: "si_mucho" },
    "no el tamaño es adecuado": { field: "minifundio", value: "no_adecuado" },
    "sí bajo un contrato de arrendamiento o cesión": {
      field: "cesionTierras",
      value: "si_contrato",
    },
    "sí pero solo a alguien del municipio": {
      field: "cesionTierras",
      value: "si_municipio",
    },
    "no no tengo interés en ceder la gestión": {
      field: "cesionTierras",
      value: "no",
    },
  },
};

// 4. MAPEO DE ARRAYS (Checkboxes Múltiples)
const ARRAY_MAPPING: Record<
  number,
  Record<string, { field: string; value: string }>
> = {
  2: {
    agrícola: { field: "tipoFinca", value: "agricola" },
    forestal: { field: "tipoFinca", value: "forestal" },
    mixta: { field: "tipoFinca", value: "mixta" },
  },
  3: {
    "mejora de la productividad": {
      field: "necesidades",
      value: "productividad",
    },
    "control del matorral": { field: "necesidades", value: "matorral" },
    "prevención de incendios": { field: "necesidades", value: "incendios" },
    "mejora del suelo": { field: "necesidades", value: "suelo" },
    "diversificación de usos": {
      field: "necesidades",
      value: "diversificacion",
    },
    "puesta en valor de finca abandonada": {
      field: "necesidades",
      value: "abandonada",
    },
    otras: { field: "necesidades", value: "otras" },
    otros: { field: "objetivosModelo", value: "otros" },
    madera: { field: "produccionPrincipal", value: "madera" },
    leña: { field: "produccionPrincipal", value: "lena" },
    castaña: { field: "produccionPrincipal", value: "castana" },
    vid: { field: "produccionPrincipal", value: "vid" },
    "frutícola (cereza, pera, manzana)": {
      field: "produccionPrincipal",
      value: "fruticola",
    },
    "hortícola (pimiento, cebolla)": {
      field: "produccionPrincipal",
      value: "horticola",
    },
    "pasto / ganadera": {
      field: "produccionPrincipal",
      value: "pasto_ganadera",
    },
    "productos apicolas (miel, polen, propoleo)": {
      field: "produccionPrincipal",
      value: "apicolas",
    },
    "conservación del paisaje y la biodiversidad": {
      field: "objetivosModelo",
      value: "biodiversidad",
    },
    "reducción de costes de mantenimiento": {
      field: "objetivosModelo",
      value: "reduccion_costes",
    },
    "nuevos modelos agroforestales de impacto social": {
      field: "objetivosModelo",
      value: "impacto_social",
    },
  },
  4: {
    reuniones: { field: "disponibilidad", value: "reuniones" },
    visitas: { field: "disponibilidad", value: "visitas" },
    seguimiento: { field: "disponibilidad", value: "seguimiento" },
    "cultivo del castaño": { field: "formacion", value: "castano" },
    "sistemas agroforestales": { field: "formacion", value: "agroforestal" },
    "agricultura regenerativa": {
      field: "formacion",
      value: "agri_regenerativa",
    },
    "ganadería regenerativa": {
      field: "formacion",
      value: "gana_regenerativa",
    },
    "plantaciones de fijación de carbono": {
      field: "formacion",
      value: "carbono",
    },
    "comercialización de productos": {
      field: "formacion",
      value: "comercializacion",
    },
    "tramitación de ayudas": { field: "formacion", value: "ayudas" },
    "legislación y fiscalidad": { field: "formacion", value: "legislacion" },
  },
  5: {
    "creando una cooperativa o agrupación de productores local": {
      field: "gobernanzaComunidad",
      value: "cooperativa",
    },
    "recuperando caminos y accesos que beneficien a toda la vecindad": {
      field: "gobernanzaComunidad",
      value: "caminos",
    },
    "organizando hacenderas o jornadas de trabajo comunitario": {
      field: "gobernanzaComunidad",
      value: "hacenderas",
    },
    "facilitando el contacto entre propietarios que no viven": {
      field: "gobernanzaComunidad",
      value: "contacto",
    },
    "facilitando el contacto entre propietarios que no viven en el pueblo y jovenes":
      { field: "gobernanzaComunidad", value: "contacto" },
  },
};

const normalizeKey = (text: string) => {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/tildes
    .replace(/[^a-z0-9\s/]/g, "") // Remove special chars except slash
    .replace(/\s+/g, " "); // Normalize spaces
};

export function mapOcrToSubmission(
  extractedFields: any[],
): Record<string, any> {
  const submission: Record<string, any> = {
    tipoFinca: [],
    produccionPrincipal: [],
    necesidades: [],
    formacion: [],
    gobernanzaComunidad: [],
    objetivosModelo: [],
    disponibilidad: [],
  };

  // Contadores por página para campos posicionales
  const pageCounters: Record<number, Record<string, number>> = {};

  for (const field of extractedFields) {
    const rawName = field.key || field.fieldName || field.field_name || "";
    const rawValue = (
      field.proposedValue ||
      field.value ||
      field.manualValue ||
      ""
    ).toString();
    const normalizedName = normalizeKey(rawName);
    const pageNumber = field.pageNumber || 1;

    if (!normalizedName) continue;

    const isChecked =
      rawValue.includes("☑") ||
      rawValue.toLowerCase() === "true" ||
      rawValue === "1" ||
      rawValue.toLowerCase() === "selected" ||
      rawValue === "checked";

    // 1. Campos Posicionales (Si/No/Baja/Media/Alta)
    const pagePosMapping = POSITIONAL_MAPPING[pageNumber];
    if (pagePosMapping && pagePosMapping[normalizedName]) {
      if (!pageCounters[pageNumber]) pageCounters[pageNumber] = {};
      if (pageCounters[pageNumber][normalizedName] === undefined)
        pageCounters[pageNumber][normalizedName] = 0;

      const index = pageCounters[pageNumber][normalizedName];
      const mappingList = pagePosMapping[normalizedName];

      if (index < mappingList.length) {
        const mapping = mappingList[index];
        if (isChecked) {
          submission[mapping.field] = mapping.value;
        }
        pageCounters[pageNumber][normalizedName]++;
      }
      continue;
    }

    // 2. Text Fields (Page Specific)
    const pageTextFields = PAGE_TEXT_FIELDS[pageNumber];
    if (pageTextFields) {
      const textMatchKey = Object.keys(pageTextFields).find(
        (k) =>
          normalizedName === normalizeKey(k) ||
          normalizedName.includes(normalizeKey(k)),
      );
      if (textMatchKey) {
        const dbField = pageTextFields[textMatchKey];
        // Don't overwrite if it's already set by a better value
        if (
          !submission[dbField] ||
          rawValue.length > (submission[dbField]?.length || 0)
        ) {
          submission[dbField] = rawValue;
        }
        continue;
      }
    }

    // 3. Enum Mapping (Page Specific)
    const pageEnumMapping = ENUM_MAPPING[pageNumber];
    if (pageEnumMapping && isChecked) {
      const enumMatchKey = Object.keys(pageEnumMapping).find(
        (k) =>
          normalizedName === normalizeKey(k) ||
          normalizedName.includes(normalizeKey(k)),
      );
      if (enumMatchKey) {
        const mapping = pageEnumMapping[enumMatchKey];
        submission[mapping.field] = mapping.value;
        continue;
      }
    }

    // 4. Array Mapping (Page Specific)
    const pageArrayMapping = ARRAY_MAPPING[pageNumber];
    if (pageArrayMapping && isChecked) {
      const arrayMatchKey = Object.keys(pageArrayMapping).find(
        (k) =>
          normalizedName === normalizeKey(k) ||
          normalizedName.includes(normalizeKey(k)),
      );
      if (arrayMatchKey) {
        const mapping = pageArrayMapping[arrayMatchKey];
        if (!submission[mapping.field].includes(mapping.value)) {
          submission[mapping.field].push(mapping.value);
        }

        // Special case: Page 3 "Otros objetivos"
        if (
          pageNumber === 3 &&
          mapping.field === "objetivosModelo" &&
          mapping.value === "otros"
        ) {
          // If the "otros" checkbox is checked, we make sure it's in the array
        }
        continue;
      }
    }

    // Special Case: If page 3 "Otros objetivos (especificar)" has text, mark "otros" in objetivosModelo
    if (
      pageNumber === 3 &&
      (normalizedName === "otros objetivos especificar" ||
        normalizedName.includes("otros objetivos")) &&
      rawValue.trim().length > 0
    ) {
      if (!submission.objetivosModelo.includes("otros")) {
        submission.objetivosModelo.push("otros");
      }
      submission.otrosObjetivosTexto = rawValue;
      continue;
    }

    // Fallback simple para consentimientos (Pág 6)
    if (pageNumber === 6 && isChecked) {
      if (
        normalizedName.includes(
          "consiento el tratamiento de mis datos personales",
        ) ||
        normalizedName.includes("consiento el tratamiento de mis datos") ||
        normalizedName.includes("consiento")
      ) {
        submission.consentimientoTratamiento = true;
      }
      if (
        normalizedName.includes("acepto recibir comunicaciones relacionadas") ||
        normalizedName.includes("acepto recibir comunicaciones") ||
        normalizedName.includes("acepto")
      ) {
        submission.aceptoComunicaciones = true;
      }
    }
  }

  return submission;
}

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
  storage: multer.memoryStorage(), // <--- CAMBIO CLAVE
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
  Nombre: "nombreApellidos",
  Apellidos: "nombreApellidos",
  "Nombre y Apellidos": "nombreApellidos",
  "Nombre y apellidos": "nombreApellidos",
  Teléfono: "telefono",
  Email: "email",
  "Correo electrónico": "email",
  Localidad: "localidad",
  Municipio: "localidad",
  "Localidad / Municipio": "localidad",
  Género: "genero",
  Edad: "edad",
  "Relación con la finca": "relacionFinca",
  "Titularidad compartida": "titularidadCompartida",
  "Agricultor/a a título principal": "agricultorTituloPrincipal",

  // Características de la finca
  "Referencia Catastral": "referenciasCatastrales",
  "Referencias Catastrales": "referenciasCatastrales",
  "Referencia catastral": "referenciasCatastrales",
  Superficie: "superficieCategoria",
  "Uso del suelo": "usoSuelo",
  "En producción": "enProduccion",
  Acceso: "acceso",
  Agua: "agua",
  Pendiente: "pendiente",
  Pedregosidad: "pedregosidad",

  // Interés y gobernanza
  "Grado de interés": "gradoInteres",
  "Nivel de actuación": "nivelActuacion",
  "Relevo generacional": "relevoGeneracional",
  Colaboración: "colaboracion",
  Minifundio: "minifundio",
  "Cesión de tierras": "cesionTierras",
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
        status:
          result.data.status === "enviado" || !result.data.status
            ? "aprobado"
            : result.data.status,
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
      if (
        !["borrador", "enviado", "aprobado", "rechazado", "pendiente"].includes(
          status,
        )
      ) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const submission = await storage.updateSubmissionStatus(id, status);
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
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const filename = uniqueSuffix + path.extname(file.originalname);

          // LÓGICA DE EXTRACCIÓN DE CÓDIGO (NUEVO)
          // Formato esperado: SV_JPXX_XXX (ej: SV_JP01_001)
          const codeMatch = file.originalname.match(/(SV_JP\d{2}_\d{3})/i);
          const extractedCode = codeMatch ? codeMatch[1].toUpperCase() : null;

          await storage.createFile({
            fileName: filename,
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype,
          });

          const job = await storage.createOcrJob({
            fileName: file.originalname,
            fileUrl: `/uploads/${filename}`,
            fileType: file.mimetype,
            status: "pendiente_ocr",
            createdBy: req.session?.user?.username,
          });

          jobs.push(job);

          (async () => {
            try {
              const extractedFieldsList = await analyzeForm(
                file.buffer,
                file.mimetype,
              );
              const submissionData = mapOcrToSubmission(extractedFieldsList);
              submissionData.source = "ocr";
              submissionData.status = "pendiente";
              submissionData.createdBy = req.session?.user?.username;

              // Asignar el código extraído
              submissionData.codigo = extractedCode;

              // Guardar campos extraídos...
              for (const item of extractedFieldsList) {
                await storage.createOcrExtractedField({
                  ocrJobId: job.id,
                  fieldName: item.key.replace(/[:.]/g, "").trim(),
                  proposedValue: item.value.trim(),
                  confidence: item.confidence,
                  pageNumber: item.pageNumber,
                  coordinates: JSON.stringify(item.normalizedVertices),
                  isVerified: false,
                });
              }

              const submission = await storage.createSubmission(submissionData);
              await storage.updateOcrJobStatus(
                job.id,
                "pendiente_revision",
                submission.id,
              );
            } catch (err) {
              console.error(`Error OCR ${job.id}:`, err);
              await storage.updateOcrJobStatus(job.id, "pendiente_ocr");
            }
          })();
        }

        return res.status(201).json({
          jobs,
          message: `${jobs.length} archivo(s) subido(s) correctamente`,
        });
      } catch (error) {
        console.error("Error uploading:", error);
        return res.status(500).json({ error: "Error interno" });
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

  // En server/routes.ts

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

      // 1. Actualizamos el estado como siempre
      const job = await storage.updateOcrJobStatus(id, status, submissionId);

      if (!job) {
        return res.status(404).json({ error: "Trabajo OCR no encontrado" });
      }

      // 2. NUEVA LÓGICA: Si el estado es 'aprobado', borramos los campos temporales
      if (status === "aprobado") {
        console.log(
          `[Limpieza] Borrando campos OCR temporales para el trabajo ${id}`,
        );
        await storage.deleteOcrExtractedFields(id);
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

      const field = await storage.updateOcrExtractedField(id, result.data);
      if (!field) {
        return res.status(404).json({ error: "Campo no encontrado" });
      }
      return res.json(field);
    } catch (error) {
      console.error("Error updating OCR field:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.use("/uploads", requireAuth, async (req, res, next) => {
    // Obtenemos el nombre del archivo de la URL
    const requestedPath = req.path.replace(/^\/+/, "");
    const filename = path.basename(decodeURIComponent(requestedPath));

    // 1. INTENTO PRIMARIO: Buscar en Base de Datos (Nuevos archivos)
    try {
      const dbFile = await storage.getFileByName(filename);
      if (dbFile) {
        const fileBuffer = Buffer.from(dbFile.data, "base64");
        res.setHeader("Content-Type", dbFile.mimeType);
        res.setHeader("Content-Length", fileBuffer.length);
        return res.send(fileBuffer);
      }
    } catch (e) {
      console.error("Error buscando archivo en BD:", e);
    }

    // 2. FALLBACK: Intentar buscar en disco (Archivos antiguos o de desarrollo)
    // Esto mantiene la compatibilidad mientras migras
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    // 3. Si no está en ninguno de los dos
    console.log(`[Uploads] 404 - Archivo no encontrado: ${filename}`);
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

  app.get("/api/google-forms/stats", async (_req, res) => {
    try {
      // Obtenemos las estadísticas generales que ya incluyen el conteo por source
      const stats = await storage.getStats();

      // El número de documentos de Google Forms es el conteo donde source = 'google_forms'
      const googleFormsCount = stats.bySource["google_forms"] || 0;

      // Aquí puedes mantener otros campos si los necesitas para la UI
      res.json({
        totalResponses: googleFormsCount, // Este es el número que quieres mostrar
        processedResponses: googleFormsCount, // Si consideras que todos los de la tabla ya están procesados
        pendingResponses: 0,
        lastSyncAt: null, // Puedes obtener esto de la configuración si lo deseas
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estadísticas" });
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
      // 1. CONFIGURACIÓN
      // Pega aquí la URL de tu "Aplicación web" de Apps Script
      // Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
      const GOOGLE_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbwiuSEzGuGQF9xIAw2_dmESinLkK9G2mME7URs_LO2SGwL9-jW2Gm0uqbhytINGZTOv/exec";

      if (GOOGLE_SCRIPT_URL.includes("PEGAR_AQUI")) {
        return res.status(500).json({
          error: "Falta configurar la URL del script en server/routes.ts",
        });
      }

      // 2. LLAMADA AL SCRIPT
      // Enviamos la orden { action: "sync_all" } para que el script empiece a enviar datos
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all" }),
      });

      if (!response.ok) {
        throw new Error(`Error en Google Script: ${response.statusText}`);
      }

      const scriptResult = await response.json();

      // 3. ACTUALIZAR ESTADO
      await storage.updateGoogleFormsLastSync();

      // 4. RESPONDER AL CLIENTE
      // Nota: Las respuestas llegan asíncronamente al webhook, aquí solo confirmamos el inicio.
      return res.json({
        processed: scriptResult.processed || 0, // Si el script devuelve cuántas envió
        message:
          scriptResult.message || "Sincronización iniciada correctamente",
      });
    } catch (error) {
      console.error("Error syncing Google Forms:", error);
      return res
        .status(500)
        .json({ error: "Error al conectar con Google Forms" });
    }
  });
  // BUSCA ESTO EN server/routes.ts Y SUSTITÚYELO COMPLETO

  app.post("/api/webhooks/google-forms", async (req, res) => {
    try {
      const data = req.body;

      // ==================================================================
      // 🕵️ ZONA DE DEPURACIÓN EXTENSA (LOGS)
      // ==================================================================
      console.log("\n⬇️⬇️⬇️ RECIBIENDO NUEVO WEBHOOK DE GOOGLE FORMS ⬇️⬇️⬇️");
      console.log(`🆔 ID Externo recibido: ${data.id}`);

      console.log(`[Relacion] Valor: "${data.relacion_finca}"`);

      console.log("⬆️⬆️⬆️ FIN DE DATOS RAW ⬆️⬆️⬆️\n");
      // ==================================================================

      // 1. ID EXTERNO
      const externalId =
        data.id ||
        `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 2. EVITAR DUPLICADOS
      const existing = await storage.getSubmissionByExternalId(externalId);
      if (existing) {
        console.log(`⚠️ Duplicado detectado (${externalId}). Ignorando.`);
        return res.status(200).json({
          success: true,
          message: "Duplicado ignorado",
          id: existing.id,
        });
      }

      // 3. MAPEO ROBUSTO (Corrige errores de tipos)
      const submissionData = {
        source: "google_forms",
        status: "aprobado",
        externalId: externalId,

        // Campos simples
        nombreApellidos: data.nombre,
        localidad: data.localidad,
        telefono: data.telefono,
        email: data.email,
        genero: data.genero,
        edad: data.edad,

        // Relación
        relacionFinca: data.relacion,
        relacionFincaOtra: data.relacion_otra,

        // ATP
        agricultorTituloPrincipal: data.atp,
        asociacionPertenece: data.asociacion,
        referenciasCatastrales: data.catastro,

        // --- SUPERFICIE ---
        // Si llega null o undefined, no lo asignamos o ponemos null
        superficieCategoria: data.superficie || null,
        superficieOtra: data.superficie_otra || null,

        // Array
        tipoFinca: data.tipo_finca,

        // --- USO SUELO ---
        usoSuelo: data.uso_suelo || null,
        usoSueloOtro: data.uso_suelo_otro || null,

        // --- EN PRODUCCIÓN ---
        // Aceptamos "si", "sí", "true" o booleano true
        enProduccion:
          String(data.en_produccion).toLowerCase() === "si" ||
          String(data.en_produccion) === "true",

        // Acceso
        acceso: data.acceso,

        // --- AGUA ---
        // Aseguramos que coincida con el ENUM: 'si', 'no', 'no_se'
        agua: data.agua,

        pendiente: data.pendiente,
        pedregosidad: data.pedregosidad,

        necesidades: data.necesidades,
        objetivosModelo: data.modelos,
        produccionPrincipal: data.produccion,

        gradoInteres: data.interes,
        nivelActuacion: data.nivel,
        disponibilidad: data.disponibilidad,

        // --- RELEVO, COLABORACIÓN, ETC ---
        // Si llega string vacío "", pasamos null para evitar error de Enum
        relevoGeneracional: data.relevo || null,
        colaboracion: data.colaboracion || null,
        minifundio: data.minifundio || null,
        cesionTierras: data.cesion || null,

        formacion: data.formacion,
        gobernanzaComunidad: data.gobernanza,
        observaciones: data.observaciones,

        // --- LEGALES ---
        // Convertimos a booleano real cualquier cosa que parezca true
        consentimientoTratamiento:
          String(data.consentimientoTratamiento) === "true" ||
          data.consentimientoTratamiento === true,
        aceptoComunicaciones:
          String(data.aceptoComunicaciones) === "true" ||
          data.aceptoComunicaciones === true,

        fechaFirma: new Date(),
      };

      // 4. GUARDAR EN DB
      const submission = await storage.createSubmission(submissionData as any);
      console.log(`✅ Cuestionario guardado exitosamente: ID ${submission.id}`);

      return res.status(201).json({ success: true, id: submission.id });
    } catch (error) {
      console.error("❌ ERROR CRÍTICO EN WEBHOOK:", error);
      return res.status(500).json({ error: "Error al procesar el webhook" });
    }
  });

  app.delete("/api/submissions/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const submission = await storage.getSubmission(id);

      if (!submission) {
        return res.status(404).json({ error: "Cuestionario no encontrado" });
      }

      if (submission.source !== "ocr") {
        return res.status(403).json({
          error: "Solo se pueden eliminar cuestionarios de origen OCR",
        });
      }

      await storage.deleteSubmission(id);
      return res.json({ success: true, message: "Cuestionario eliminado" });
    } catch (error) {
      console.error("Error deleting submission:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/submissions/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const result = insertSubmissionSchema.partial().safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ error: "Datos inválidos", details: result.error.errors });
      }

      // --- VALIDACIÓN DE CÓDIGO ÚNICO ---
      if (result.data.codigo) {
        const codigoNormalizado = result.data.codigo.toUpperCase();

        // 1. Comprobar si existe exactamente ese código
        const existing = await storage.getSubmissionByCode(codigoNormalizado);

        if (existing && existing.id !== id) {
          // El código está cogido. Vamos a buscar cuál es el último de esa serie para ayudar.
          let sugerencia = "";

          // Asumimos formato SV_JPXX_XXX. Extraemos lo que hay antes del último guion bajo.
          const lastUnderscore = codigoNormalizado.lastIndexOf("_");

          if (lastUnderscore > 0) {
            const prefix = codigoNormalizado.substring(0, lastUnderscore); // Ej: SV_JP01
            const lastUsed = await storage.getLastCodeByPrefix(prefix);
            if (lastUsed) {
              sugerencia = ` El último código registrado en esta serie es ${lastUsed}.`;
            }
          }

          return res.status(409).json({
            error: `El código ${codigoNormalizado} ya está en uso por ${existing.nombreApellidos || "otro usuario"}.${sugerencia}`,
          });
        }

        result.data.codigo = codigoNormalizado;
      }
      // ----------------------------------

      const submission = await storage.updateSubmission(id, result.data);
      if (!submission) {
        return res.status(404).json({ error: "Cuestionario no encontrado" });
      }

      return res.json(submission);
    } catch (error) {
      console.error("Error updating submission:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  return httpServer;
}
