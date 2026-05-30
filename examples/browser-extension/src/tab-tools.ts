/**
 * Content-script tool registrations.
 *
 * Import this module once (e.g. from tab-rpc.ts) to make all
 * content-script-side tools available via the tool registry.
 */
import { registerContentScriptTool } from "./lib/content-script/tool-registry";
import { GoogleSearchContentScriptTool } from "./tools/google-search";
import { ArztSucheContentScriptTool } from "./tools/116117-arztsuche";

registerContentScriptTool(GoogleSearchContentScriptTool);
registerContentScriptTool(ArztSucheContentScriptTool);
