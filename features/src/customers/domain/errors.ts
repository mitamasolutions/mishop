export class CustomerEmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Ya existe un comprador con el email ${email} en esta tienda`);
  }
}

export class CustomerNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el comprador ${id}`);
  }
}

export class CustomerAddressNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la dirección ${id}`);
  }
}
