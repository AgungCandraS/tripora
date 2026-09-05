import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ApiResponseInterceptor } from "./common/interceptors/api-response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>("NODE_ENV", "development");

  // Fail-fast secret validation (OWASP A02/A05): production menolak secret default/lemah.
  if (nodeEnv === "production") {
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
      const v = config.get<string>(key, "");
      if (!v || v.length < 32 || v.startsWith("change-me")) {
        throw new Error(`Refusing to boot: ${key} must be a strong random secret in production`);
      }
    }
    const cors = config.get<string>("CORS_ORIGIN", "");
    if (!cors || cors.includes("localhost")) {
      throw new Error("Refusing to boot: CORS_ORIGIN must be the production web domain");
    }
    for (const [urlKey, label] of [["MAYAR_API_BASE", "Mayar"], ["WEB_PUBLIC_BASE_URL", "public web"]] as const) {
      const u = config.get<string>(urlKey, "");
      if (u && !u.startsWith("https://")) {
        throw new Error(`Refusing to boot: ${label} base URL must use https in production`);
      }
    }
  }

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("CORS_ORIGIN", "http://localhost:3000"),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Tripora API")
    .setDescription("Multi-vendor tourism & activity booking marketplace")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Swagger OFF di production kecuali eksplisit (OWASP A05: kurangi permukaan info).
  if (nodeEnv !== "production" || config.get<string>("SWAGGER_ENABLED", "false") === "true") {
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
