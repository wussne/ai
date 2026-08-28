export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const isDatabaseConstraintError = (error: unknown): error is {code: string} =>
  typeof error === 'object' && error !== null && 'code' in error;
