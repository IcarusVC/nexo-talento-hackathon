"use client"; // Error boundaries must be Client Components

/**
 * Last-resort boundary: replaces the root layout when it fails, so it must
 * render its own <html>/<body> and be self-contained (inline styles only —
 * globals.css is not applied here).
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es-CL">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#16264b",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
            Tuvimos un problema al cargar TurboTrabajo. Inténtalo de nuevo.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "10px 20px",
              borderRadius: 9999,
              border: "2px solid #16264b",
              background: "#ff6b5e",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
