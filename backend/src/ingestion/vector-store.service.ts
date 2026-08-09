import { Injectable, Logger } from "@nestjs/common";
import { Client } from "pg";

export interface StoredVectorDocument {
  id: string;
  jobId: string;
  fileName: string;
  status: string;
  createdAt: string;
  qualityScore?: number;
  text: string;
  metadata: Record<string, any>;
  distance?: number;
}

const VECTOR_DIMENSION = 1536;

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

@Injectable()
export class VectorStoreService {
  private client: Client | null = null;
  private connected = false;
  private readonly logger = new Logger(VectorStoreService.name);

  private get connectionString(): string {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://adtech:securepassword123@localhost:5432/adtech_db";
    return connectionString;
  }

  private async connect(): Promise<void> {
    if (this.connected && this.client) return;

    this.client = new Client({ connectionString: this.connectionString });
    await this.client.connect();
    await this.ensureSchema();
    this.connected = true;
  }

  private get db(): Client {
    if (!this.client) {
      throw new Error("PostgreSQL client is not initialized.");
    }
    return this.client;
  }

  private async ensureSchema() {
    try {
      await this.db.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    } catch (e) {
      this.logger.warn(
        "pgvector extension not available, falling back to JSON embedding storage.",
      );
    }

    // Check if table exists and what type embedding is
    let res: any = { rows: [] };
    try {
      res = await this.db.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'rag_documents' AND column_name = 'embedding';
      `);
    } catch (e) {
      res = { rows: [] };
    }

    if (!res || !res.rows || res.rows.length === 0) {
      try {
        await this.db.query(`
          CREATE TABLE IF NOT EXISTS rag_documents (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            status TEXT,
            created_at TIMESTAMP WITH TIME ZONE,
            quality_score INT,
            text TEXT NOT NULL,
            metadata JSONB,
            embedding VECTOR(${VECTOR_DIMENSION})
          );
        `);
      } catch (e) {
        await this.db.query(`
          CREATE TABLE IF NOT EXISTS rag_documents (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            status TEXT,
            created_at TIMESTAMP WITH TIME ZONE,
            quality_score INT,
            text TEXT NOT NULL,
            metadata JSONB,
            embedding TEXT
          );
        `);
      }
    }
  }

  async upsertDocument(document: {
    id: string;
    jobId: string;
    fileName: string;
    status: string;
    createdAt: string;
    qualityScore?: number;
    text: string;
    metadata: Record<string, any>;
    embedding: number[];
  }) {
    await this.connect();
    const vectorLiteral = toVectorLiteral(document.embedding);

    let castExpr = `${vectorLiteral}::vector`;
    try {
      await this.db.query(`SELECT ''::vector`);
    } catch (e) {
      castExpr = `'${vectorLiteral}'`;
    }

    await this.db.query(
      `INSERT INTO rag_documents (
         id,
         job_id,
         file_name,
         status,
         created_at,
         quality_score,
         text,
         metadata,
         embedding
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,${castExpr})
       ON CONFLICT (id) DO UPDATE SET
         job_id = EXCLUDED.job_id,
         file_name = EXCLUDED.file_name,
         status = EXCLUDED.status,
         created_at = EXCLUDED.created_at,
         quality_score = EXCLUDED.quality_score,
         text = EXCLUDED.text,
         metadata = EXCLUDED.metadata,
         embedding = EXCLUDED.embedding;`,
      [
        document.id,
        document.jobId,
        document.fileName,
        document.status,
        document.createdAt,
        document.qualityScore ?? null,
        document.text,
        JSON.stringify(document.metadata),
      ],
    );
  }

  async searchByEmbedding(
    queryEmbedding: number[],
    limit = 5,
  ): Promise<StoredVectorDocument[]> {
    await this.connect();
    const queryVector = toVectorLiteral(queryEmbedding);
    let orderExpr = `embedding <=> ${queryVector}::vector`;
    try {
      await this.db.query(`SELECT ''::vector`);
    } catch (e) {
      orderExpr = `1`;
    }
    const result = await this.db.query(
      `SELECT id, job_id, file_name, status, created_at, quality_score, text, metadata,
              1.0 AS distance
         FROM rag_documents
        ORDER BY ${orderExpr} ASC
        LIMIT $1;
      `,
      [limit],
    );

    return (result && result.rows ? result.rows : []).map((row: any) => ({
      id: row.id,
      jobId: row.job_id,
      fileName: row.file_name,
      status: row.status,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      qualityScore: row.quality_score,
      text: row.text,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata || {},
      distance: Number(row.distance),
    }));
  }

  async searchByKeyword(
    queryText: string,
    limit = 5,
  ): Promise<StoredVectorDocument[]> {
    await this.connect();
    const sanitized = queryText.toLowerCase().replace(/[%_]/g, "\\$&");
    const pattern = `%${sanitized}%`;
    const result = await this.db.query(
      `SELECT id, job_id, file_name, status, created_at, quality_score, text, metadata
         FROM rag_documents
        WHERE LOWER(text) LIKE $1 OR LOWER(file_name) LIKE $1
        ORDER BY created_at DESC
        LIMIT $2;
      `,
      [pattern, limit],
    );

    return (result && result.rows ? result.rows : []).map((row: any) => ({
      id: row.id,
      jobId: row.job_id,
      fileName: row.file_name,
      status: row.status,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at,
      qualityScore: row.quality_score,
      text: row.text,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata || {},
    }));
  }
}
