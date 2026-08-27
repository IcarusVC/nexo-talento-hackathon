import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Empleos", href: "/dashboard" },
      { label: "Mis postulaciones", href: "/applications" },
      { label: "Mi CV", href: "/cv" },
      { label: "Tokens", href: "/tokens" },
      { label: "Preferencias", href: "/preferences" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "Centro de ayuda", href: "/ayuda" },
      { label: "Preguntas frecuentes", href: "/ayuda#faq" },
      { label: "Contacto", href: "mailto:soporte@turbotrabajo.cl" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Nosotros", href: "/ayuda#nosotros" },
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Privacidad", href: "/privacidad" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-lg font-extrabold text-brand-navy">
            Turbo
            <span className="text-brand-coral">Trabajo</span>
          </Link>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Postulamos por ti a los empleos que calzan con tu perfil. Hecho en Chile, para Chile.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {column.title}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-brand-coral hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto w-full max-w-5xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} TurboTrabajo. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
