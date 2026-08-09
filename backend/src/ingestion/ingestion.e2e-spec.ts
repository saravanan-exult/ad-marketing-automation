import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../app.module";

describe("IngestionController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/upload (POST) with valid csv", () => {
    const csvContent =
      "Campaign Name,Date,Region,Spend,Impressions,Platform,Campaign ID\nSummer Sale,2025-01-01,NA,100.00,1000,Google,C123";
    return request(app.getHttpServer())
      .post("/upload")
      .attach("file", Buffer.from(csvContent), {
        filename: "sample.csv",
        contentType: "text/csv",
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty("fileId");
        expect(res.body).toHaveProperty("summary");
      });
  });
});
