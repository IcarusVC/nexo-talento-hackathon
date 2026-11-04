/** Offline adapter from Luk JSON/JSONL exports to the Nexo opportunity model. */
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseLukImport } from "../src/lib/nexo/engine";

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  if (!args[0] || outIndex < 1 || !args[outIndex + 1] || args.length !== 3) {
    console.error("Uso: npx tsx scripts/nexo-import.ts ofertas.jsonl --out oportunidades.json");
    process.exitCode = 1;
    return;
  }
  const input = resolve(args[0]);
  const output = resolve(args[outIndex + 1]);
  if (input === output) throw new Error("La salida debe ser distinta del archivo original.");
  if ((await stat(input)).size > 2 * 1024 * 1024) throw new Error("El archivo supera el máximo de 2 MB.");
  const result = parseLukImport(await readFile(input, "utf8"));
  if (!result.opportunities.length) {
    result.errors.forEach((message) => console.error(message));
    process.exitCode = 1;
    return;
  }
  // Exclusive creation avoids silently replacing prior evidence exports.
  await writeFile(output, JSON.stringify({ importedAt: new Date().toISOString(), ...result }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  console.log(`${result.opportunities.length} registros adaptados; ${result.errors.length} errores de fila; ${result.warnings.length} observaciones.`);
  console.log("No se consultó Luk ni se confirmó la vigencia de las ofertas.");
  if (result.errors.length) process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo importar el archivo.");
  process.exitCode = 1;
});
