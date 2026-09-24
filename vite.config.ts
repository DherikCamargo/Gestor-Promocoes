import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

// Hospedagem própria na Cloudflare (GitHub Actions): definida só quando CF_D1_DATABASE_ID existe.
// Sem essas variáveis o build fica igual ao do ChatGPT Sites.
const ownDatabaseId = process.env.CF_D1_DATABASE_ID;
const ownVars = ["CF_WORKER_NAME", "CF_D1_DATABASE_NAME", "PUBLIC_ORIGIN", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "ML_CLIENT_ID"] as const;
if (ownDatabaseId) {
  const missing = ownVars.filter((name) => !process.env[name]);
  if (missing.length) throw new Error("Hospedagem própria sem configuração: " + missing.join(", "));
}
// Validado acima: com CF_D1_DATABASE_ID definido, todas as variáveis existem.
const own = (name: (typeof ownVars)[number]) => process.env[name] as string;
const ownHosting = ownDatabaseId
  ? {
      name: own("CF_WORKER_NAME"),
      vars: {
        AUTH_MODE: "cloudflare-access",
        PUBLIC_ORIGIN: own("PUBLIC_ORIGIN"),
        CF_ACCESS_TEAM_DOMAIN: own("CF_ACCESS_TEAM_DOMAIN"),
        CF_ACCESS_AUD: own("CF_ACCESS_AUD"),
        ML_CLIENT_ID: own("ML_CLIENT_ID"),
        PARTICIPATION_ENABLED: process.env.PARTICIPATION_ENABLED === "true" ? "true" : "false",
      },
    }
  : {};

const localBindingConfig = {
  main: "vinext/server/fetch-handler",
  compatibility_flags: ["nodejs_compat"],
  ...ownHosting,
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: ownDatabaseId ? own("CF_D1_DATABASE_NAME") : "site-creator-d1",
          database_id: ownDatabaseId ?? SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] } : {}),
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
    },
    plugins: [
      vinext(),
      sites({ mockAuth: !managedLinux }),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
