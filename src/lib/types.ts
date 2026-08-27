import type { Timestamp } from "firebase/firestore";
import type { ApplicationStatus, CvStatus, LedgerType } from "@/lib/constants";

export interface ClientProfile {
  regiones: string[];
  comunas: string[];
  categorias: string[];
  contract_types: string[];
  journada_pref: string | null;
  salary_expectation_min: number | null;
  skills: string[];
  resumen: string;
}

/**
 * Token wallet. `balance` = tokens free to spend; `reserved` = tokens held for
 * in-flight applications (set server-side when an apply is queued — Workstream C).
 * Available to spend = balance - reserved. Only the Flow webhook / server routes
 * (Admin SDK) ever write this; clients can read but never mutate it.
 */
export interface Wallet {
  balance: number;
  reserved: number;
}

/** Append-only audit row under `users/{uid}/tokenLedger`. Written server-side only. */
export interface TokenLedgerEntry {
  id: string;
  type: LedgerType;
  amount: number; // signed: +100 purchase, +5 trial, -1 reserve, +1 release…
  balanceAfter: number;
  flowOrder: string | null;
  applicationId: string | null;
  createdAt: Timestamp;
}

export interface CvVersionHistoryEntry {
  version: number;
  /** Null for client submissions — the PDF is emailed, not stored. */
  path: string | null;
  uploadedAt: Timestamp;
  uploadedBy: "client" | "team";
}

export interface ClientCv {
  originalPath: string | null;
  improvedPath: string | null;
  status: CvStatus;
  version: number;
  updatedAt: Timestamp | null;
  clientNote: string | null;
  history: CvVersionHistoryEntry[];
}

export interface UserDoc {
  email: string;
  displayName: string | null;
  role: "client";
  createdAt: Timestamp;
  profile: ClientProfile | null;
  wallet: Wallet;
  cv: ClientCv;
}

export interface Listing {
  id: string;
  source: string;
  source_id: string;
  title: string;
  company: string;
  region: string;
  comuna: string;
  category: string;
  contract_type: string;
  journada: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  url: string;
  active: boolean;
  createdAt: Timestamp;
}

export interface ListingPrep {
  id: string;
  question: string;
  answer: string;
}

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  at: Timestamp;
}

export interface Application {
  id: string;
  userId: string;
  listingId: string;
  listingTitle: string;
  company: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  cvVersionUsed: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  userId: string;
  flowOrder: string;
  amount: number;
  status: string;
  raw: Record<string, unknown>;
  createdAt: Timestamp;
}

/** A Listing enriched with the client-side match score used for soft ranking. */
export interface MatchedListing extends Listing {
  matchScore: number;
}
