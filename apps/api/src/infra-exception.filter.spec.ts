import { BadRequestException, HttpStatus, Logger, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InfraExceptionFilter } from './infra-exception.filter';

function createHost(url = '/v1/test'): { host: ArgumentsHost; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as ArgumentsHost;
  return { host, json, status };
}

describe('InfraExceptionFilter', () => {
  it('preserva HttpException existentes', () => {
    const filter = new InfraExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new BadRequestException('Entrada inválida'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: HttpStatus.BAD_REQUEST }));
  });

  it('convierte excepciones no controladas a respuesta 500 estable', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new InfraExceptionFilter();
    const { host, json, status } = createHost('/v1/orders');

    filter.catch(new Error('Prisma connection lost'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del servidor',
        error: 'Internal Server Error',
        path: '/v1/orders',
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Excepción no controlada'), expect.any(String));
    errorSpy.mockRestore();
  });
});
