import { readFile } from "node:fs/promises";

const vercelConfig = JSON.parse(await readFile("vercel.json", "utf8"));
if (vercelConfig.git?.deploymentEnabled?.["database-backups"] !== false) {
  throw new Error("Vercel must not deploy the database-backups branch");
}

const backupWorkflow = await readFile(
  ".github/workflows/database-backup.yml",
  "utf8",
);
if (!backupWorkflow.includes("cp vercel.json database-backups-history/vercel.json")) {
  throw new Error("Backup workflow must copy vercel.json into the backup branch");
}
if (!backupWorkflow.includes("add latest vercel.json")) {
  throw new Error("Backup workflow must commit vercel.json with each snapshot");
}

console.log("Deployment config tests passed: backup branch deployments are disabled.");
