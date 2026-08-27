import { FirebaseError } from "firebase/app";

/**
 * Maps Firebase Auth error codes to specific, actionable Spanish messages.
 *
 * Firebase enables email-enumeration protection by default, so a failed
 * email/password sign-in returns `auth/invalid-credential` for BOTH a
 * wrong password and a non-existent account — and for accounts that only
 * have the Google provider (no password). We therefore can't distinguish
 * those cases client-side, so the login message covers all three: check the
 * credentials, try Google, or reset the password.
 */
export function authErrorMessage(err: unknown, mode: "login" | "register" | "reset"): string {
  const code = err instanceof FirebaseError ? err.code : "";

  switch (code) {
    case "auth/invalid-email":
      return "El correo no tiene un formato válido.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada. Escríbenos si crees que es un error.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "Problema de conexión. Revisa tu internet e inténtalo de nuevo.";
    case "auth/operation-not-allowed":
      return "Este método de inicio de sesión no está habilitado. Avísanos, por favor.";
  }

  if (mode === "login") {
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found"
    ) {
      return 'Correo o contraseña incorrectos. Si te registraste con Google, usa "Continuar con Google". ¿Olvidaste tu contraseña? Toca "Restablecer".';
    }
    return "No pudimos iniciar sesión. Inténtalo de nuevo.";
  }

  if (mode === "register") {
    if (code === "auth/email-already-in-use") {
      return "Ya existe una cuenta con este correo. Inicia sesión (o entra con Google si te registraste así).";
    }
    if (code === "auth/weak-password") {
      return "La contraseña es muy débil: usa al menos 6 caracteres.";
    }
    return "No pudimos crear tu cuenta. Verifica los datos e inténtalo de nuevo.";
  }

  // mode === "reset"
  return "No pudimos enviar el correo de restablecimiento. Inténtalo de nuevo.";
}
