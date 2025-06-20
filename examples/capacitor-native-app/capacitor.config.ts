import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.aronhomberg.defusscapacitor",
  appName: "Defuss Capacitor",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    useLegacyBridge: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    BackgroundRunner: {
      label: "de.aronhomberg.defusscapacitor.background.task",
      src: "assets/background.js",
      event: "monitorLocation",
      repeat: true,
      interval: 16,
      autoStart: true,
    },
  },
};

export default config;
