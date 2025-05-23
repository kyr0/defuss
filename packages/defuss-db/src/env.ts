import { config } from "dotenv";

config();

export const getEnv = (name: string): string | undefined =>
  import.meta && (import.meta as any).env && (import.meta as any).env[name]
    ? (import.meta as any).env[name]
    : process.env[name];
