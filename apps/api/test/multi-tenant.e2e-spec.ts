import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '@mitama/db';
import { AppModule } from '../src/app.module';

const PASSWORD = 'Test1234!';

/**
 * Anti-fuga multi-tienda (criterio de aceptación de la Fase 1): con dos
 * tiendas pobladas, ninguna consulta de un usuario de la tienda A devuelve
 * registros de la tienda B, y el acceso sin/incorrecto `X-Store-Id` falla
 * cerrado (400/403) vía `StoreContextGuard`/`PermissionsGuard`.
 */
describe('Multi-tenant anti-fuga (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);

  let storeA: { id: string };
  let storeB: { id: string };
  let editorRole: { id: string };
  let readOnlyRole: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let userReadOnly: { id: string };

  let tokenA: string;
  let tokenB: string;
  let tokenReadOnly: string;
  let tokenSuperAdmin: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const currency = await prisma.currency.findFirstOrThrow();
    const region = await prisma.region.findFirstOrThrow();

    storeA = await prisma.store.create({
      data: { name: `E2E Store A ${suffix}`, code: `e2e-store-a-${suffix}`, currencyCode: currency.code, regionId: region.id },
    });
    storeB = await prisma.store.create({
      data: { name: `E2E Store B ${suffix}`, code: `e2e-store-b-${suffix}`, currencyCode: currency.code, regionId: region.id },
    });

    editorRole = await prisma.role.create({
      data: { name: `E2E Editor ${suffix}`, permissions: ['settings.read', 'settings.update', 'activity-log.read'] },
    });
    readOnlyRole = await prisma.role.create({
      data: { name: `E2E Read Only ${suffix}`, permissions: ['settings.read', 'activity-log.read'] },
    });

    const hash = await argon2.hash(PASSWORD);

    userA = await prisma.user.create({
      data: {
        email: `e2e-user-a-${suffix}@mitama.local`,
        name: 'E2E User A',
        status: 'active',
        passwordCredentials: { create: { hash } },
        storeRoles: { create: { storeId: storeA.id, roleId: editorRole.id } },
      },
    });
    userB = await prisma.user.create({
      data: {
        email: `e2e-user-b-${suffix}@mitama.local`,
        name: 'E2E User B',
        status: 'active',
        passwordCredentials: { create: { hash } },
        storeRoles: { create: { storeId: storeB.id, roleId: editorRole.id } },
      },
    });
    userReadOnly = await prisma.user.create({
      data: {
        email: `e2e-user-readonly-${suffix}@mitama.local`,
        name: 'E2E User Read Only',
        status: 'active',
        passwordCredentials: { create: { hash } },
        storeRoles: { create: { storeId: storeA.id, roleId: readOnlyRole.id } },
      },
    });

    const server = app.getHttpServer();
    tokenA = (await request(server).post('/auth/login').send({ email: `e2e-user-a-${suffix}@mitama.local`, password: PASSWORD })).body.accessToken;
    tokenB = (await request(server).post('/auth/login').send({ email: `e2e-user-b-${suffix}@mitama.local`, password: PASSWORD })).body.accessToken;
    tokenReadOnly = (await request(server).post('/auth/login').send({ email: `e2e-user-readonly-${suffix}@mitama.local`, password: PASSWORD })).body.accessToken;
    tokenSuperAdmin = (
      await request(server).post('/auth/login').send({ email: 'admin@mitama.local', password: process.env.SEED_ADMIN_PASSWORD })
    ).body.accessToken;
  });

  afterAll(async () => {
    await prisma.activityLogEntry.deleteMany({ where: { storeId: { in: [storeA.id, storeB.id] } } });
    await prisma.activityLogEntry.deleteMany({ where: { userId: { in: [userA.id, userB.id, userReadOnly.id] } } });
    await prisma.user.delete({ where: { id: userA.id } });
    await prisma.user.delete({ where: { id: userB.id } });
    await prisma.user.delete({ where: { id: userReadOnly.id } });
    await prisma.store.delete({ where: { id: storeA.id } });
    await prisma.store.delete({ where: { id: storeB.id } });
    await prisma.role.delete({ where: { id: editorRole.id } });
    await prisma.role.delete({ where: { id: readOnlyRole.id } });
    await app.close();
  });

  it('rechaza con 401 sin access token', async () => {
    await request(app.getHttpServer()).get('/settings').expect(401);
  });

  it('usa la única tienda del usuario si falta X-Store-Id en modo single-store', async () => {
    const res = await request(app.getHttpServer()).get('/settings').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rechaza con 403 si el usuario no tiene rol en la tienda solicitada', async () => {
    const res = await request(app.getHttpServer())
      .get('/settings')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Store-Id', storeB.id);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('No tienes permiso');
  });

  it('permite el acceso a la tienda donde el usuario tiene rol', async () => {
    const res = await request(app.getHttpServer())
      .get('/settings')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Store-Id', storeA.id);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rechaza con 403 una mutación sin el permiso requerido', async () => {
    const res = await request(app.getHttpServer())
      .patch('/settings/pos.receipt_footer_text')
      .set('Authorization', `Bearer ${tokenReadOnly}`)
      .set('X-Store-Id', storeA.id)
      .send({ value: 'no debería guardarse' });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('No tienes permiso');
  });

  it('aplica el override de settings por tienda sin filtrar datos entre tiendas', async () => {
    const updateA = await request(app.getHttpServer())
      .patch('/settings/pos.receipt_footer_text')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Store-Id', storeA.id)
      .send({ value: 'Pie de recibo Tienda A' });
    expect(updateA.status).toBe(200);

    const updateB = await request(app.getHttpServer())
      .patch('/settings/pos.receipt_footer_text')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Store-Id', storeB.id)
      .send({ value: 'Pie de recibo Tienda B' });
    expect(updateB.status).toBe(200);

    const listA = await request(app.getHttpServer())
      .get('/settings')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Store-Id', storeA.id);
    const settingA = listA.body.find((item: { key: string }) => item.key === 'pos.receipt_footer_text');
    expect(settingA.value).toBe('Pie de recibo Tienda A');

    const listB = await request(app.getHttpServer())
      .get('/settings')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Store-Id', storeB.id);
    const settingB = listB.body.find((item: { key: string }) => item.key === 'pos.receipt_footer_text');
    expect(settingB.value).toBe('Pie de recibo Tienda B');
  });

  it('no filtra entradas de activity-log entre tiendas', async () => {
    const logA = await request(app.getHttpServer())
      .get('/activity-log')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Store-Id', storeA.id);
    expect(logA.status).toBe(200);
    expect(logA.body.items.length).toBeGreaterThan(0);
    expect(logA.body.items.every((entry: { storeId: string | null }) => entry.storeId === storeA.id)).toBe(true);

    const logB = await request(app.getHttpServer())
      .get('/activity-log')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Store-Id', storeB.id);
    expect(logB.status).toBe(200);
    expect(logB.body.items.length).toBeGreaterThan(0);
    expect(logB.body.items.every((entry: { storeId: string | null }) => entry.storeId === storeB.id)).toBe(true);
  });

  it('Super Admin puede operar sobre cualquier tienda', async () => {
    const res = await request(app.getHttpServer())
      .get('/settings')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .set('X-Store-Id', storeB.id);
    expect(res.status).toBe(200);

    const stores = await request(app.getHttpServer())
      .get('/stores')
      .set('Authorization', `Bearer ${tokenSuperAdmin}`);
    const codes = stores.body.map((store: { id: string }) => store.id);
    expect(codes).toContain(storeA.id);
    expect(codes).toContain(storeB.id);
  });
});
