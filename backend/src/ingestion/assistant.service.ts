import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { VectorStoreService } from "./vector-store.service";

interface VectorDocument {
  id: string;
  text: string;
  embedding?: number[];
  metadata: {
    jobId: string;
    fileName: string;
    status: string;
    createdAt: string;
    qualityScore?: number;
  };
}

@Injectable()
export class AssistantService {
  private openai: OpenAI | null = null;

  constructor(private readonly vectorStore: VectorStoreService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async indexIngestion(ingestion: any) {
    const text = `Ingestion Job ID ${ingestion.jobId}. File: ${ingestion.fileName}. Status: ${ingestion.status}. Quality Score: ${ingestion.validation?.qualityScore || "N/A"}%. Summary: ${ingestion.validation?.summary || "No summary"}.`;

    let embedding: number[] | undefined = undefined;
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        });
        embedding = response.data[0].embedding;
      } catch (err) {
        console.warn("OpenAI embedding generation failed:", err);
      }
    }

    await this.vectorStore.upsertDocument({
      id: ingestion.jobId,
      jobId: ingestion.jobId,
      fileName: ingestion.fileName,
      status: ingestion.status,
      createdAt: ingestion.createdAt,
      qualityScore: ingestion.validation?.qualityScore,
      text,
      metadata: {
        jobId: ingestion.jobId,
        fileName: ingestion.fileName,
        status: ingestion.status,
        createdAt: ingestion.createdAt,
        qualityScore: ingestion.validation?.qualityScore,
      },
      embedding: embedding || Array(1536).fill(0),
    });
  }

  async query(queryText: string) {
    let queryEmbedding: number[] | undefined = undefined;
    if (this.openai) {
      try {
        const res = await this.openai.embeddings.create({
          model: "text-embedding-3-small",
          input: queryText,
        });
        queryEmbedding = res.data[0].embedding;
      } catch (err) {
        console.warn("OpenAI query embedding failed:", err);
      }
    }

    let relevantDocs: VectorDocument[] = [];
    if (queryEmbedding) {
      const results = await this.vectorStore.searchByEmbedding(
        queryEmbedding,
        3,
      );
      relevantDocs = results.map((row) => ({
        id: row.id,
        text: row.text,
        embedding: undefined,
        metadata: {
          jobId: row.jobId,
          fileName: row.fileName,
          status: row.status,
          createdAt: row.createdAt,
          qualityScore: row.qualityScore,
        },
      }));
    }

    if (relevantDocs.length === 0) {
      const keywordResults = await this.vectorStore.searchByKeyword(
        queryText,
        3,
      );
      relevantDocs = keywordResults.map((row) => ({
        id: row.id,
        text: row.text,
        embedding: undefined,
        metadata: {
          jobId: row.jobId,
          fileName: row.fileName,
          status: row.status,
          createdAt: row.createdAt,
          qualityScore: row.qualityScore,
        },
      }));
    }

    let answer = "";
    if (this.openai && relevantDocs.length > 0) {
      try {
        const contextStr = relevantDocs
          .map(
            (d, i) =>
              `[Source ${i + 1}] File: ${d.metadata.fileName} (Job: ${d.metadata.jobId}): ${d.text}`,
          )
          .join("\n\n");

        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert Ad Tech RAG assistant. Answer the user's question using ONLY the provided ingestion context sources. Cite the specific file names and job IDs in your response.",
            },
            {
              role: "user",
              content: `Context:\n${contextStr}\n\nQuestion: ${queryText}`,
            },
          ],
          temperature: 0.2,
        });
        answer =
          completion.choices[0].message.content || "No response generated.";
      } catch (err) {
        console.warn(
          "OpenAI completion failed, falling back to rule-based summary:",
          err,
        );
      }
    }

    if (!answer) {
      if (relevantDocs.length > 0) {
        answer = `Based on retrieved ingestion records (Top match: ${relevantDocs[0].metadata.fileName}, Quality: ${relevantDocs[0].metadata.qualityScore}%): ${relevantDocs[0].text}`;
      } else {
        answer =
          "I could not find any matching ingestion run in the vector knowledge base for your query.";
      }
    }

    return {
      query: queryText,
      answer,
      sources: relevantDocs.map((doc) => ({
        jobId: doc.metadata.jobId,
        fileName: doc.metadata.fileName,
      })),
    };
  }
}
