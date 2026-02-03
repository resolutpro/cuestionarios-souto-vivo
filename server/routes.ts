import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, submissionFilterSchema, loginSchema } from "@shared/schema";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
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
        return res.status(500).json({ error: "Configuración de admin no disponible" });
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
        agricultorTituloPrincipal: req.query.agricultorTituloPrincipal || undefined,
        superficieCategoria: req.query.superficieCategoria || undefined,
        usoSuelo: req.query.usoSuelo || undefined,
        enProduccion: req.query.enProduccion === "true" ? true : req.query.enProduccion === "false" ? false : undefined,
        acceso: req.query.acceso || undefined,
        agua: req.query.agua || undefined,
        pendiente: req.query.pendiente || undefined,
        pedregosidad: req.query.pedregosidad || undefined,
        gradoInteres: req.query.gradoInteres || undefined,
        nivelActuacion: req.query.nivelActuacion || undefined,
        localidad: req.query.localidad as string || undefined,
        search: req.query.search as string || undefined,
      });

      if (!filterResult.success) {
        return res.status(400).json({ error: "Filtros inválidos" });
      }

      const result = await storage.getSubmissions(filterResult.data, page, limit);
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
        search: req.query.search as string || undefined,
      });

      const filters = filterResult.success ? filterResult.data : {};
      const result = await storage.getSubmissions(filters, 1, 10000);
      
      const format = req.query.format as string || "csv";
      
      if (format === "csv") {
        const headers = [
          "ID", "Nombre", "Teléfono", "Email", "Localidad", "Género", "Edad",
          "Relación Finca", "Agricultor Principal", "Referencias Catastrales",
          "Superficie", "Tipo Finca", "Uso Suelo", "En Producción",
          "Acceso", "Agua", "Pendiente", "Pedregosidad",
          "Grado Interés", "Nivel Actuación", "Estado", "Fuente", "Fecha Creación"
        ];

        const rows = result.submissions.map(s => [
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
          s.createdAt ? new Date(s.createdAt).toISOString() : ""
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=cuestionarios_souto_vivo_${new Date().toISOString().split("T")[0]}.csv`);
        return res.send("\ufeff" + csvContent);
      } else {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=cuestionarios_souto_vivo_${new Date().toISOString().split("T")[0]}.csv`);
        
        const headers = [
          "ID", "Nombre", "Teléfono", "Email", "Localidad", "Estado", "Fuente", "Fecha"
        ];

        const rows = result.submissions.map(s => [
          s.id,
          s.nombreApellidos || "",
          s.telefono || "",
          s.email || "",
          s.localidad || "",
          s.status || "",
          s.source || "",
          s.createdAt ? new Date(s.createdAt).toISOString() : ""
        ]);

        const csvContent = [
          headers.join("\t"),
          ...rows.map(row => row.join("\t"))
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
      const submission = await storage.getSubmission(req.params.id);
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
        return res.status(400).json({ error: "Datos inválidos", details: result.error.errors });
      }

      const submission = await storage.createSubmission(result.data);
      return res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/submissions/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["borrador", "enviado", "aprobado", "rechazado"].includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const submission = await storage.updateSubmissionStatus(req.params.id, status);
      if (!submission) {
        return res.status(404).json({ error: "Cuestionario no encontrado" });
      }

      return res.json(submission);
    } catch (error) {
      console.error("Error updating submission status:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  return httpServer;
}
