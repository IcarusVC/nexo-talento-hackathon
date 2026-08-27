/**
 * One-off seed script for local/dev environments. Populates `listings` plus
 * a couple of `prep` subcollection docs so the matching + interview-prep
 * flows have something to show. In production the team populates `listings`
 * by hand from the Firestore console — this script is not part of that
 * workflow, it only bootstraps a dev environment.
 *
 * Usage: npx tsx scripts/seed-listings.ts
 * Requires the same FIREBASE_ADMIN_* env vars as the app (see .env.example).
 */
import "dotenv/config";
import { getAdminDb } from "../src/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const sampleListings = [
  {
    source: "manual",
    source_id: "seed-001",
    title: "Ejecutivo/a de Atención al Cliente",
    company: "Retail Sur SpA",
    region: "Metropolitana",
    comuna: "Santiago",
    category: "Atención al Cliente",
    contract_type: "Contrato indefinido",
    journada: "Jornada Completa",
    salary_min: 600000,
    salary_max: 750000,
    description:
      "Atención presencial y telefónica a clientes, resolución de reclamos y manejo de caja. Se valora experiencia en retail.",
    url: "https://example.com/empleos/seed-001",
    active: true,
  },
  {
    source: "manual",
    source_id: "seed-002",
    title: "Analista Contable Junior",
    company: "Contadores Asociados Ltda.",
    region: "Metropolitana",
    comuna: "Providencia",
    category: "Contabilidad y Finanzas",
    contract_type: "Contrato a plazo fijo",
    journada: "Jornada Completa",
    salary_min: 750000,
    salary_max: 950000,
    description:
      "Conciliaciones bancarias, registro de facturas y apoyo en cierre mensual. Excel intermedio y conocimientos de SII.",
    url: "https://example.com/empleos/seed-002",
    active: true,
  },
  {
    source: "manual",
    source_id: "seed-003",
    title: "Desarrollador/a Frontend",
    company: "Tech Andes",
    region: "Valparaíso",
    comuna: "Viña del Mar",
    category: "Tecnología e Informática",
    contract_type: "Contrato indefinido",
    journada: "Teletrabajo",
    salary_min: 1300000,
    salary_max: 1800000,
    description: "React, TypeScript y consumo de APIs REST. Trabajo 100% remoto.",
    url: "https://example.com/empleos/seed-003",
    active: true,
  },
  {
    source: "manual",
    source_id: "seed-004",
    title: "Operario/a de Bodega",
    company: "Logística Norte",
    region: "Antofagasta",
    comuna: "Antofagasta",
    category: "Logística y Bodega",
    contract_type: "Por obra o faena",
    journada: "Jornada Completa",
    salary_min: 550000,
    salary_max: 620000,
    description: "Recepción y despacho de mercadería, manejo de grúa horquilla (deseable).",
    url: "https://example.com/empleos/seed-004",
    active: true,
  },
];

const samplePrep = [
  {
    question: "¿Por qué quieres trabajar en esta empresa?",
    answer:
      "Conecta tu respuesta con algo concreto de la empresa (su rubro, su cultura o un proyecto público) y con tu experiencia previa relevante.",
  },
  {
    question: "Cuéntame de una vez que resolviste un conflicto con un cliente.",
    answer:
      "Usa la estructura situación-acción-resultado: describe el problema, qué hiciste tú específicamente, y el resultado medible.",
  },
];

async function main() {
  const db = getAdminDb();
  const batch = db.batch();

  for (const listing of sampleListings) {
    const ref = db.collection("listings").doc();
    batch.set(ref, { ...listing, createdAt: FieldValue.serverTimestamp() });
  }

  await batch.commit();

  // Attach prep Q&A to the first listing as an example.
  const firstListing = await db
    .collection("listings")
    .where("source_id", "==", "seed-001")
    .limit(1)
    .get();

  if (!firstListing.empty) {
    const prepBatch = db.batch();
    for (const qa of samplePrep) {
      const ref = firstListing.docs[0].ref.collection("prep").doc();
      prepBatch.set(ref, qa);
    }
    await prepBatch.commit();
  }

  console.log(`Seeded ${sampleListings.length} listings and ${samplePrep.length} prep docs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
