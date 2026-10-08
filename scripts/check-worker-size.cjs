const { readdirSync, readFileSync } = require("node:fs");
const { resolve, join } = require("node:path");
const { gzipSync } = require("node:zlib");

const root = resolve(__dirname, "../apps/web/.open-next/dry-run");
let compressed = 0;
function inspect(directory) {
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) inspect(path);
    else if (/\.(js|mjs|wasm)$/.test(file.name))
      compressed += gzipSync(readFileSync(path)).length;
  }
}
inspect(root);
if (!compressed) throw new Error("No Worker modules found in dry-run output");
console.log(
  `Worker compressed modules: ${compressed} bytes; Free plan limit: 3145728 bytes`,
);
if (compressed > 3 * 1024 * 1024)
  throw new Error(
    "Worker exceeds the Free plan upload limit; deployment stopped",
  );
