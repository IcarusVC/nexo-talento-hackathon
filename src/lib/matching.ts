import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ClientProfile, Listing, MatchedListing } from "@/lib/types";

/**
 * v2 matching — quota-safe reads (2026-07). The corpus grew from ~500 gerente
 * docs to ~16k across 25 hot lists, so the v1 approach ("download the whole
 * region and rank in JS") would burn the free Firestore tier (50k reads/day)
 * in a handful of dashboard loads.
 *
 * Every hard filter Firestore can index (active + region + category) is pushed
 * into ONE query, newest first, capped at MATCH_LIMIT docs. A dashboard load
 * therefore costs at most MATCH_LIMIT reads (~330 loads/day inside the free
 * tier) and a user only ever downloads listings relevant to their own profile.
 * The salary floor and the soft ranking stay in JS over that small pool.
 *
 * Firestore constraints honoured here (SDK v12):
 *  - `in` accepts ≤30 values; combining two `in` clauses multiplies into
 *    disjunctions with a hard cap of 30 total → categories go into the query
 *    only while |regiones|×|categorias| ≤ 30; beyond that (rare — profiles
 *    pick a few of each) they degrade gracefully to the JS filter over the
 *    newest MATCH_LIMIT in-region docs.
 *  - Both query shapes have composite indexes in firestore.indexes.json
 *    (active+region+createdAt and active+region+category+createdAt). Deploy
 *    indexes BEFORE shipping changes to this query.
 *
 * Scale path (NOT built here): once traffic outgrows this, precompute a
 * `matches` collection per user in a Cloud Function on listing/profile writes.
 */

/** Máx docs leídos por carga del dashboard — la tapa de la cuota gratis. */
const MATCH_LIMIT = 150;
/** Tope duro de Firestore para disyunciones combinadas de cláusulas `in`. */
const MAX_DISJUNCTIONS = 30;

export async function fetchMatchedListings(profile: ClientProfile): Promise<MatchedListing[]> {
  if (profile.regiones.length === 0) return [];

  const regiones = profile.regiones.slice(0, MAX_DISJUNCTIONS);
  const categorias = profile.categorias;
  const categoriasEnQuery =
    categorias.length > 0 && regiones.length * categorias.length <= MAX_DISJUNCTIONS;

  const listingsQuery = query(
    collection(db, "listings"),
    where("active", "==", true),
    where("region", "in", regiones),
    ...(categoriasEnQuery ? [where("category", "in", categorias)] : []),
    orderBy("createdAt", "desc"),
    limit(MATCH_LIMIT)
  );

  const snapshot = await getDocs(listingsQuery);
  const listings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Listing);

  return listings
    .filter((listing) => matchesHardFilters(listing, profile))
    .map((listing) => ({ ...listing, matchScore: scoreListing(listing, profile) }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

function matchesHardFilters(listing: Listing, profile: ClientProfile): boolean {
  // Redundante cuando `categoriasEnQuery` (ya filtró el server); necesario en el
  // fallback de perfiles con muchas regiones×categorías.
  if (!profile.categorias.includes(listing.category)) return false;

  if (profile.salary_expectation_min != null) {
    if (listing.salary_max != null && listing.salary_max < profile.salary_expectation_min) {
      return false;
    }
  }

  return true;
}

function scoreListing(listing: Listing, profile: ClientProfile): number {
  let score = 0;

  if (profile.comunas.length > 0 && profile.comunas.includes(listing.comuna)) {
    score += 2;
  }
  if (profile.contract_types.includes(listing.contract_type)) {
    score += 2;
  }
  if (profile.journada_pref && profile.journada_pref === listing.journada) {
    score += 1;
  }

  if (profile.skills.length > 0) {
    const haystack = `${listing.title} ${listing.description}`.toLowerCase();
    const hits = profile.skills.filter((skill) => haystack.includes(skill.toLowerCase()));
    score += hits.length;
  }

  return score;
}
