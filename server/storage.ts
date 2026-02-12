import { eq, desc, sql, and, or, ilike, like } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  submissions,
  ocrJobs,
  ocrExtractedFields,
  googleFormsConfig,
  googleFormsResponses,
  files,
  type InsertFile,
  type FileModel,
  type User,
  type InsertUser,
  type Submission,
  type InsertSubmission,
  type SubmissionFilter,
  type OcrJob,
  type InsertOcrJob,
  type OcrExtractedField,
  type InsertOcrExtractedField,
  type GoogleFormsConfig,
  type GoogleFormsResponse,
} from "@shared/schema";

export interface IStorage {
  getLastCodeByPrefix(prefix: string): Promise<string | undefined>;
  getSubmissionByCode(code: string): Promise<Submission | undefined>;
  getSubmissionByExternalId(
    externalId: string,
  ): Promise<Submission | undefined>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | undefined>;
  updateSubmissionStatus(
    id: string,
    status: string,
    updatedBy?: string,
  ): Promise<Submission | undefined>;
  getSubmissions(
    filters: SubmissionFilter,
    page: number,
    limit: number,
  ): Promise<{ submissions: Submission[]; total: number; pages: number }>;
  getRecentSubmissions(limit: number): Promise<Submission[]>;
  getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    recentLocalities: string[];
  }>;

  deleteSubmission(id: string): Promise<void>;

  createOcrJob(job: InsertOcrJob): Promise<OcrJob>;
  getOcrJobs(): Promise<OcrJob[]>;
  getOcrJob(id: string): Promise<OcrJob | undefined>;
  updateOcrJobStatus(
    id: string,
    status: string,
    submissionId?: string,
  ): Promise<OcrJob | undefined>;
  updateOcrJobWithDuplicateWarning(
    id: string,
    warning: string,
  ): Promise<OcrJob | undefined>;
  createOcrExtractedField(
    field: InsertOcrExtractedField,
  ): Promise<OcrExtractedField>;
  getOcrExtractedFields(ocrJobId: string): Promise<OcrExtractedField[]>;
  updateOcrExtractedField(
    id: string,
    data: Partial<OcrExtractedField>,
  ): Promise<OcrExtractedField | undefined>;
  checkDuplicates(
    nombre: string,
    telefono: string,
    localidad: string,
    referencias: string,
  ): Promise<Submission[]>;
  deleteOcrExtractedFields(ocrJobId: string): Promise<void>;

  getGoogleFormsConfig(): Promise<GoogleFormsConfig | null>;
  saveGoogleFormsConfig(
    formId: string,
    formUrl?: string,
  ): Promise<GoogleFormsConfig>;
  toggleGoogleFormsActive(
    isActive: boolean,
  ): Promise<GoogleFormsConfig | undefined>;
  updateGoogleFormsLastSync(): Promise<void>;
  getGoogleFormsResponses(): Promise<GoogleFormsResponse[]>;
  saveGoogleFormsResponse(
    responseId: string,
    formId: string,
    rawData: string,
  ): Promise<GoogleFormsResponse>;
  markGoogleFormsResponseProcessed(
    id: string,
    submissionId: string,
  ): Promise<void>;
  getGoogleFormsStats(): Promise<{
    totalResponses: number;
    processedResponses: number;
    pendingResponses: number;
    lastSyncAt: string | null;
  }>;
  createFile(file: InsertFile): Promise<FileModel>;
  getFileByName(fileName: string): Promise<FileModel | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getLastCodeByPrefix(prefix: string): Promise<string | undefined> {
    // Buscamos códigos que empiecen por el prefijo (ej: "SV_JP01%")
    // Ordenamos descendente para obtener el más alto (ej: ...005, ...004)
    const [result] = await db
      .select({ codigo: submissions.codigo })
      .from(submissions)
      .where(like(submissions.codigo, `${prefix}%`))
      .orderBy(desc(submissions.codigo))
      .limit(1);

    return result?.codigo;
  }

  async getSubmissionByCode(code: string): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.codigo, code));
    return submission;
  }
  async deleteSubmission(id: string): Promise<void> {
    // 1. Buscamos los trabajos de OCR asociados a este cuestionario (submissionId)
    const jobs = await db
      .select({ id: ocrJobs.id })
      .from(ocrJobs)
      .where(eq(ocrJobs.submissionId, id));

    // 2. Para cada trabajo encontrado, eliminamos sus dependencias y el trabajo mismo
    for (const job of jobs) {
      // Eliminar los campos extraídos asociados al Job
      await db
        .delete(ocrExtractedFields)
        .where(eq(ocrExtractedFields.ocrJobId, job.id));

      // Eliminar el trabajo de la tabla ocr_jobs
      await db.delete(ocrJobs).where(eq(ocrJobs.id, job.id));
    }

    // 3. Finalmente, eliminamos el cuestionario
    await db.delete(submissions).where(eq(submissions.id, id));
  }

  async getSubmissionByExternalId(
    externalId: string,
  ): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.externalId, externalId));
    return submission;
  }
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createSubmission(
    insertSubmission: InsertSubmission,
  ): Promise<Submission> {
    const [submission] = await db
      .insert(submissions)
      .values(insertSubmission)
      .returning();
    return submission;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id));
    return submission;
  }

  async updateSubmission(
    id: string,
    data: Partial<Submission>,
  ): Promise<Submission | undefined> {
    const [submission] = await db
      .update(submissions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async updateSubmissionStatus(
    id: string,
    status: string,
    updatedBy?: string,
  ): Promise<Submission | undefined> {
    const [updated] = await db
      .update(submissions)
      .set({
        status: status as any,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  async getSubmissions(
    filters: SubmissionFilter,
    page: number,
    limit: number,
  ): Promise<{ submissions: Submission[]; total: number; pages: number }> {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(submissions.status, filters.status));
    }
    if (filters.source) {
      conditions.push(eq(submissions.source, filters.source));
    }
    if (filters.genero) {
      conditions.push(eq(submissions.genero, filters.genero));
    }
    if (filters.edad) {
      conditions.push(eq(submissions.edad, filters.edad));
    }
    if (filters.relacionFinca) {
      conditions.push(eq(submissions.relacionFinca, filters.relacionFinca));
    }
    if (filters.agricultorTituloPrincipal) {
      conditions.push(
        eq(
          submissions.agricultorTituloPrincipal,
          filters.agricultorTituloPrincipal,
        ),
      );
    }
    if (filters.superficieCategoria) {
      conditions.push(
        eq(submissions.superficieCategoria, filters.superficieCategoria),
      );
    }
    if (filters.usoSuelo) {
      conditions.push(eq(submissions.usoSuelo, filters.usoSuelo));
    }
    if (filters.enProduccion !== undefined) {
      conditions.push(eq(submissions.enProduccion, filters.enProduccion));
    }
    if (filters.acceso) {
      conditions.push(eq(submissions.acceso, filters.acceso));
    }
    if (filters.agua) {
      conditions.push(eq(submissions.agua, filters.agua));
    }
    if (filters.pendiente) {
      conditions.push(eq(submissions.pendiente, filters.pendiente));
    }
    if (filters.pedregosidad) {
      conditions.push(eq(submissions.pedregosidad, filters.pedregosidad));
    }
    if (filters.gradoInteres) {
      conditions.push(eq(submissions.gradoInteres, filters.gradoInteres));
    }
    if (filters.nivelActuacion) {
      conditions.push(eq(submissions.nivelActuacion, filters.nivelActuacion));
    }
    if (filters.localidad) {
      conditions.push(ilike(submissions.localidad, `%${filters.localidad}%`));
    }
    if (filters.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(submissions.nombreApellidos, `%${filters.search}%`),
          ilike(submissions.email, `%${filters.search}%`),
          ilike(submissions.localidad, `%${filters.search}%`),
          ilike(submissions.referenciasCatastrales, `%${filters.search}%`),
          ilike(submissions.codigo, `%${filters.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissions)
      .where(whereClause);

    const total = countResult?.count || 0;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const result = await db
      .select()
      .from(submissions)
      .where(whereClause)
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);

    return { submissions: result, total, pages };
  }

  async getRecentSubmissions(limit: number): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.createdAt))
      .limit(limit);
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    recentLocalities: string[];
  }> {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissions);
    const total = countResult?.count || 0;

    const statusCounts = await db
      .select({
        status: submissions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .groupBy(submissions.status);

    const sourceCounts = await db
      .select({
        source: submissions.source,
        count: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .groupBy(submissions.source);

    const localities = await db
      .selectDistinct({ localidad: submissions.localidad })
      .from(submissions)
      .where(
        sql`${submissions.localidad} IS NOT NULL AND ${submissions.localidad} != ''`,
      )
      .limit(10);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach(({ status, count }) => {
      if (status) byStatus[status] = count;
    });

    const bySource: Record<string, number> = {};
    sourceCounts.forEach(({ source, count }) => {
      if (source) bySource[source] = count;
    });

    const recentLocalities = localities
      .map((l) => l.localidad)
      .filter((l): l is string => l !== null);

    return { total, byStatus, bySource, recentLocalities };
  }

  async createOcrJob(job: InsertOcrJob): Promise<OcrJob> {
    const [result] = await db.insert(ocrJobs).values(job).returning();
    return result;
  }

  async getOcrJobs(): Promise<OcrJob[]> {
    return db.select().from(ocrJobs).orderBy(desc(ocrJobs.createdAt));
  }

  async getOcrJob(id: string): Promise<OcrJob | undefined> {
    const [job] = await db.select().from(ocrJobs).where(eq(ocrJobs.id, id));
    return job;
  }

  async updateOcrJobStatus(
    id: string,
    status: string,
    submissionId?: string,
  ): Promise<OcrJob | undefined> {
    const updateData: any = { status: status as any, updatedAt: new Date() };
    if (submissionId) updateData.submissionId = submissionId;
    const [updated] = await db
      .update(ocrJobs)
      .set(updateData)
      .where(eq(ocrJobs.id, id))
      .returning();
    return updated;
  }

  async updateOcrJobWithDuplicateWarning(
    id: string,
    warning: string,
  ): Promise<OcrJob | undefined> {
    const [updated] = await db
      .update(ocrJobs)
      .set({ duplicateWarning: warning, updatedAt: new Date() })
      .where(eq(ocrJobs.id, id))
      .returning();
    return updated;
  }

  async createOcrExtractedField(
    field: InsertOcrExtractedField,
  ): Promise<OcrExtractedField> {
    const [result] = await db
      .insert(ocrExtractedFields)
      .values(field)
      .returning();
    return result;
  }

  async getOcrExtractedFields(ocrJobId: string): Promise<OcrExtractedField[]> {
    return db
      .select()
      .from(ocrExtractedFields)
      .where(eq(ocrExtractedFields.ocrJobId, ocrJobId));
  }

  async updateOcrExtractedField(
    id: string,
    data: Partial<OcrExtractedField>,
  ): Promise<OcrExtractedField | undefined> {
    const [updated] = await db
      .update(ocrExtractedFields)
      .set(data)
      .where(eq(ocrExtractedFields.id, id))
      .returning();
    return updated;
  }

  async checkDuplicates(
    nombre: string,
    telefono: string,
    localidad: string,
    referencias: string,
  ): Promise<Submission[]> {
    const conditions = [];
    if (nombre)
      conditions.push(ilike(submissions.nombreApellidos, `%${nombre}%`));
    if (telefono) conditions.push(eq(submissions.telefono, telefono));
    if (localidad)
      conditions.push(ilike(submissions.localidad, `%${localidad}%`));
    if (referencias)
      conditions.push(
        ilike(submissions.referenciasCatastrales, `%${referencias}%`),
      );

    if (conditions.length === 0) return [];

    return db
      .select()
      .from(submissions)
      .where(or(...conditions))
      .limit(5);
  }

  async getGoogleFormsConfig(): Promise<GoogleFormsConfig | null> {
    const [config] = await db.select().from(googleFormsConfig).limit(1);
    return config || null;
  }

  async saveGoogleFormsConfig(
    formId: string,
    formUrl?: string,
  ): Promise<GoogleFormsConfig> {
    const existing = await this.getGoogleFormsConfig();
    if (existing) {
      const [updated] = await db
        .update(googleFormsConfig)
        .set({ formId, formUrl: formUrl || null })
        .where(eq(googleFormsConfig.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(googleFormsConfig)
      .values({ formId, formUrl })
      .returning();
    return created;
  }

  async toggleGoogleFormsActive(
    isActive: boolean,
  ): Promise<GoogleFormsConfig | undefined> {
    const config = await this.getGoogleFormsConfig();
    if (!config) return undefined;
    const [updated] = await db
      .update(googleFormsConfig)
      .set({ isActive })
      .where(eq(googleFormsConfig.id, config.id))
      .returning();
    return updated;
  }

  async updateGoogleFormsLastSync(): Promise<void> {
    const config = await this.getGoogleFormsConfig();
    if (config) {
      await db
        .update(googleFormsConfig)
        .set({ lastSyncAt: new Date() })
        .where(eq(googleFormsConfig.id, config.id));
    }
  }

  async getGoogleFormsResponses(): Promise<GoogleFormsResponse[]> {
    return db
      .select()
      .from(googleFormsResponses)
      .orderBy(desc(googleFormsResponses.createdAt))
      .limit(50);
  }

  async saveGoogleFormsResponse(
    responseId: string,
    formId: string,
    rawData: string,
  ): Promise<GoogleFormsResponse> {
    const [result] = await db
      .insert(googleFormsResponses)
      .values({ responseId, formId, rawData })
      .returning();
    return result;
  }

  async markGoogleFormsResponseProcessed(
    id: string,
    submissionId: string,
  ): Promise<void> {
    await db
      .update(googleFormsResponses)
      .set({ processedAt: new Date(), submissionId })
      .where(eq(googleFormsResponses.id, id));
  }

  async getGoogleFormsStats(): Promise<{
    totalResponses: number;
    processedResponses: number;
    pendingResponses: number;
    lastSyncAt: string | null;
  }> {
    const config = await this.getGoogleFormsConfig();

    // Ahora contamos directamente desde la tabla submissions filtrando por origen
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissions)
      .where(eq(submissions.source, "google_forms"));

    const total = countResult?.count || 0;

    return {
      totalResponses: total,
      processedResponses: total, // Al entrar directo, siempre están procesadas
      pendingResponses: 0, // Ya no hay cola intermedia
      lastSyncAt: config?.lastSyncAt?.toISOString() || null,
    };
  }
  async deleteOcrExtractedFields(ocrJobId: string): Promise<void> {
    await db
      .delete(ocrExtractedFields)
      .where(eq(ocrExtractedFields.ocrJobId, ocrJobId));
  }
  async createFile(file: InsertFile): Promise<FileModel> {
    const [result] = await db.insert(files).values(file).returning();
    return result;
  }

  async getFileByName(fileName: string): Promise<FileModel | undefined> {
    // Buscamos por el nombre de archivo que usamos en la URL
    const [result] = await db
      .select()
      .from(files)
      .where(eq(files.fileName, fileName));
    return result;
  }
}
export const storage = new DatabaseStorage();
