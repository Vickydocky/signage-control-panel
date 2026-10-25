export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export const notFound = (what = "Resource") =>
  new AppError(404, "NOT_FOUND", `${what} not found`);
export const badRequest = (msg: string) =>
  new AppError(400, "BAD_REQUEST", msg);
export const unauthorized = (msg = "Unauthorized") =>
  new AppError(401, "UNAUTHORIZED", msg);
export const conflict = (msg: string) => new AppError(409, "CONFLICT", msg);

/** Terjemahkan error Supabase/Postgres ke AppError yang aman dikirim ke client */
export function fromDbError(error: {
  message: string;
  code?: string;
}): AppError {
  if (error.code === "23505") return conflict("Resource already exists");
  if (error.code === "22P02") return badRequest("Invalid identifier");
  if (error.code === "23503")
    return badRequest("Referenced resource does not exist");
  return new AppError(500, "DB_ERROR", "Database error", error);
}
