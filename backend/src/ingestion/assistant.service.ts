import { Injectable } from "@nestjs/common";
import OpenAI from "openai";

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
  private documents: VectorDocument[] = [];
  private openai: OpenAI | null = null;

  constructor() {
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
        console.warn(
          "OpenAI embedding generation failed, using keyword fallback:",
          err,
        );
      }
    }

    const doc: VectorDocument = {
      id: ingestion.jobId,
      text,
      embedding,
      metadata: {
        jobId: ingestion.jobId,
        fileName: ingestion.fileName,
        status: ingestion.status,
        createdAt: ingestion.createdAt,
        qualityScore: ingestion.validation?.qualityScore,
      },
    };

    this.documents = this.documents.filter((d) => d.id !== doc.id);
    if (this.documents.length >= 200) {
      this.documents.shift();
    }
    this.documents.push(doc);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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

    // Score documents by vector cosine similarity or keyword match
    const scored = this.documents.map((doc) => {
      let score = 0;
      if (queryEmbedding && doc.embedding) {
        score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      } else {
        const lowerQ = queryText.toLowerCase();
        const lowerText = doc.text.toLowerCase();
        const words = lowerQ.split(/\s+/);
        let matches = 0;
        for (const w of words) {
          if (w.length > 2 && lowerText.includes(w)) matches++;
        }
        score = matches / Math.max(1, words.length);
      }
      return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.filter((s) => s.score > 0.1).slice(0, 3);
    const relevantDocs = topMatches.map((m) => m.doc);

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
