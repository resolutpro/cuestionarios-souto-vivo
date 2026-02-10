import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const genderEnum = pgEnum("gender", ["mujer", "hombre", "otros"]);
export const ageEnum = pgEnum("age", ["menos_35", "entre_35_50", "mas_50"]);
export const farmRelationEnum = pgEnum("farm_relation", [
  "propietario",
  "arrendatario",
  "gestor",
  "otra",
]);
export const sharedOwnershipEnum = pgEnum("shared_ownership", ["si", "no"]);
export const principalFarmerEnum = pgEnum("principal_farmer", [
  "si",
  "no_complementario",
]);
export const surfaceEnum = pgEnum("surface", [
  "menos_1ha",
  "entre_1_5ha",
  "mas_5ha",
  "otra",
  "no_se",
]);
export const landUseEnum = pgEnum("land_use", [
  "cultivo_activo",
  "pasto",
  "monte",
  "sin_uso",
  "otro",
]);
export const accessEnum = pgEnum("access", ["bueno", "regular", "malo"]);
export const waterEnum = pgEnum("water", ["si", "no", "no_se"]);
export const slopeEnum = pgEnum("slope", ["baja", "media", "alta"]);
export const stoninessEnum = pgEnum("stoniness", ["baja", "media", "alta"]);
export const interestLevelEnum = pgEnum("interest_level", [
  "alto",
  "medio",
  "bajo",
]);
export const actionLevelEnum = pgEnum("action_level", [
  "solo_diagnostico",
  "implantacion",
]);
export const successionEnum = pgEnum("succession", [
  "si_familiares",
  "no_riesgo_abandono",
  "buscando",
]);
export const collaborationEnum = pgEnum("collaboration", [
  "reuniones",
  "si_agrupacion",
  "si_puntuales",
  "no_individual",
  "no_se_asesoria",
]);
export const minifundioEnum = pgEnum("minifundio", [
  "si_mucho",
  "si_asumible",
  "no_adecuado",
]);
export const landTransferEnum = pgEnum("land_transfer", [
  "si_contrato",
  "si_municipio",
  "no",
]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "borrador",
  "enviado",
  "aprobado",
  "rechazado",
  "pendiente",
]);
export const sourceEnum = pgEnum("source", ["web", "ocr", "google_forms"]);
export const ocrStatusEnum = pgEnum("ocr_status", [
  "pendiente_ocr",
  "ocr_completado",
  "pendiente_revision",
  "aprobado",
  "rechazado",
]);

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  codigo: text("codigo"),
  source: sourceEnum("source").notNull().default("web"),
  status: submissionStatusEnum("status").notNull().default("enviado"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  externalId: varchar("external_id"),

  nombreApellidos: text("nombre_apellidos"),
  telefono: text("telefono"),
  email: text("email"),
  localidad: text("localidad"),
  genero: genderEnum("genero"),
  edad: ageEnum("edad"),
  relacionFinca: farmRelationEnum("relacion_finca"),
  relacionFincaOtra: text("relacion_finca_otra"),
  titularidadCompartida: sharedOwnershipEnum("titularidad_compartida"),
  agricultorTituloPrincipal: principalFarmerEnum("agricultor_titulo_principal"),
  asociacionPertenece: text("asociacion_pertenece"),

  referenciasCatastrales: text("referencias_catastrales"),
  superficieCategoria: surfaceEnum("superficie_categoria"),
  superficieOtra: text("superficie_otra"),
  tipoFinca: text("tipo_finca").array(),
  usoSuelo: landUseEnum("uso_suelo"),
  usoSueloOtro: text("uso_suelo_otro"),
  enProduccion: boolean("en_produccion"),

  acceso: accessEnum("acceso"),
  agua: waterEnum("agua"),
  pendiente: slopeEnum("pendiente"),
  pedregosidad: stoninessEnum("pedregosidad"),

  necesidades: text("necesidades").array(),
  necesidadesOtras: text("necesidades_otras"),
  objetivosModelo: text("objetivos_modelo").array(),
  produccionPrincipal: text("produccion_principal").array(),
  otrosObjetivosTexto: text("otros_objetivos_texto"),

  gradoInteres: interestLevelEnum("grado_interes"),
  nivelActuacion: actionLevelEnum("nivel_actuacion"),
  disponibilidad: text("disponibilidad").array(),
  relevoGeneracional: successionEnum("relevo_generacional"),

  formacion: text("formacion").array(),
  formacionOtro: text("formacion_otro"),

  colaboracion: collaborationEnum("colaboracion"),
  minifundio: minifundioEnum("minifundio"),
  cesionTierras: landTransferEnum("cesion_tierras"),
  gobernanzaComunidad: text("gobernanza_comunidad").array(),
  gobernanzaOtro: text("gobernanza_otro"),

  observaciones: text("observaciones"),

  consentimientoTratamiento: boolean("consentimiento_tratamiento"),
  aceptoComunicaciones: boolean("acepto_comunicaciones"),
  fechaFirma: timestamp("fecha_firma"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export const ocrJobs = pgTable("ocr_jobs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  status: ocrStatusEnum("status").notNull().default("pendiente_ocr"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by"),
  submissionId: varchar("submission_id"),
  duplicateWarning: text("duplicate_warning"),
  reviewerNotes: text("reviewer_notes"),
});

export const ocrExtractedFields = pgTable("ocr_extracted_fields", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ocrJobId: varchar("ocr_job_id").notNull(),
  fieldName: text("field_name").notNull(),
  proposedValue: text("proposed_value"),
  confidence: integer("confidence"),
  coordinates: text("coordinates"),
  pageNumber: integer("page_number"),
  isVerified: boolean("is_verified").default(false),
  isCorrect: boolean("is_correct"),
  manualValue: text("manual_value"),
  comment: text("comment"),
});

export const googleFormsConfig = pgTable("google_forms_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  formId: text("form_id").notNull(),
  formUrl: text("form_url"),
  lastSyncAt: timestamp("last_sync_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const googleFormsResponses = pgTable("google_forms_responses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  responseId: text("response_id").notNull().unique(),
  formId: text("form_id").notNull(),
  submissionId: varchar("submission_id"),
  rawData: text("raw_data"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOcrJobSchema = createInsertSchema(ocrJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOcrExtractedFieldSchema = createInsertSchema(
  ocrExtractedFields,
).omit({
  id: true,
});

export const insertGoogleFormsConfigSchema = createInsertSchema(
  googleFormsConfig,
).omit({
  id: true,
  createdAt: true,
});

export type InsertOcrJob = z.infer<typeof insertOcrJobSchema>;
export type OcrJob = typeof ocrJobs.$inferSelect;
export type InsertOcrExtractedField = z.infer<
  typeof insertOcrExtractedFieldSchema
>;
export type OcrExtractedField = typeof ocrExtractedFields.$inferSelect;
export type GoogleFormsConfig = typeof googleFormsConfig.$inferSelect;
export type GoogleFormsResponse = typeof googleFormsResponses.$inferSelect;

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const submissionFilterSchema = z.object({
  codigo: z.string().optional(),
  localidad: z.string().optional(),
  genero: z.enum(["mujer", "hombre", "otros"]).optional(),
  edad: z.enum(["menos_35", "entre_35_50", "mas_50"]).optional(),
  relacionFinca: z
    .enum(["propietario", "arrendatario", "gestor", "otra"])
    .optional(),
  agricultorTituloPrincipal: z.enum(["si", "no_complementario"]).optional(),
  superficieCategoria: z
    .enum(["menos_1ha", "entre_1_5ha", "mas_5ha", "otra", "no_se"])
    .optional(),
  tipoFinca: z.string().optional(),
  usoSuelo: z
    .enum(["cultivo_activo", "pasto", "monte", "sin_uso", "otro"])
    .optional(),
  enProduccion: z.boolean().optional(),
  acceso: z.enum(["bueno", "regular", "malo"]).optional(),
  agua: z.enum(["si", "no", "no_se"]).optional(),
  pendiente: z.enum(["baja", "media", "alta"]).optional(),
  pedregosidad: z.enum(["baja", "media", "alta"]).optional(),
  gradoInteres: z.enum(["alto", "medio", "bajo"]).optional(),
  nivelActuacion: z.enum(["solo_diagnostico", "implantacion"]).optional(),
  status: z
    .enum(["borrador", "enviado", "aprobado", "rechazado", "pendiente"])
    .optional(),
  source: z.enum(["web", "ocr", "google_forms"]).optional(),
  search: z.string().optional(),
});

export type SubmissionFilter = z.infer<typeof submissionFilterSchema>;

export const files = pgTable("files", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(), // El nombre único (ej: 1234-foto.jpg)
  data: text("data").notNull(), // El contenido en Base64
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileModel = typeof files.$inferSelect;
