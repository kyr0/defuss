/**
 * Detect development mode for dev-only warnings and logs.
 * In production builds, bundlers can dead-code eliminate based on this.
 */
export const inDevMode =
    typeof process !== "undefined" && process.env
        ? process.env.NODE_ENV !== "production"
        : false;