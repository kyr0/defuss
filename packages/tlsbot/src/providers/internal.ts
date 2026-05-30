import { definePlugin, issueSelfSignedFallback } from "../core.js";

/**
 * Create the internal fallback plugin.
 *
 * Generates a self-signed certificate using openssl. This plugin is always
 * last in the pipeline and ensures services have a certificate to boot with,
 * even when public trust is unavailable.
 */
export const internalPlugin = () => definePlugin({
  name: "internal",
  description: "Self-signed fallback certificate strategy.",
  async issue(ctx) {
    return issueSelfSignedFallback(ctx, "Internal fallback plugin invoked directly.");
  },
});
