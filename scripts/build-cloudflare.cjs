const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["exec", "--", "opennextjs-cloudflare", "build"],
  {
    cwd: resolve(__dirname, "../apps/web"),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      CLOUDFLARE_DEPLOY: "true",
      NEXT_PUBLIC_API_URL: "",
      NEXT_PUBLIC_DEMO_PAYMENTS: "false",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
