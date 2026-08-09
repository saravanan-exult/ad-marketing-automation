import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import * as path from "path";
import * as fs from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS so the frontend can call this API during local development
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders:
      "Content-Type,Accept,Authorization,Origin,User-Agent,DNT,Cache-Control,X-Requested-With,If-Modified-Since",
    credentials: true,
    preflightContinue: false,
  });
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));
  // app.use(fileUpload());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve static frontend assets if built (production Docker environment)
  const possibleFrontendPaths = [
    path.join(__dirname, "..", "..", "frontend", "build"),
    path.join(__dirname, "..", "frontend", "build"),
    path.join(process.cwd(), "frontend", "build"),
  ];

  const frontendBuildPath = possibleFrontendPaths.find((p) => fs.existsSync(p));

  if (frontendBuildPath) {
    app.use(express.static(frontendBuildPath));
    app.use((req, res, next) => {
      if (
        req.method === "GET" &&
        !req.path.startsWith("/upload") &&
        !req.path.startsWith("/validation") &&
        !req.path.startsWith("/workflow-status") &&
        !req.path.startsWith("/approve") &&
        !req.path.startsWith("/reconciliation") &&
        !req.path.startsWith("/assistant") &&
        !req.path.startsWith("/history") &&
        !req.path.startsWith("/pipeline-status") &&
        !req.path.startsWith("/schedule") &&
        !req.path.startsWith("/download") &&
        !req.path.startsWith("/push") &&
        !req.path.startsWith("/health") &&
        !req.path.includes(".")
      ) {
        res.sendFile(path.join(frontendBuildPath, "index.html"));
      } else {
        next();
      }
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
