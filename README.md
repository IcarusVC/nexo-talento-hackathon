# Nexo Talento — piloto para la hackatón

Conecta **ofertas → habilidades → evidencia curricular → oportunidades de experiencia**. Construido sobre TurboTrabajo y Luk Job Assistant, de Diego Ostertag, con historial, código y atribución conservados.

## Iniciar la plataforma

Requisitos: Node.js 22 o posterior y npm. La demostración nueva no necesita claves de Firebase, Flow ni servicios de IA.

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000/nexo. La portada redirige al piloto. Para una presentación con build de producción:

```sh
npm run build
npm start
```

## Qué funciona en el piloto

- Explorar oportunidades documentadas con requisitos, condiciones, fecha y enlace de origen.
- Comparar esas capacidades con 24 programas de cuatro áreas y cuatro países; conservar obligatoriedad, optativas y datos desconocidos.
- Modificar disponibilidad, experiencia y matrícula para explicar barreras de acceso.
- Registrar evidencia autodeclarada y acciones institucionales en el navegador.
- Importar JSON/JSONL de Luk y extraer habilidades, experiencia y horas explícitas mediante reglas revisables.
- Exportar el diagnóstico con sus fuentes.

Los datos de investigación tienen corte al **1 de noviembre de 2026**. Las ofertas requieren comprobar su vigencia. Los proyectos y evidencias de usuario se conservan localmente en este navegador; no son certificaciones ni expedientes institucionales compartidos.

## Usar la herramienta de Luk incorporada

Los tres paquetes originales se encuentran en `tools/luk/`. Para captura pública basta instalar el scraper en un entorno separado:

```sh
python -m venv .venv-luk
# Windows PowerShell
./.venv-luk/Scripts/python.exe -m pip install -e './tools/luk/luk-scraper[dev]'
./.venv-luk/Scripts/python.exe -m luk_scraper crawl --help
```

En macOS/Linux, usar `.venv-luk/bin/python` en lugar de la ruta de Windows. El scraper original respeta sus controles de acceso y frecuencia. Su funcionamiento depende del portal externo.

Captura acotada y adaptación por consola (la carpeta `.local-data` está excluida de Git):

```sh
./.venv-luk/Scripts/python.exe -m luk_scraper crawl --out .local-data/ofertas.jsonl --max-pages 1 --enrich-limit 2 --delay 2
npm run import:luk -- .local-data/ofertas.jsonl --out .local-data/ofertas-nexo.json
```

El adaptador no sobrescribe un archivo de salida existente. Conserva los campos desconocidos y no confirma por sí mismo la vigencia de una oferta.

Importar la salida JSONL/JSON desde **Importar Luk** en la plataforma. El ejemplo `public/examples/luk-ofertas-demo.jsonl` es deliberadamente ficticio y permanece identificado como tal después de importarlo. No usar fixtures del repositorio como ofertas reales.

El CLI y el asistente de formularios conservan sus instrucciones en `tools/luk/README.md`; requieren sus dependencias. No hacen falta para demostrar la comparación curricular.

## Comprobaciones

```sh
npx tsc --noEmit
npm test
npm run build
./.venv-luk/Scripts/python.exe -m pytest tools/luk/luk-scraper/tests -q
```

La integración continua ejecuta pruebas y compilación sin credenciales. El estado observado localmente se documenta en `docs/VERIFICACION.md` cuando termina la comprobación de esta entrega; no se presume que un workflow remoto haya pasado.

## Qué conserva TurboTrabajo

La portada original está en `/turbotrabajo`; sus rutas de usuarios, CV, postulaciones y pagos permanecen como base para evolución. Requieren **proyecto Firebase y credenciales propios**, conforme a `.env.example` y `docs/TURBOTRABAJO_ORIGINAL.md`. La ruta `/nexo` está separada de esos flujos y no realiza postulaciones, cobros ni envíos de correo.

## Límites del modelo

La extracción es determinista, con fragmentos de respaldo; no se presenta como IA entrenada. Una coincidencia de texto no demuestra dominio. Un requisito de años no implica falta de capacidad. Un dato desconocido no se transforma en cero. La clasificación debe revisarse antes de decisiones institucionales o individuales.

No hay ranking de países ni predicción de empleabilidad. La muestra documental no representa a todos los empleadores. Los internados y programas permanentes no son vacantes abiertas.

## Documentación del equipo

- [Guion para el concurso](docs/DEMO_CONCURSO.md)
- [Arquitectura y evolución](docs/ARQUITECTURA_NEXO.md)
- [Atribución y fuentes](THIRD_PARTY_NOTICES.md)
- [Proyecto TurboTrabajo original](docs/TURBOTRABAJO_ORIGINAL.md)
- [Herramientas Luk originales](tools/luk/README.md)

## Licencia

MIT; se conservan los avisos de Diego Ostertag en `LICENSE` y en los paquetes incorporados. Nombre Nexo Talento provisional.
