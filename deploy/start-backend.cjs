const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

// Run the API and durable-outbox worker in one container when using a free
// web-service instance. Both stop if either process exits; the host restarts it.
const entries = [
  process.env.API_ENTRY || resolve(__dirname, "../apps/api/dist/main.js"),
  process.env.WORKER_ENTRY ||
    resolve(__dirname, "../apps/worker/dist/index.js"),
];
const children = entries.map((entry) =>
  spawn(process.execPath, [entry], { stdio: "inherit", env: process.env }),
);
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  const deadline = setTimeout(() => {
    for (const child of children)
      if (child.exitCode === null) child.kill("SIGKILL");
  }, 8000);
  deadline.unref();
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code === 0 ? 1 : (code ?? 1)));
}
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
