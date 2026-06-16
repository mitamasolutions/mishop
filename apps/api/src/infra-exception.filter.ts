import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

type HttpResponse = {
  status(statusCode: number): { json(body: unknown): unknown };
};

type HttpRequest = {
  url?: string;
};

@Catch()
export class InfraExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(InfraExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<HttpResponse>();
    const request = http.getRequest<HttpRequest>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      response.status(statusCode).json(this.normalizeHttpException(exception, statusCode));
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(`Excepción no controlada en HTTP: ${message}`, exception instanceof Error ? exception.stack : undefined);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizeHttpException(exception: HttpException, statusCode: number): unknown {
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return { statusCode, message: payload };
    }
    return payload;
  }
}
