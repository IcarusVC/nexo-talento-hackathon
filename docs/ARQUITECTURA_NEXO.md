# Arquitectura del piloto

## Base conservada

TurboTrabajo aporta Next.js App Router, React, TypeScript, componentes de interfaz, estilo, autenticación Firebase y flujos de oportunidades/postulaciones. Su historial se conserva. La portada original queda en `/turbotrabajo`; `/` abre la nueva área `/nexo`.

`tools/luk/` conserva una instantánea trazable del asistente de Luk, incluyendo los tres paquetes Python, sus pruebas y licencias. El adaptador nuevo acepta las salidas JSON/JSONL del scraper y del CLI, sin necesitar modificar sus solicitudes al portal.

## Capa añadida

- `src/lib/nexo/types.ts`: contrato de oportunidades, requisitos, evidencia curricular y condiciones del estudiante.
- `src/lib/nexo/engine.ts`: adaptación de fuentes, extracción determinista, comparación de contenido y compatibilidad explicable.
- `src/data/nexo/`: estudio público versionado. Se conserva la procedencia y las limitaciones de cada registro.
- `src/components/nexo/` y `src/app/nexo/`: flujo operativo del piloto, importación y seguimiento en navegador.
- `src/components/platform-providers.tsx`: la ruta de investigación no inicializa la autenticación del producto original; las rutas originales conservan su proveedor.

## Invariantes

Un dato desconocido no es cero. Un electivo no significa que todos los alumnos lo cursan. Evidencia curricular no equivale a competencia individual. Antigüedad requerida, tarea demostrada y oportunidad accesible son dimensiones diferentes. La primera selección semántica es una sugerencia auditable, no una homologación curricular.

## Evolución posterior al concurso

El siguiente desarrollo productivo requerirá persistencia institucional, control de acceso por rol/organización, revisión de evidencia por docentes y supervisores, ingestión programada con monitoreo de cambios y acuerdos con instituciones/empleadores. El piloto no presenta estas capacidades como implementadas.
