"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
describe("IngestionController (e2e)", () => {
    let app;
    beforeEach(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });
    afterEach(async () => {
        await app.close();
    });
    it("/upload (POST) with valid csv", () => {
        const csvContent = "Campaign Name,Date,Region,Spend,Impressions,Platform,Campaign ID\nSummer Sale,2025-01-01,NA,100.00,1000,Google,C123";
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
//# sourceMappingURL=ingestion.e2e-spec.js.map