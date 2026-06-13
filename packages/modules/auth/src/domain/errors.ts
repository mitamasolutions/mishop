import { DomainError, NotFoundError } from '@mitama/core';

/** Error genérico de login: no revela si el email existe o si la contraseña es incorrecta. */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'AUTH.INVALID_CREDENTIALS';

  constructor() {
    super('Email o contraseña incorrectos');
  }
}

export class AccountLockedError extends DomainError {
  readonly code = 'AUTH.ACCOUNT_LOCKED';

  constructor() {
    super('La cuenta está bloqueada temporalmente. Intenta de nuevo más tarde');
  }
}

export class AccountDisabledError extends DomainError {
  readonly code = 'AUTH.ACCOUNT_DISABLED';

  constructor() {
    super('La cuenta está deshabilitada');
  }
}

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'AUTH.EMAIL_ALREADY_IN_USE';

  constructor(email: string) {
    super(`El email "${email}" ya está registrado`);
  }
}

export class InvalidOrExpiredTokenError extends DomainError {
  readonly code = 'AUTH.INVALID_OR_EXPIRED_TOKEN';

  constructor(message = 'El token es inválido o ya expiró') {
    super(message);
  }
}

export class PasswordReuseError extends DomainError {
  readonly code = 'AUTH.PASSWORD_REUSE';

  constructor() {
    super('No puedes reutilizar ninguna de tus últimas 4 contraseñas');
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('El usuario', id);
  }
}

export class RoleNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('El rol', id);
  }
}

export class RoleNameAlreadyInUseError extends DomainError {
  readonly code = 'AUTH.ROLE_NAME_ALREADY_IN_USE';

  constructor(name: string) {
    super(`Ya existe un rol con el nombre "${name}"`);
  }
}

export class SystemRoleNotEditableError extends DomainError {
  readonly code = 'AUTH.SYSTEM_ROLE_NOT_EDITABLE';

  constructor() {
    super('El rol Super Admin no se puede editar ni borrar');
  }
}

export class RoleInUseError extends DomainError {
  readonly code = 'AUTH.ROLE_IN_USE';

  constructor() {
    super('El rol está asignado a uno o más usuarios y no se puede borrar');
  }
}

export class InvalidPermissionError extends DomainError {
  readonly code = 'AUTH.INVALID_PERMISSION';

  constructor(permission: string) {
    super(`"${permission}" no es un permiso válido`);
  }
}

export class LastSuperAdminError extends DomainError {
  readonly code = 'AUTH.LAST_SUPER_ADMIN';

  constructor() {
    super('No se puede desactivar ni quitarle el rol al último usuario Super Admin');
  }
}

export class UserStoreRoleNotFoundError extends NotFoundError {
  constructor(id?: string) {
    super('La asignación de rol', id);
  }
}

export class UserStoreRoleAlreadyExistsError extends DomainError {
  readonly code = 'AUTH.USER_STORE_ROLE_ALREADY_EXISTS';

  constructor() {
    super('El usuario ya tiene asignado ese rol en esa tienda');
  }
}
