// Thrown deliberately from controllers/services. The error middleware knows how to
// turn this into a clean structured response; anything else becomes a generic 500
// with no internals leaked to the client.
export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
    this.name = "AppError";
  }
}
