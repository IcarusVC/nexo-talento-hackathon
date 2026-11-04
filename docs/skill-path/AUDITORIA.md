# Auditoría de requisitos de Skill path

Revisión independiente del brief de la Prueba 2, diccionario de datos, tarjetas de usuarios y cuatro CSV suministrados. El código se revisa contra esas fuentes; las ideas anteriores de búsqueda laboral real y comparación curricular no forman parte de este MVP. Fecha de referencia del diagnóstico inicial: 4 de noviembre de 2026.

## Estado de esta revisión

Se verificaron las fuentes, el control de acceso en el motor y llamadas HTTP de lectura y denegación contra `http://127.0.0.1:3001`. Esta revisión se complementa con los recorridos de navegador informados por el agente integrador, las 31 pruebas específicas del backend y la batería completa de 169 pruebas aprobadas. La compilación final también aprobó. Se distingue abajo qué evidencia proviene de la comprobación independiente y cuál de la integración; el registro de ejecución consolidado está en `VERIFICACION.md`.

## Hallazgos de las fuentes

Los archivos contienen 60 vacantes, 500 postulaciones, 1.500 eventos y 60 cuentas. No hay identificadores duplicados ni relaciones huérfanas entre postulaciones, vacantes y eventos.

| Condición | Evidencia del paquete | Consecuencia de implementación |
|---|---|---|
| Cartera y asignación pueden contradecirse | USR-025/REC-001 tiene seis vacantes asignadas por actor, pero sólo VAC-001 pertenece a sus empresas autorizadas. USR-030 no tiene coincidencias en la intersección. | Aplicar empresa **y** asignación. No ampliar el acceso para que el selector parezca tener resultados. |
| Vacantes activas vencidas | VAC-004, VAC-008, VAC-012, VAC-016, VAC-020 y VAC-024 al 4 de noviembre. | Advertir vigencia sin cerrar automáticamente. |
| Ausencia de comunicación | 125 postulaciones tienen fecha y canal vacíos; ejemplo POS-0004. | Mostrar evidencia insuficiente, nunca «no hubo contacto». |
| Falta de responsable verificable en eventos | 15 eventos carecen de actor_id; ejemplo EVT-00097 de POS-0033. | Conservar y alertar; no inventar un actor. |
| Falta de fuente del estado | POS-0044, POS-0133, POS-0222, POS-0311, POS-0400 y POS-0489. | No rellenar fuente; separar registro de su corroboración por un evento verificable. |
| Cadena de estados interrumpida | 31 pares de eventos no encadenan estado_nuevo → estado_anterior. Ejemplo POS-0212, EVT-00635 → EVT-00636. | Advertencia de integridad independiente del estado final. |
| Estado final coherente en la semilla | No se detectaron diferencias entre estado_registrado y estado_nuevo del último evento, ordenando por fecha e ID. | Probar esa regla con una copia de prueba controlada en memoria, sin alterar los originales ni presentar una anomalía inexistente como hallazgo. |
| Fechas de eventos empatadas | Existen varios eventos en el mismo día sin hora. | El ID puede desempatar la presentación de forma determinista; no atribuye una hora o certeza adicional. |
| Revisión humana | 209 postulaciones tienen requiere_revision_humana=Sí. | La cola puede crecer por derivaciones, pero debe conservar el dato original y el registro de resolución. |
| Inactividad | 130 postulaciones superan 30 días tomando la fecha más reciente entre actualización y evento. Ejemplo POS-0007. | Mantener el estado y mostrar antigüedad; probar límite exacto de 30/31 días y evento reciente con actualización antigua. |

Las cifras anteriores corresponden a los CSV originales y esa fecha de referencia. Las operaciones del MVP pueden producir métricas diferentes en el registro adicional.

## Decisiones de alcance que requieren cuidado

- El Administrador tiene un permiso CSV de cambio de estados, pero el brief y su tarjeta excluyen decisiones de selección. Puede mantener datos técnicos y reglas; no contratar ni descartar candidatos.
- El Revisor sólo ve postulaciones marcadas **y** pertenecientes a su subcartera. Su permiso para cambiar estados es No: resolver una revisión no equivale a cambiar una etapa laboral.
- Los representantes de empresa no tienen permisos directos de cambio/corrección. Pueden solicitar pausa o cierre y se registra la solicitud para alguien autorizado.
- El brief y la tarjeta del candidato exigen fecha, fuente y próximo paso, aunque algunas columnas se describen como internas en el diccionario. Usar una proyección mínima del proceso propio; no transmitir por ello la bitácora cruda, identificadores de reclutadores ni información de otras personas.
- Un campo vacío conserva ausencia de evidencia. Los nombres ficticios no son claves de unión; hay nombres repetidos entre cuentas.
- El selector ficticio está permitido para la evaluación. No constituye autenticación productiva y debe identificarse como tal.

## Matriz de aceptación

| ID | Criterio verificable | Caso sugerido | Estado de auditoría |
|---|---|---|---|
| A01 | Leer y unir los cuatro CSV, sin modificar originales | Conteos 60/500/1500/60 y hashes | Conteos y relaciones comprobados; prueba backend de conservación de hash |
| A02 | Candidato sólo ve postulaciones propias | USR-001: POS-0001, POS-0221 y POS-0441; bloquear otra postulación | API comprobada; 3 propias y POST ajeno 403 |
| A03 | Mostrar estado, significado, fecha, origen y próximo paso | USR-001; fuente ausente en caso controlado | DTO y componente revisados; recorrido del candidato comprobado por integración |
| A04 | Distinguir confirmado, inferido, desactualizado y ausente sin depender sólo del color | POS-0004, POS-0007 y alerta de vigencia | API y etiquetas textuales revisadas; inspección visual en integración |
| A05 | Solicitud/corrección del candidato no cambia decisiones | Solicitud sobre proceso propio; intento de cambiar estado denegado | HTTP403 independiente y solicitud válida de USR-001 comprobada en navegador por integración |
| A06 | Actualización de etapa autorizada crea evento completo | USR-025, POS-0242: Preseleccionada → Entrevista | Prueba backend y recorrido de navegador con estado previo/nuevo comprobados |
| A07 | Corrección manual conserva historia anterior | Vuelta autorizada a estado previo con motivo | Prueba backend conserva eventos originales y añadidos |
| A08 | Permisos efectivos por rol y alcance en servidor | USR-025 intenta postulación ajena; USR-030 vacío; empresa ajena | API comprobada; alcance e intentos negativos |
| A09 | Antigüedad mayor de 30 días y datos desconocidos | POS-0007; casos exactos 30/31; actualización vieja + evento reciente | API del caso real y pruebas de límite revisadas |
| A10 | Vacante vencida se alerta, nunca se cierra por regla | VAC-004 | Regla y prueba backend de seis vencidas revisadas |
| A11 | Discrepancias y quiebres generan revisión sin sobrescribir estado | POS-0212 y fixture en memoria con último estado diferente | Pruebas de cadena y fixture derivada revisadas |
| A12 | Cola de revisión conserva casos hasta atención autorizada | Derivar caso; revisor apropiado resuelve con motivo; revisor ajeno denegado | Pruebas backend; integración comprobó derivación y atención por USR-058, sin cambio de etapa |
| A13 | Automatización/recordatorio trazable sin selección adversa | Recordatorio repetido; ningún cambio a Descartada | Prueba backend de repetición diaria y recordatorio de USR-025 comprobado en navegador por integración |
| A14 | Al menos cuatro métricas y alcance por cuenta | Empresa EMP-001 no cuenta EMP-002; candidato/revisor sin métricas | API comprobada; 15 indicadores, sin métricas para candidato/revisor |
| A15 | Representante pide pausa/cierre sin ejecutar acción prohibida | USR-035 con VAC-001, solicitud persistida | POST prohibido403; integración comprobó solicitud de pausa de USR-035 sin pausar VAC-001 |
| A16 | Administrador no decide selección | USR-047 intenta transición laboral | API comprobada; 403 FORBIDDEN_ACTION |
| A17 | No filtrar datasets o campos restringidos al cliente | Respuestas API, imports del cliente, archivos estáticos y RSC | Proyección API e imports revisados; el cliente sólo importa tipos/constantes y consulta API |
| A18 | Persistencia y conflictos de edición | Recargar proceso; versión anterior recibe 409; no truncar eventos | Pruebas backend de reapertura, concurrencia y corrupción revisadas |
| A19 | Móvil, teclado, errores y cambio de cuenta | Cuatro vistas a 320 px; foco; 403/409; no mostrar datos de cuenta anterior | Integración comprobó las cuatro vistas sin desbordamiento y foco H1; aislamiento por cuenta revisado en código |
| A20 | Entregables explican arquitectura, herramientas IA y ejecución | README, contrato API, esquema, resultados comprobados | Contrato y guardián revisados; resultados de cierre en VERIFICACION.md |

## Revisión de implementación

Se detectaron y corrigieron dos problemas de alcance antes del cierre:

1. **Revisor con permisos ampliados por una inferencia.** Inicialmente `analysis.requiresReview` permitía al revisor ver casos cuyo flag original era No, sin derivación persistida. USR-058 recibía 77 casos en vez de 56. Se corrigió para exigir la marca original o el cambio registrado en la bitácora adicional; una alerta por sí sola no concede permiso. La API volvió a entregar 56 casos a USR-058.
2. **Identificador de candidato recuperable por otra vía.** El representante recibía `candidateId=null`, pero podía recuperar CAN-xxxx mediante el actor de los eventos de ingreso. Se corrigió la proyección de eventos y solicitudes. La respuesta completa de USR-035 dejó de contener identificadores CAN-xxxx en la comprobación de esta semilla.

Se señalaron además dos desajustes de formulario y fueron corregidos por frontend: límite de motivo de 800 caracteres alineado con backend y exclusión de contraste de requisitos para el administrador técnico.

### Lecturas HTTP comprobadas

| Cuenta | Postulaciones | Vacantes | Métricas | Observación |
|---|---:|---:|---:|---|
| USR-001 | 3 | 28 | 0 | Sólo CAN-0001; ninguna bitácora interna enviada |
| USR-004 | 3 | 28 | 0 | POS-0004, POS-0224 y POS-0444 muestran comunicación por confirmar |
| USR-007 | 3 | 28 | 0 | POS-0007 y POS-0447 marcadas desactualizadas |
| USR-025 | 5 | 1 | 15 | Intersección de asignación y empresa |
| USR-030 | 0 | 0 | 15 | No se amplió la cartera para rellenar la interfaz |
| USR-035 | 45 | 5 | 15 | Empresa EMP-001; sin identificadores de candidato |
| USR-047 | 500 | 60 | 15 | Acceso técnico global |
| USR-051 | 60 | 28 | 15 | Cartera de orientación CAN-0025 a CAN-0044 |
| USR-056 | 111 | 60 | 0 | Sólo casos marcados y requisitos Parcial |
| USR-058 | 56 | 47 | 0 | Sólo casos marcados y fuente Empresa |

Estos conteos se observaron antes de las operaciones de demostración del integrador. Las escrituras auditadas posteriores pueden cambiar las cantidades sin modificar los CSV.

### Intentos negativos HTTP comprobados

Todos respondieron 403 y no crearon mutaciones: candidato solicita corregir una postulación ajena; candidato intenta descartar una propia; reclutador intenta modificar una ajena; administrador intenta cambiar a Entrevista; representante intenta pausar directamente una vacante propia; revisor intenta descartar un caso de su cartera. Una solicitud con origen de otra web respondió también 403 (`SAME_ORIGIN_REQUIRED`).

### Revisión del guardián

Se evaluaron dos solicitudes contrarias al brief sin ejecutarlas: «añade ranking de personas según género» y «haz que el administrador cambie a Contratada». El skill contiene instrucciones explícitas para detectar ambos conflictos y no inventar permisos. Su script distingue el control documental de la prueba funcional; un resultado de ese script no certifica comportamiento.

### Pruebas de backend revisadas

Se leyó `src/lib/skill-path/skill-path.test.ts`: 31 pruebas focalizadas, cuyo resultado aprobado fue informado por el responsable del backend. Cubren datos, nulos, umbral de antigüedad, discrepancias controladas, permisos de seis roles, persistencia, idempotencia, conflictos concurrentes, correcciones, solicitudes, derivación, recordatorios, límites HTTP y falsificación de actor. No se repitió esa batería por duplicado; la comprobación HTTP independiente descrita arriba complementa sus resultados.

### Comprobaciones de integración informadas

El agente integrador comprobó en navegador la solicitud propia de USR-001 sin cambio de estado; la transición POS-0242 de Preseleccionada a Entrevista por USR-025 con registro de ambos estados; la derivación y el recordatorio; la atención de revisión por USR-058 sin alterar la etapa; y la solicitud de pausa de VAC-001 por USR-035 sin pausar la vacante. También comprobó 15 métricas limitadas a EMP-001 y las cuatro vistas a 320 px sin desbordamiento horizontal, con foco en el encabezado al navegar.

La batería completa de 169 pruebas y la compilación final fueron informadas como aprobadas. Los registros nuevos de demostración se conservan en la bitácora; no se eliminaron para aparentar una base sin actividad.

### Límites

La evidencia combina revisión de código, pruebas específicas, llamadas HTTP independientes y recorridos de integración. No equivale a una certificación completa de accesibilidad, una prueba de seguridad productiva ni un estudio con usuarios. El selector de cuentas es intencionalmente ficticio, y la persistencia de un solo proceso no se presenta como infraestructura productiva. Los detalles de ejecución y los límites del cierre se mantienen en `VERIFICACION.md`.
