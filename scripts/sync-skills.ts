import fs from "node:fs/promises";
import path from "node:path";

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, ".agents", "skills");
  const destDir = path.join(rootDir, ".claude", "skills");

  try {
    await fs.rm(destDir, { recursive: true, force: true }).catch(() => {});
    await copyDir(srcDir, destDir);
    console.log(`Synced skills from ${srcDir} to ${destDir}`);
  } catch (err) {
    console.error("Failed to sync skills:", err);
    process.exit(1);
  }
}

main();
