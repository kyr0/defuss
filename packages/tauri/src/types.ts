export type DefussTauriCommand = "init" | "build" | "dev" | "doctor";
export type DefussTauriPlatform = "macos" | "windows" | "linux" | "native";

export interface DefussTauriWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  fullscreen?: boolean;
}

export interface DefussTauriOptions {
  command?: DefussTauriCommand;
  projectDir: string;
  platform?: DefussTauriPlatform;
  target?: string;
  port?: number;
  host?: string;
  appName?: string;
  identifier?: string;
  version?: string;
  ssgOutput?: string;
  managedDirName?: string;
  tauriOutDir?: string;
  tauriOutDevDir?: string;
  skipSsg?: boolean;
  skipInstall?: boolean;
  skipNode?: boolean;
  skipSsgInstall?: boolean;
  debug?: boolean;
  dangerouslyPermissive?: boolean;
  dryRun?: boolean;
  nodeVersion?: string;
  nodeDistBaseUrl?: string;
  window?: DefussTauriWindowOptions;
}

export interface PreparedTauriProject {
  projectDir: string;
  managedDir: string;
  srcTauriDir: string;
  frontendDist: string;
  appStageDir: string;
  nodeResourcesDir: string;
  nodeSidecarBase: string;
  nodeSidecarPath: string;
  nodeCacheDir: string;
  tauriBundleDir: string;
  distributionDir: string;
  productName: string;
  identifier: string;
  version: string;
  devUrl: string;
  host: string;
  port: number;
  targetTriple: string;
}

export interface RunResult {
  code: "OK" | "FAILED";
  message: string;
  prepared?: PreparedTauriProject;
}
