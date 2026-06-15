import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '@mitama/db';
import { AppModule } from '../src/app.module';

const PASSWORD = 'Test1234!';

/**
 * Regresión r22 (F1 · sprint1_cierre): el refresh token se entrega y mantiene
 * **solo** en una cookie HttpOnly `mitama_refresh`. El body de `/auth/login`
 * y `/auth/refresh` no expone el refresh. `/auth/refresh` lo lee de la cookie
 * y `/auth/logout` la limpia.
 */
describe('Auth cookie HttpOnly (e2e · r22)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const email = `e2e-r22-${suffix}@mitama.local`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await prisma.user.create({
      data: {
        email,
        name: `E2E R22 ${suffix}`,
        status: 'active',
        passwordCredentials: { create: { hash: await argon2.hash(PASSWORD) } },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('login setea cookie HttpOnly mitama_refresh y NO retorna refreshToken en el body', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeUndefined();

    const setCookie = res.headers['set-cookie'] as unknown as string[] | string | undefined;
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const refresh = cookies.find((c) => c.startsWith('mitama_refresh='));
    expect(refresh).toBeTruthy();
    expect(refresh!.toLowerCase()).toContain('httponly');
    expect(refresh!.toLowerCase()).toContain('samesite=lax');
    expect(refresh).toContain('Path=/');
  });

  it('refresh lee el token desde la cookie (sin body) y rota la cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    const setCookie = (login.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mitama_refresh='));
    expect(setCookie).toBeTruthy();
    const cookieHeader = setCookie!.split(';')[0]; // "mitama_refresh=xxxxx"

    // Cuerpo vacío: el endpoint lee el refresh de la cookie
    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .send({})
      .expect(201);
    expect(refreshed.body.accessToken).toBeTruthy();
    expect(refreshed.body.refreshToken).toBeUndefined();

    const rotated = (refreshed.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mitama_refresh='));
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(setCookie);
  });

  it('refresh sin cookie y sin body responde 401', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
  });

  it('logout limpia la cookie HttpOnly y revoca el refresh', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    const accessToken = login.body.accessToken as string;
    const setCookie = (login.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mitama_refresh='));
    const cookieHeader = setCookie!.split(';')[0];

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookieHeader)
      .send({})
      .expect(204);
    const cleared = (logout.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mitama_refresh='));
    expect(cleared).toBeTruthy();
    expect(cleared!.toLowerCase()).toMatch(/expires=thu, 01 jan 1970|max-age=0/);

    // Tras el logout, el refresh original fue revocado: reusarlo debe fallar.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .send({})
      .expect(401);
  });
});
