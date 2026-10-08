const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const url = new URL(process.env.API_URL || "");
if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  /^(localhost|127\.|\[::1\])/.test(url.hostname)
) {
  throw new Error(
    "API_URL must be an HTTPS backend origin without credentials or paths",
  );
}
const path = resolve(__dirname, "../apps/web/wrangler.jsonc");
const config = JSON.parse(readFileSync(path, "utf8"));
config.vars.API_URL = url.origin;
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
