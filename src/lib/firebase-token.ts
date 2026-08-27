import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies a Firebase Auth ID token with `jose` instead of firebase-admin/auth.
 *
 * firebase-admin/auth cannot load on Vercel: it is kept external by Next's
 * bundler and its dependency jwks-rsa does a CommonJS require() of jose v6,
 * which is ESM-only — the whole route 500s at import time (ERR_REQUIRE_ESM).
 * Verifying the JWT directly against Google's secure-token JWKS does the same
 * check (signature, expiry, issuer, audience) without that import.
 */

const PROJECT_ID =
  process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface VerifiedFirebaseToken {
  uid: string;
  email: string | null;
}

/** Throws if the token is invalid, expired, or not issued for this project. */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  if (!PROJECT_ID) {
    throw new Error("Missing Firebase project id (FIREBASE_ADMIN_PROJECT_ID).");
  }

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ["RS256"],
  });

  if (!payload.sub) {
    throw new Error("Firebase ID token has no uid (sub claim).");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}
