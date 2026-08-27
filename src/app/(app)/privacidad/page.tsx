const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Datos que recopilamos",
    body: "Recopilamos los datos de tu cuenta (correo y nombre), tu perfil de búsqueda (regiones, categorías, expectativas de renta, habilidades) y el CV que subes.",
  },
  {
    title: "2. Cómo usamos tus datos",
    body: "Usamos tu perfil y tu CV para calcular qué empleos calzan contigo y para postular en tu nombre cuando lo solicitas. No vendemos tus datos a terceros.",
  },
  {
    title: "3. Con quién los compartimos",
    body: "Compartimos tu CV y los datos necesarios con las empresas a cuyas ofertas postulas. Los pagos se procesan a través de Flow, que recibe solo los datos requeridos para la transacción.",
  },
  {
    title: "4. Tus derechos",
    body: "Puedes acceder, corregir o eliminar tus datos en cualquier momento desde tus preferencias, o escribiéndonos a soporte@turbotrabajo.cl.",
  },
];

export default function PrivacidadPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1">✦ Legal</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">
          Política de privacidad
        </h1>
        <p className="mt-1 text-sm text-brand-navy/60">Última actualización: junio 2026.</p>
      </div>
      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-extrabold text-brand-navy">{section.title}</h2>
            <p className="mt-1 text-sm leading-6 text-brand-navy/70">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
