import type { User } from "./user";
import type { Tenant } from "./tenant";

export interface AppProps {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
}
