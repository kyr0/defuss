/// <reference path="../.astro/types.d.ts" />
/// <reference path="astro/client" />

import type { CustomToken, UserType } from "./lib/auth";

declare global {
	namespace globalThis {
		var db: import("defuss-db/server").LibsqlProvider;
	}
	namespace App {
		/**
		 * Used by middlewares to store information, that can be read by the user via the global `Astro.locals`
		 */
		interface Locals {
			token?: CustomToken;
			userType?: UserType;
		}
	}
}
