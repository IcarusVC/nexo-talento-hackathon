// Do NOT import "firebase-admin/auth" here: it is kept external by the
// bundler and fails to load on Vercel (jwks-rsa require()s the ESM-only jose,
// ERR_REQUIRE_ESM), which would 500 every route importing this module. ID
// tokens are verified with jose instead — see lib/firebase-token.ts.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK, used by the Flow webhook route handler to
 * credit `users/{uid}.wallet` (+ `tokenLedger`) and log `payments/{flowOrder}`
 * with elevated privileges (bypassing client security rules).
 */
function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
