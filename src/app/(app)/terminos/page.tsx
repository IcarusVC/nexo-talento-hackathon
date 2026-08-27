const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Servicio",
    body: "TurboTrabajo es una plataforma que te muestra ofertas de empleo compatibles con tu perfil y, a tu elección, postula por ti usando tu CV. El uso del servicio implica la aceptación de estos términos.",
  },
  {
    title: "2. Tokens y pagos",
    body: "Cada postulación consume 1 token. Los tokens se compran en paquetes a través de Flow y no tienen fecha de vencimiento. No existe suscripción ni cobro recurrente. Los tokens consumidos no son reembolsables salvo error comprobado de la plataforma.",
  },
  {
    title: "3. Tu contenido",
    body: "Eres responsable de la veracidad de la información de tu perfil y de tu CV. Nos autorizas a usar esos datos exclusivamente para mostrarte empleos y postular en tu nombre cuando lo solicites.",
  },
  {
    title: "4. Responsabilidad",
    body: "TurboTrabajo no garantiza la obtención de un empleo ni respuestas de las empresas. Actuamos como intermediario para facilitar tus postulaciones.",
  },
];

export default function TerminosPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1">✦ Legal</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">
          Términos y condiciones
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
