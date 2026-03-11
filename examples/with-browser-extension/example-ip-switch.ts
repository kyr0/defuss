/**
 * Example: PIA VPN IP switching
 *
 * Connects to a random (or specified) PIA region and prints the new IP.
 *
 * Run with:  tsx example-ip-switch.ts [region]
 */
import { switchIp } from "./src/server/vpn/pia.js";

const region = process.argv[2]; // optional: e.g. "us-east"

console.log(
  `Switching IP${region ? ` to region "${region}"` : " to a random region"}…`,
);

try {
  const result = await switchIp(region || undefined);
  console.log(`Connected — region: ${result.region}, ip: ${result.ip}`);
} catch (error) {
  console.error("IP switch failed:", (error as Error).message);
  process.exit(1);
}
