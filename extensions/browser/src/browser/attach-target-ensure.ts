import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getRuntimeConfig } from "../config/config.js";
import type { ResolvedBrowserProfile } from "./config.js";

const ATTACH_ENSURE_SCRIPT_ENV = "OPENCLAW_BROWSER_ATTACH_ENSURE_SCRIPT";

function resolveAttachEnsureScriptPath(): string | null {
  const fromEnv = process.env[ATTACH_ENSURE_SCRIPT_ENV]?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const cfg = getRuntimeConfig();
    const workspace = cfg.agents?.defaults?.workspace;
    if (typeof workspace !== "string" || workspace.trim() === "") {
      return null;
    }
    const candidate = path.join(workspace, "scripts", "openclaw-browser-ensure.sh");
    return fs.existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function shouldAutoEnsureAttachTarget(profile: ResolvedBrowserProfile): boolean {
  return profile.attachOnly === true && profile.cdpIsLoopback === true && profile.cdpPort > 0;
}

export async function runAttachEnsureScript(profile: ResolvedBrowserProfile): Promise<void> {
  if (!shouldAutoEnsureAttachTarget(profile)) {
    return;
  }
  const scriptPath = resolveAttachEnsureScriptPath();
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    execFile(
      scriptPath,
      [],
      {
        env: {
          ...process.env,
          OPENCLAW_BROWSER_HOST: profile.cdpHost,
          OPENCLAW_BROWSER_PORT: String(profile.cdpPort),
          OPENCLAW_BROWSER_CDP_URL: profile.cdpUrl,
        },
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      },
    );
  });
}
