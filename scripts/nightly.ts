// Entry point for both local runs (`npm run nightly`) and the Nebius Serverless Job
// container (bundled by scripts/build-job.mjs into dist-job/nightly.cjs). Accepts an
// optional --config-b64=<base64 JSON env> argument for runners that cannot pass env vars
// directly, and merges it into process.env before anything else imports env-reading code.
const arg = process.argv.find((a) => a.startsWith("--config-b64="));
if (arg) {
  try {
    const json = JSON.parse(Buffer.from(arg.split("=")[1], "base64").toString("utf8"));
    Object.assign(process.env, json);
  } catch (e) {
    console.error("Failed to parse --config-b64:", e);
  }
}

async function main() {
  const { runNightly } = await import("../src/lib/nightly");
  const summary = await runNightly();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length) {
    console.error(`Nightly run completed with ${summary.errors.length} error(s).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
