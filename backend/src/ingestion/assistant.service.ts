import { Injectable } from "@nestjs/common";

@Injectable()
export class AssistantService {
  private documents: any[] = [];

  indexIngestion(ingestion: any) {
    const doc = {
      id: ingestion.jobId,
      text: `File ${ingestion.fileName} with status ${ingestion.status} and quality ${ingestion.validation?.qualityScore || "N/A"}. ${ingestion.validation?.summary || ""}`,
      metadata: {
        jobId: ingestion.jobId,
        fileName: ingestion.fileName,
        status: ingestion.status,
        createdAt: ingestion.createdAt,
      },
    };
    this.documents = this.documents.filter((d) => d.id !== doc.id);
    this.documents.push(doc);
  }

  async query(query: string) {
    const relevant = this.documents
      .filter((doc) => doc.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
    const answer = relevant.length
      ? `I found ${relevant.length} ingestion runs that match your question. Latest file: ${relevant[0].metadata.fileName}.`
      : "I could not find a matching ingestion run in the indexed history.";
    return {
      query,
      answer,
      sources: relevant.map((doc) => ({
        jobId: doc.metadata.jobId,
        fileName: doc.metadata.fileName,
      })),
    };
  }
}
