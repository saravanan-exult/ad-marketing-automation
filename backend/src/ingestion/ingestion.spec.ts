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
  }, 30000);

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
        expect(res.body).toHaveProperty("jobId");
        expect(res.body).toHaveProperty("validation");
      });
  }, 30000);

  it("/schedule (GET & POST) scheduling flow", async () => {
    const getRes = await request(app.getHttpServer())
      .get("/schedule")
      .expect(200);
    expect(Array.isArray(getRes.body)).toBe(true);

    const postRes = await request(app.getHttpServer())
      .post("/schedule")
      .send({
        sourceName: "TikTok Ads",
        frequency: "DAILY",
        executionTime: "09:00 AM",
        notificationEmail: "alerts@company.com",
      })
      .expect(201); // 201 Created

    expect(postRes.body).toHaveProperty("scheduleId");
    expect(postRes.body.sourceName).toBe("TikTok Ads");

    const triggerRes = await request(app.getHttpServer())
      .post(`/schedule/${postRes.body.scheduleId}/trigger`)
      .expect(201);

    expect(triggerRes.body.success).toBe(true);
  }, 30000);
});
