# Contrato de Skill path

La API usa exclusivamente las cuatro bases sintéticas de la Prueba 2. El selector de cuentas es un mecanismo de demostración, no autenticación productiva. Los tipos públicos están en `src/lib/skill-path/types.ts`.

- `GET /api/skill-path/accounts` → `{ accounts: AccountSummary[] }`. Sólo ID, nombre ficticio y rol para el selector.
- `GET /api/skill-path/workspace?accountId=USR-001` → `WorkspaceView`. Visibilidad y permisos aplicados en servidor; nunca se entrega la base completa al cliente para filtrarla.
- `POST /api/skill-path/actions` → `ActionResponse`. Body `ActionInput`; respuesta de error `{ error, code }`. Requiere JSON y mismo origen. Después de éxito, recargar workspace.

Las acciones reciben `accountId`, `expectedVersion` (workspace.version), `idempotencyKey` único por intención y `note` de al menos 8 caracteres. El servidor asigna actor, fecha, estado anterior, estado nuevo y origen; no los acepta del navegador. Un conflicto de versión responde 409 y requiere recargar.

| Acción | Destino y parámetros | Restricción |
|---|---|---|
| change_state | applicationId, newState, humanConfirmed=true | Reclutador asignado, permiso y transición esperada |
| correct_state | applicationId, newState, humanConfirmed=true | Reclutador, corrección autorizada, motivo obligatorio |
| request_correction | applicationId | Candidato propietario; sólo solicitud, no modifica decisiones |
| refer_review | applicationId | Rol interno con visibilidad; agrega derivación sin decisión |
| resolve_review | applicationId, resolution=reviewed o needs_information | Revisor humano en su subcartera; no cambia etapa |
| remind | applicationId | Permiso automatización; recordatorio local auditable sin envío real |
| request_vacancy_pause / request_vacancy_close | vacancyId | Representante de la empresa sin permiso directo; registra solicitud |
| pause_vacancy / close_vacancy | vacancyId, humanConfirmed=true | Reclutador asignado con permiso; conserva postulaciones y bitácora |
| correct_information | applicationId, field, value | Reclutador, administrador técnico o revisor, según alcance; no decide etapa |

`allowedActions` de cada registro gobierna los controles de la UI; el servidor vuelve a verificarlo. `availableTransitions` se usa para cambio de etapa; la corrección manual acepta un estado publicado distinto con motivo y confirmación explícita. Administrador y revisor no toman decisiones de selección aunque puedan corregir información.

`signals` conserva clasificación textual (`confirmed`, `inferred`, `stale`, `missing`); las alertas no sustituyen `state`. `metrics=[]` si la cuenta no tiene permiso; toda métrica usa sólo registros visibles. Los eventos internos no se entregan al candidato; recibe estado, fecha, fuente, comunicación y próximo paso propios. No se borran CSV ni eventos. Las solicitudes de candidato no implican cambios automáticos.

Persistencia del piloto: bitácora adicional en `.local/skill-path/ledger.json`; escritura atómica, control de versión e idempotencia en un único proceso Node. No sustituye una base transaccional multiinstancia. La fecha operacional es el día actual de Chile; pruebas inyectan una fecha fija.

## Decisiones verificables

- Los reclutadores necesitan simultáneamente asignación por `reclutador_id` y empresa en su cartera. Por eso USR-025 ve VAC-001 y USR-030 no tiene vacantes visibles en este paquete; no se amplían permisos para llenar la pantalla.
- El revisor necesita la marca original de revisión o una derivación persistida, además de su subcartera. Una alerta inferida no concede acceso por sí sola. La resolución puede quedar atendida y conservar alertas históricas; una discrepancia no se corrige cambiando silenciosamente el estado.
- Los identificadores de candidatos se ocultan al representante también dentro de eventos y solicitudes. Las métricas y contadores se calculan sobre la proyección visible. Los totales de los archivos se exponen únicamente al administrador técnico.
- La antigüedad toma el máximo de fecha de actualización y eventos de la base original. Los recordatorios, solicitudes y anotaciones nuevas de la demo no rejuvenecen el estado de selección. Los eventos con la misma fecha se ordenan por ID sólo para una presentación estable; estados distintos del mismo día generan una alerta de orden temporal.
- Una solicitud de corrección no edita la decisión. Una corrección de información no modifica la etapa. Sólo un reclutador con alcance y permiso puede cambiar o corregir el estado, mediante confirmación explícita.
- La bitácora local añade eventos y solicitudes a la base en cada lectura. No existe endpoint de borrado ni reinicio. Una bitácora inválida produce 503, conservando el archivo para revisión.

## Comprobación automatizada

`npx vitest run src/lib/skill-path/skill-path.test.ts` aprobó 31 pruebas. Incluyen los ocho escenarios de aceptación, seis roles, persistencia tras reapertura, inmutabilidad del CSV, idempotencia, concurrencia con 409, corrección manual que conserva eventos, falsificación de actor/fecha, entrada JSON acotada y rechazo de otro origen. Fecha fija de pruebas: 4 de noviembre de 2026. ESLint de los archivos de backend y TypeScript aprobaron.

Los eventos `Solicitud de corrección`, `Derivación a revisión humana` y `Revisión humana documentada` son extensiones locales explícitas de la demo. Conservan sus actores reales del paquete (incluidos Revisor y Representante), sin falsificarlos como Reclutador. Los CSV originales mantienen sus formatos y valores originales.
