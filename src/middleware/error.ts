import type { Context, Next } from 'hono';

export async function errorHandler(c: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${new Date().toISOString()}] Error:`, message);

    c.status(500);
    c.json({
      error: 'internal_error',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
    });
  }
}
