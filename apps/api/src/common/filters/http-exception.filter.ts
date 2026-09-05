import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";

interface ErrorBody {
  code?: string;
  message?: string;
  statusCode?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    // Pesan internal (Prisma/SQL/stack) TIDAK BOLEH bocor ke klien (OWASP A05).
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as ErrorBody | string;
      if (typeof body === "string") {
        message = status >= 500 ? "Internal server error" : body;
      } else {
        message = status >= 500 ? "Internal server error" : (body.message ?? exception.message);
        code = status >= 500 ? "INTERNAL_ERROR" : (body.code ?? this.codeFromStatus(status));
      }
    } else if (exception instanceof Error) {
      // eslint-disable-next-line no-console
      console.error("[unhandled]", exception.stack ?? exception.message);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
    });
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "VALIDATION_ERROR";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      default:
        return "INTERNAL_ERROR";
    }
  }
}
