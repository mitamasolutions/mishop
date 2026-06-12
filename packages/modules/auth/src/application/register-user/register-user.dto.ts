export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserOutput {
  userId: string;
  email: string;
}
