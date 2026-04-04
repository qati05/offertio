type Metadata = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";

function serialize(level: string, context: string, message: string, meta?: Metadata): string {
  return JSON.stringify({
    level,
    context,
    message,
    ...meta,
    ts: new Date().toISOString(),
  });
}

export const logger = {
  error(context: string, error: unknown, meta?: Metadata): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    if (isProduction) {
      console.error(serialize("error", context, message, { stack, ...meta }));
    } else {
      console.error(`[ERROR][${context}]`, error, meta ?? "");
    }
  },

  warn(context: string, message: string, meta?: Metadata): void {
    if (isProduction) {
      console.warn(serialize("warn", context, message, meta));
    } else {
      console.warn(`[WARN][${context}] ${message}`, meta ?? "");
    }
  },

  info(context: string, message: string, meta?: Metadata): void {
    if (isProduction) {
      console.log(serialize("info", context, message, meta));
    } else {
      console.log(`[INFO][${context}] ${message}`, meta ?? "");
    }
  },
};
