/**
 * Patrón de referencia para testear casos de uso: adapters in-memory,
 * sin tocar Prisma ni NestJS.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryEventBus, ValidationError } from '@mitama/core';
import { USER_REGISTERED, UserRegisteredEvent } from '@mitama/contracts';
import { RegisterUserUseCase } from './register-user.use-case';
import { Email } from '../../domain/email.vo';
import { User } from '../../domain/user.entity';
import { EmailAlreadyInUseError } from '../../domain/errors';
import type { UserRepository } from '../../domain/user.repository';
import type { PasswordHasher } from '../../domain/password-hasher';

class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return user;
      }
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return hashed === `hashed:${plain}`;
  }
}

describe('RegisterUserUseCase', () => {
  let users: InMemoryUserRepository;
  let events: InMemoryEventBus;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    events = new InMemoryEventBus();
    useCase = new RegisterUserUseCase(users, new FakePasswordHasher(), events);
  });

  it('registra un usuario, hashea la contraseña y publica el evento', async () => {
    const published: UserRegisteredEvent[] = [];
    events.subscribe<UserRegisteredEvent>(USER_REGISTERED, (event) => {
      published.push(event);
    });

    const result = await useCase.execute({
      email: 'Maria@Ejemplo.mx',
      password: 'super-secreta',
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.email).toBe('maria@ejemplo.mx');
      const saved = users.users.get(result.value.userId);
      expect(saved?.passwordHash).toBe('hashed:super-secreta');
    }
    expect(published).toHaveLength(1);
    expect(published[0]?.payload.email).toBe('maria@ejemplo.mx');
  });

  it('falla con ValidationError si el email es inválido', async () => {
    const result = await useCase.execute({ email: 'no-es-email', password: 'super-secreta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con ValidationError si la contraseña es corta', async () => {
    const result = await useCase.execute({ email: 'maria@ejemplo.mx', password: 'corta' });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });

  it('falla con EmailAlreadyInUseError si el email ya existe', async () => {
    await useCase.execute({ email: 'maria@ejemplo.mx', password: 'super-secreta' });

    const result = await useCase.execute({
      email: 'maria@ejemplo.mx',
      password: 'otra-secreta',
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(EmailAlreadyInUseError);
    }
  });
});
