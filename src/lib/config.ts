// Barrel re-export — all consumers continue to import from "@/lib/config"
export * from "./config-types";
export { THEMES } from "./config-defaults";
export { DEFAULT_CONFIG } from "./config-defaults";
export { loadConfig, saveConfig, loadRemoteConfig, saveRemoteConfig, isConfigured } from "./config-persistence";
