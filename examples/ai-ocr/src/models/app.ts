import type { User } from "./user";

export interface AppProps {
  user: User | null;
  token: string | null;
}
