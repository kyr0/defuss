export interface Config {
  /** The endpoint URL of the server */
  serverEndpoint: string;
  /** The interval in milliseconds for polling server tasks */
  serverTaskPollingIntervalMs: number;
}

export default {
  serverEndpoint: "http://localhost:3210",
  serverTaskPollingIntervalMs: 5000,
} as Config;
