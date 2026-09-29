import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = fileURLToPath(new URL("../", import.meta.url));
const extension = path.join(root, "extension");
const manifest = JSON.parse(await readFile(path.join(extension, "manifest.json"), "utf8"));
const files = {};
async function collect(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute, relative + "/");
    else if (entry.isFile()) files[relative] = new Uint8Array(await readFile(absolute));
  }
}
await collect(extension);
await mkdir(path.join(root, "dist"), { recursive: true });
const destination = path.join(root, "dist", `youtube-hold-speed-v${manifest.version}.zip`);
await writeFile(destination, zipSync(files, { level: 9 }));
console.log(`Created ${destination}`);
