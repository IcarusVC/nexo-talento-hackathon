import { readFile, access, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative, isAbsolute } from "node:path";

const root = process.cwd();
const errors = [];
const inventory = process.argv.includes("--inventory");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const manifest = await readJson("docs/skill-path/FUENTES.json");
let intact = 0;
for (const source of manifest.files) {
  const bytes = await readFile(resolve(root, "data/skill-path/source", source.file));
  if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) errors.push(`CSV original alterado: ${source.file}`);
  else intact++;
}
const matrix = await readJson("docs/skill-path/REQUISITOS.json");
const ids = new Set();
for (const item of matrix.requirements) {
  if (!item.id || ids.has(item.id)) errors.push(`ID vacío o repetido: ${item.id}`);
  ids.add(item.id);
  if (!item.source || !item.acceptance || !item.owner) errors.push(`Requisito incompleto: ${item.id}`);
  if (!["pendiente", "implementado", "verificado"].includes(item.status)) errors.push(`Estado inválido: ${item.id}`);
  if (item.status === "verificado" && !item.evidence?.length) errors.push(`Sin evidencia: ${item.id}`);
  for (const path of item.evidence || []) {
    const target = resolve(root, path);
    const inside = relative(root, target);
    if (inside.startsWith("..") || isAbsolute(inside)) { errors.push(`Evidencia fuera del repositorio: ${path}`); continue; }
    try { await access(target); } catch { errors.push(`Evidencia ausente: ${path}`); }
  }
  if (!inventory && item.status !== "verificado") errors.push(`Falta validar ${item.id}: ${item.title}`);
}
const walk = async (path) => {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (/\.(tsx?|mjs)$/.test(file)) files.push(file);
  }
  return files;
};
for (const folder of ["src/lib/skill-path", "src/components/skill-path", "src/app/skill-path", "src/app/api/skill-path"]) {
  try {
    for (const file of await walk(resolve(root, folder))) {
      const text = await readFile(file, "utf8");
      if (/from\s+["'][^"']*(?:lib\/nexo|data\/nexo|firebase)[^"']*["']/.test(text)) errors.push(`Dependencia fuera del brief: ${relative(root, file)}`);
    }
  } catch { errors.push(`Módulo faltante: ${folder}`); }
}
console.log(`Skill path · ${intact}/${manifest.files.length} fuentes intactas · ${ids.size} requisitos registrados`);
console.log("Este control verifica integridad y referencias; las pruebas funcionales se documentan por separado.");
if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else console.log("Control documental aprobado.");
