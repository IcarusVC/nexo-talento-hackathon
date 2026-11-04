# Auditoría de la ampliación de Skill path

Fecha: 4 de noviembre de 2026. Revisión independiente del contrato, backend y código de las vistas. Este documento distingue comprobaciones observadas de casos todavía pendientes.

## Alcance

Cuatro experiencias autorizadas por el usuario: candidato, reclutador, supervisor e institución educativa. Las cuentas, empresas, vacantes, convenios, descuentos y actividades de esta ampliación son de demostración. El selector de cuentas simula identidad y no constituye autenticación productiva. Los cuatro CSV originales del brief pertenecen al módulo anterior y se conservan intactos.

## Casos de aceptación de la revisión

| Caso | Resultado esperado | Estado |
| --- | --- | --- |
| Un candidato guarda perfil y evidencia | Sólo cambia su perfil; la evidencia nueva queda pendiente | Comprobado en store aislado |
| Un candidato intenta acreditar su propia experiencia | El servidor rechaza la acción | 403 comprobado |
| Un reclutador acredita experiencia de otra empresa | El servidor rechaza la acción y no modifica datos | 403 comprobado |
| Se adjunta un archivo | Tipo, contenido, tamaño y descarga respetan el alcance de la evidencia | TXT válido y PDF falso comprobados; límites adicionales cubiertos por pruebas del backend |
| Se repite una postulación o inscripción | No aparece un segundo registro equivalente | Postulación e idempotencia comprobadas independientemente; inscripción cubierta por prueba del backend |
| Una vacante está cerrada o vencida | No admite nuevas postulaciones, conserva su historia | Vencimiento comprobado en motor; estados cerrada/pausada revisados en `jobOpen` |
| Faltan habilidades en un perfil | Se muestra la brecha de evidencia; no hay descarte automático | Comprobado en motor y postulación del store |
| Un reclutador mueve una candidatura | Necesita autorización, confirmación humana y motivo; conserva antes/después | Cambios válidos y cuatro rechazos comprobados |
| Un supervisor consulta su equipo | Sólo recibe reclutadores, procesos e indicadores de su empresa | Comprobado en motor y HTTP |
| Una institución administra un curso ajeno | El servidor rechaza la acción | 403 comprobado |
| Una institución consulta demanda | Recibe agregados con denominador y alcance; no expedientes privados de candidatos | Comprobado en motor, store y HTTP |
| Un candidato se inscribe en una actividad | La inscripción sola no acredita una habilidad | Comprobado en store aislado |
| La institución evalúa una inscripción | Sólo evalúa su oferta y las habilidades declaradas en esa oferta | Evaluación válida y cuatro rechazos comprobados |
| Reintento y modificación concurrente | La idempotencia evita duplicados y la versión obsoleta produce conflicto | Reintento, clave reutilizada con cambio y versión obsoleta comprobados |
| Convenios y postulaciones educativas | Se identifican como simulados; no se afirma envío o admisión reales | Revisado en código de las vistas; recorrido visual a cargo del integrador |

## Observaciones iniciales del contrato

- La separación de roles y los campos de estado de evidencia permiten distinguir autodeclaración de acreditación.
- Se incorporó `enrollmentId` a la evidencia educativa; la prueba independiente verificó esa referencia después de evaluar una actividad.
- Las métricas distinguen entrevista histórica de estado actual. El caso precargado en Oferta cuenta como una entrevista y cero pendientes. «Pendiente» se define como Recibida, En revisión o Preseleccionada, visible en la interfaz.

## Evidencia independiente ejecutada

- Siete comprobaciones agrupadas del motor mediante `tsx`: aislamiento del candidato, empresa y asignación del reclutador, equipo del supervisor, privacidad institucional, contraste de habilidades, exclusión de una vacante vencida del denominador y clasificación explícita de habilidades blandas/desconocidas.
- Trece escenarios agrupados en un `ProductStore` dentro de una carpeta temporal: perfil/evidencia, acreditación, descarga, formato inválido, duplicados, idempotencia, conflicto de versión, transiciones, catálogo institucional, inscripción, evaluación, privacidad y persistencia al crear otra instancia. Cada escenario incluyó las aserciones positivas y negativas descritas arriba. La carpeta temporal se eliminó después de verificar su ruta; no se modificó el estado de la demo.
- HTTP en `127.0.0.1:3001`: cuatro espacios respondieron 200 y `Cache-Control: no-store`. El candidato recibió 1 perfil y 0 postulaciones ajenas; reclutador 2 vacantes y 1 postulación; supervisor 3 vacantes y 2 postulaciones; Platzi 3 ofertas propias y 0 expedientes laborales.
- HTTP negativo: origen externo 403, tipo de contenido distinto de JSON 415, cuenta inexistente 404 y adjunto no accesible 403. No se ejecutaron mutaciones válidas sobre el servidor compartido.

## Hallazgos comunicados durante la revisión

1. **Corregido:** una meta asociada a una vacante aceptaba habilidades arbitrarias del cliente. Ahora el servidor toma el título y requisitos de la vacante; existe prueba de regresión.
2. **Corregido y revisado en código:** el detalle del embudo mostraba proyectos/logros sin sus enlaces o adjuntos. Ahora presenta descripción, enlace de respaldo y descarga protegida. Las tarjetas de evidencia incluyen también el identificador de quien revisó.
3. **Corregido y revisado en código:** todas las respuestas 409 se presentaban como cambio concurrente, ocultando mensajes de cupos, duplicados y evaluación final. La interfaz discrimina `VERSION_CONFLICT` y conserva el mensaje específico de los demás rechazos.
4. **Corregido y revisado en código:** se permitía abrir una evaluación ya completada. La acción queda deshabilitada y muestra «Evaluación ya completada»; el servidor sigue bloqueando una repetición.
5. **Corregido y revisado en código:** el formulario de requisitos exige de 3 a 1.200 caracteres, en concordancia con el backend. Los errores de una transición se muestran dentro del diálogo de cambio de etapa, mediante `mutationError`.
6. **Corregido y comprobado con ejecución independiente:** Empatía y Negociación se clasifican como blandas. Los términos fuera del catálogo explícito quedan `unknown`, con un bloque «Por clasificar» en la institución; no se convierten por defecto en técnicos.

## Límites de esta revisión

La demostración permite simular una evaluación institucional antes de la fecha futura de la actividad para recorrer el flujo completo. No verifica asistencia real ni impone una compuerta temporal a esa evaluación. La interfaz y las evidencias deben mantener explícito su carácter simulado.

No se auditó autenticación productiva, disponibilidad multiinstancia ni seguridad de un servicio público. La revisión visual, móvil y de navegación está a cargo del integrador; aquí no se presenta como observada hasta que aporte su evidencia.

Resultado de esta revisión: sin bloqueantes pendientes en el backend y las rutas de código examinadas. Las correcciones visuales fueron inspeccionadas en código; la entrega general debe añadir los recorridos de navegador, pruebas integradas y compilación que ejecute el integrador.
