const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawn } = require("node:child_process");
const { mkdtempSync, writeFileSync, readFileSync, existsSync, unlinkSync, rmdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { once } = require("node:events");

async function fixture(fail) {
  const folder = mkdtempSync(join(tmpdir(), "tripora-supervisor-"));
  const ready = join(folder, "ready");
  const api = join(folder, "api.cjs");
  const worker = join(folder, "worker.cjs");
  writeFileSync(api, `require('node:fs').writeFileSync(process.env.READY, String(process.pid)); process.on('SIGTERM',()=>process.exit(0)); setInterval(()=>{},1000);`);
  writeFileSync(worker, fail
    ? `setInterval(()=>{if(require('node:fs').existsSync(process.env.READY))process.exit(7);},20);`
    : `process.on('SIGTERM',()=>process.exit(0)); setInterval(()=>{},1000);`);
  const child = spawn(process.execPath, [resolve(__dirname, "../deploy/start-backend.cjs")], {
    env: { ...process.env, API_ENTRY: api, WORKER_ENTRY: worker, READY: ready },
    stdio: "ignore",
  });
  return {
    child,
    ready,
    cleanup() {
      if (child.exitCode === null) child.kill();
      for (const file of [ready, api, worker]) if (existsSync(file)) unlinkSync(file);
      rmdirSync(folder);
    },
  };
}

test("Worker failure stops the API and preserves the failure exit code", { timeout: 15000 }, async () => {
  const f = await fixture(true);
  try {
    const [code] = await once(f.child, "exit");
    assert.equal(code, 7);
    const pid = Number(readFileSync(f.ready, "utf8"));
    assert.throws(() => process.kill(pid, 0));
  } finally { f.cleanup(); }
});

test("Platform SIGTERM shuts down the service cleanly", { timeout: 15000, skip: process.platform === "win32" }, async () => {
  const f = await fixture(false);
  try {
    for (let i = 0; !existsSync(f.ready) && i < 200; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(existsSync(f.ready));
    const exited = once(f.child, "exit");
    f.child.kill("SIGTERM");
    const [code] = await exited;
    assert.equal(code, 0);
    assert.throws(() => process.kill(Number(readFileSync(f.ready, "utf8")), 0));
  } finally { f.cleanup(); }
});
