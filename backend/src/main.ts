import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import * as fileUpload from "express-fileupload";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS so the frontend can call this API during local development
  app.enableCors({
    origin: "http://localhost:3000",
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
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
