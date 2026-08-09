import { VectorStoreService } from "./vector-store.service";
import { Client } from "pg";

const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock("pg", () => ({
  Client: jest.fn(() => ({
    connect: mockConnect,
    query: mockQuery,
  })),
  __esModule: true,
}));

describe("VectorStoreService", () => {
  let service: VectorStoreService;
  let mockClient: { connect: jest.Mock; query: jest.Mock };

  beforeEach(() => {
    process.env.DATABASE_URL =
      "postgresql://adtech:securepassword123@localhost:5432/adtech_db";
    jest.clearAllMocks();
    service = new VectorStoreService();
    const mockClientConstructor = Client as unknown as jest.Mock;
    mockClient = mockClientConstructor.mock.instances[0] as any;
  });

  it("connects to PostgreSQL and creates the vector schema when indexing a document", async () => {
    const document = {
      id: "job-123",
      jobId: "job-123",
      fileName: "sample.csv",
      status: "VALIDATED",
      createdAt: new Date().toISOString(),
      qualityScore: 88,
      text: "Ingestion Job ID job-123. File: sample.csv. Status: VALIDATED. Quality Score: 88%. Summary: No summary.",
      metadata: {
        jobId: "job-123",
        fileName: "sample.csv",
        status: "VALIDATED",
        createdAt: new Date().toISOString(),
        qualityScore: 88,
      },
      embedding: [0.1, 0.2, 0.3],
    };

    await service.upsertDocument(document);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE EXTENSION IF NOT EXISTS vector;"),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS rag_documents"),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO rag_documents"),
      expect.any(Array),
    );
  });

  it("performs embedding and keyword search queries", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await service.searchByEmbedding([0.1, 0.2, 0.3], 2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        "SELECT id, job_id, file_name, status, created_at, quality_score, text, metadata,",
      ),
      [2],
    );

    mockQuery.mockResolvedValueOnce({ rows: [] });
    await service.searchByKeyword("quality score below 80", 2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE LOWER(text) LIKE $1"),
      [expect.stringContaining("%quality score below 80"), 2],
    );
  });
});
