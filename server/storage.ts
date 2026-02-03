import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  submissions, 
  type User, 
  type InsertUser,
  type Submission,
  type InsertSubmission,
  type SubmissionFilter
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: string): Promise<Submission | undefined>;
  updateSubmissionStatus(id: string, status: string, updatedBy?: string): Promise<Submission | undefined>;
  getSubmissions(filters: SubmissionFilter, page: number, limit: number): Promise<{ submissions: Submission[]; total: number; pages: number }>;
  getRecentSubmissions(limit: number): Promise<Submission[]>;
  getStats(): Promise<{ total: number; byStatus: Record<string, number>; bySource: Record<string, number>; recentLocalities: string[] }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(insertSubmission).returning();
    return submission;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission;
  }

  async updateSubmissionStatus(id: string, status: string, updatedBy?: string): Promise<Submission | undefined> {
    const [updated] = await db
      .update(submissions)
      .set({ 
        status: status as any, 
        updatedAt: new Date(),
        updatedBy 
      })
      .where(eq(submissions.id, id))
      .returning();
    return updated;
  }

  async getSubmissions(filters: SubmissionFilter, page: number, limit: number): Promise<{ submissions: Submission[]; total: number; pages: number }> {
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
      conditions.push(eq(submissions.agricultorTituloPrincipal, filters.agricultorTituloPrincipal));
    }
    if (filters.superficieCategoria) {
      conditions.push(eq(submissions.superficieCategoria, filters.superficieCategoria));
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
      conditions.push(
        or(
          ilike(submissions.nombreApellidos, `%${filters.search}%`),
          ilike(submissions.email, `%${filters.search}%`),
          ilike(submissions.localidad, `%${filters.search}%`),
          ilike(submissions.referenciasCatastrales, `%${filters.search}%`)
        )
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

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; bySource: Record<string, number>; recentLocalities: string[] }> {
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(submissions);
    const total = countResult?.count || 0;

    const statusCounts = await db
      .select({ 
        status: submissions.status, 
        count: sql<number>`count(*)::int` 
      })
      .from(submissions)
      .groupBy(submissions.status);

    const sourceCounts = await db
      .select({ 
        source: submissions.source, 
        count: sql<number>`count(*)::int` 
      })
      .from(submissions)
      .groupBy(submissions.source);

    const localities = await db
      .selectDistinct({ localidad: submissions.localidad })
      .from(submissions)
      .where(sql`${submissions.localidad} IS NOT NULL AND ${submissions.localidad} != ''`)
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
      .map(l => l.localidad)
      .filter((l): l is string => l !== null);

    return { total, byStatus, bySource, recentLocalities };
  }
}

export const storage = new DatabaseStorage();
