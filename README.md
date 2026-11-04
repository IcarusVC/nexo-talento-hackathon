# Skill path

Plataforma de demostración con cuatro experiencias conectadas: candidato, reclutador, supervisor e institución formadora. El candidato construye su perfil y evidencias, encuentra requisitos de cargos y formación relacionada; las empresas gestionan su embudo y las instituciones su catálogo y evaluaciones.

Los convenios Platzi/U. de Chile, el descuento ilustrativo y la agenda de actividades son ficticios, según la aclaración del usuario. Esta ampliación tiene datos y persistencia propios; no representa una afiliación comercial ni tramita inscripciones externas.

El MVP original de la Prueba 2 sigue disponible en `/skill-path/brief`: utiliza exclusivamente los cuatro CSV entregados, con 60 vacantes, 500 postulaciones, 1.500 eventos y 60 cuentas. Sus archivos y trazabilidad se conservan intactos.

## Abrir Skill path

Con Node.js 22 o posterior: ejecutar `npm ci` y `npm run dev -- --hostname 127.0.0.1`. Abrir [Skill path](http://127.0.0.1:3000/skill-path). La portada redirige a esta ruta. Para compilar: `npm run build` y `npm run start -- --hostname 127.0.0.1`. No requiere claves de Firebase, servicios de IA ni correo.

El selector de cuentas simula la identidad según permite el brief. No es autenticación productiva; el servidor comprueba los permisos y el alcance en cada lectura y acción. Usa una sola instancia para la persistencia local de la demo.

## Recorrido del producto

Abrir `/skill-path/producto` y usar el selector de cuentas ficticias:

| Perfil | Cuenta | Recorrido |
| --- | --- | --- |
| Candidato | SP-CAND-01 | Completar perfil, agregar experiencia/proyecto, elegir meta, contrastar requisitos, postular y solicitar formación. |
| Reclutador | SP-REC-01 | Publicar vacante, gestionar embudo y revisar experiencia dirigida a su empresa. |
| Supervisor | SP-SUP-01 | Revisar equipo, entrevistas y pendientes; definir habilidades base y recomendadas. |
| Formación: Platzi | SP-EDU-01 | Publicar cursos, consultar demanda agregada y gestionar sus participantes. |
| Formación: U. de Chile | SP-EDU-02 | Publicar certificaciones, postgrados y actividades; registrar evaluaciones. |

Las cuentas adicionales permiten comprobar los límites de empresa y de propietario. No son credenciales de acceso productivo. Una habilidad declarada o un documento adjunto permanece pendiente de acreditación; sólo una acción autorizada registra la evaluación y su autor. Compartir habilidades con un aviso no garantiza contratación. Una solicitud de formación queda dentro de la demo.

API `/api/skill-path-product`, persistencia `.local/skill-path-product`, contrato `src/lib/skill-path-product/types.ts`. [Alcance autorizado](docs/skill-path-product/ALCANCE.md) · [Matriz del producto](docs/skill-path-product/REQUISITOS.json) · [Verificación](docs/skill-path-product/VERIFICACION.md).

## Recorrido del caso original del brief

Abrir `/skill-path/brief`:

1. **USR-001, Candidato:** sus postulaciones, estado, fecha, fuente y próximo paso; puede solicitar una corrección propia.
2. **USR-025, Reclutador:** VAC-001 y sus postulaciones por asignación y empresa. Cambiar una etapa con motivo y confirmación humana; revisar el evento nuevo y recargar.
3. Consultar alertas de antigüedad, vigencia y revisión. Derivar un caso sin cambiar su estado.
4. **USR-035, Representante:** ver EMP-001, sus métricas y solicitar pausa/cierre sin ejecutar acciones denegadas.
5. **USR-047, Administrador**, **USR-051, Orientador** y las cuentas de **Revisor humano:** comprobar alcance y acciones por rol. El administrador no decide selección.

Las anomalías son intencionales. Un vacío no significa rechazo ni falta de contacto. Si la intersección de permisos no contiene registros, se muestra una lista vacía; no se amplía acceso para llenar la pantalla.

La API está bajo `/api/skill-path`. Los originales están en `data/skill-path/source/` y el historial local en `.local/skill-path/ledger.json`, excluido de Git. Versión e idempotencia controlan cambios y reintentos en una sola instancia. No hay envíos reales, scraping, ranking ni decisiones automatizadas en este módulo.

[Arquitectura](docs/skill-path/ARQUITECTURA.md) · [Contrato API](docs/skill-path/API.md) · [Requisitos](docs/skill-path/REQUISITOS.json) · [Verificación](docs/skill-path/VERIFICACION.md)

## Agente framework

El [Guardián de Skill path](.agents/skills/skillpath-guardian/SKILL.md) conecta cada requisito con código y evidencia. Está versionado en el proyecto y referenciado por `AGENTS.md`. Puedes pedir: «Usa el guardián de Skill path para encontrar lo que falta del brief y avanzar con implementación y pruebas».

Ejecutar `npm run skillpath:guard -- --inventory` durante el desarrollo; `npm run skillpath:check` para control documental, tipos y pruebas del módulo; `npm test` para la regresión completa. El guardián no vigila en segundo plano ni sustituye las pruebas funcionales.

## Piloto anterior de investigación

El contenido siguiente corresponde a `/nexo`, conservado como módulo separado. Sus fuentes reales no forman parte de Skill path ni de la demostración evaluada. Construido sobre TurboTrabajo y Luk Job Assistant, de Diego Ostertag, con historial, código y atribución conservados.

## Iniciar la plataforma

Requisitos: Node.js 22 o posterior y npm. La demostración nueva no necesita claves de Firebase, Flow ni servicios de IA.

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000/nexo para ese módulo histórico. La portada actual abre Skill path. Para una presentación con build de producción:

```sh
npm run build
npm start
```

## Qué funciona en el piloto

- **Mi próximo paso:** búsqueda real de cargos en Chile desde la pantalla mediante la API pública de Get on Board, sin copiar archivos ni configurar claves.
- Elegir un cargo objetivo, revisar habilidades sin evidencia en el perfil y consultar formación universitaria relacionada.
- Consultar siete publicaciones reales con salario y ocho cursos de tres universidades, con fecha, requisitos, precio y credencial cuando se publican.
- Separar salarios por país, moneda, período, nivel, tipo de puesto y base bruto/líquido. No atribuir una renta a una habilidad aislada.
- Explorar oportunidades documentadas con requisitos, condiciones, fecha y enlace de origen.
- Comparar esas capacidades con 24 programas de cuatro áreas y cuatro países; conservar obligatoriedad, optativas y datos desconocidos.
- Modificar disponibilidad, experiencia y matrícula para explicar barreras de acceso.
- Registrar evidencia autodeclarada y acciones institucionales en el navegador.
- Importar JSON/JSONL de Luk y extraer habilidades, experiencia y horas explícitas mediante reglas revisables.
- Exportar el diagnóstico con sus fuentes.

Los datos de investigación tienen corte al **1 de noviembre de 2026**. Las ofertas requieren comprobar su vigencia. Los proyectos y evidencias de usuario se conservan localmente en este navegador; no son certificaciones ni expedientes institucionales compartidos.

El catálogo de formación y las siete referencias salariales se revisaron el **3 de noviembre de 2026 en Chile** (4 de noviembre UTC). Son una selección documental acotada; cada búsqueda conserva su propia fecha y fuente. Las universidades no se consultan automáticamente en cada búsqueda: las coincidencias usan el catálogo oficial revisado y exponen sus límites.

El buscador consulta la [API oficial de Get on Board](https://www.getonbrd.com/doc/openapi.yaml): una página con hasta 30 ofertas por consulta, filtro de país Chile y límite de respuesta de 15 segundos. La ciudad es un filtro textual de esa página. Reutiliza capturas durante diez minutos y respeta las restricciones de frecuencia del proveedor. Su cobertura se concentra en tecnología y áreas relacionadas. Un resultado vacío no demuestra ausencia de empleos.

Los rangos salariales de la API no identifican por sí solos el período de pago. Se muestran con esa condición pendiente y se excluyen de la comparación numérica; no se convierten a pesos ni se les asigna una periodicidad. Las siete referencias iniciales sí tienen período verificado en sus páginas originales. Véase [método y fuentes salariales](docs/FUENTES_MERCADO.md).

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

El conector propio `tools/luk/nexo-search.py` conserva una integración acotada con Luk y sus parsers. La búsqueda por cargo fue rechazada por ese portal durante la verificación y se detuvo. El botón actual usa exclusivamente la API independiente de Get on Board: no reintenta Luk ni lo utiliza como respaldo. La ruta `POST /api/nexo/search` sólo acepta solicitudes del origen local de la demo. Un despliegue público necesita control de acceso y operación propios.

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
- [Formación universitaria y fuentes](docs/FUENTES_FORMACION.md)
- [Referencias salariales y método](docs/FUENTES_MERCADO.md)
- [Atribución y fuentes](THIRD_PARTY_NOTICES.md)
- [Proyecto TurboTrabajo original](docs/TURBOTRABAJO_ORIGINAL.md)
- [Herramientas Luk originales](tools/luk/README.md)

## Licencia

MIT; se conservan los avisos de Diego Ostertag en `LICENSE` y en los paquetes incorporados. Nombre Nexo Talento provisional.
