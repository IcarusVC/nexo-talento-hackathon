# Verificación del producto de cuatro perfiles

Fecha: 4 de noviembre de 2026. Cuatro experiencias implementadas y recorridas en la aplicación compilada. Los resultados siguientes corresponden a datos ficticios, no a personas ni instituciones reales.

## Recorridos observados en navegador

1. **SP-CAND-01:** guardó titular, descripción, SQL/Comunicación y disponibilidad de 30 horas. Agregó experiencia dirigida a Andes Digital y un proyecto con `proyecto-ejemplo.txt`. Ambos quedaron pendientes; subir el documento no acreditó habilidades.
2. **Descarga:** el archivo subido desde el selector del navegador se descargó mediante el enlace del portafolio. Su SHA-256 coincide exactamente con el archivo de ejemplo original. Las negativas de acceso y validaciones de formato/tamaño se verificaron en pruebas del servidor.
3. **Oportunidades:** SQL y Comunicación aparecieron declaradas, Excel sin evidencia; un cargo de 40 horas mostró la condición de acceso por disponibilidad. Se registró una postulación a Analista de datos junior sin bloquearla por esa brecha.
4. **Meta y formación:** elegir el cargo generó la meta con sus requisitos. Se guardaron solicitudes internas para SQL de Platzi, Pitch de ideas y un programa avanzado de U. de Chile. Se mostraron el descuento ficticio de 20%, requisitos de ingreso y avisos de no inscripción oficial.
5. **SP-REC-01:** revisó y acreditó la experiencia ficticia con fundamento. En el embudo abrió el perfil, el respaldo descargable y la historia de Ana. Avanzó Recibida → En revisión → Preseleccionada → Entrevista; cada paso exigió confirmación y motivo.
6. **SP-SUP-01:** observó dos reclutadores, dos postulaciones que llegaron a entrevista y una pendiente antes de entrevista. La tabla separó Elena (una entrevista y una pendiente) de Diego (una entrevista histórica, actualmente en Oferta). El texto define ambos indicadores.
7. **Base y nueva vacante:** guardó Comunicación y SQL como base de la empresa. El formulario de vacante las precargó de forma editable. Publicó Práctica de analítica, jornada de 20 horas, remota, asignada a Diego. Los requisitos de las vacantes anteriores no cambiaron.
8. **SP-EDU-02:** vio sus propias ofertas y la solicitud de Pitch. Simuló evaluación sólo de Comunicación; la evidencia nueva acreditó esa habilidad, no Presentaciones. La solicitud quedó completada y el botón de nueva evaluación deshabilitado.
9. **Catálogo institucional:** creó Excel aplicado a decisiones como curso ficticio con requisitos, precio ilustrativo, cupos y criterio de evaluación. Apareció inmediatamente entre las opciones relacionadas con la meta de Ana.
10. **Demanda:** tras publicar la vacante, la institución vio seis avisos de demostración como denominador y SQL en cuatro de seis. Recibió demanda agregada y propuestas de competencias, sin expedientes de postulaciones laborales.
11. **Regreso y persistencia:** al recargar, Ana conservó perfil, meta, experiencia acreditada, proyecto pendiente y evaluación institucional. La meta quedó con Excel como único requisito pendiente de evidencia acreditada.
12. **Móvil y consola:** los cuatro perfiles se recorrieron a 320px (ancho del documento 305px, sin desbordamiento horizontal de página). El perfil se inspeccionó visualmente a 390px. Menú y tablas pueden desplazarse dentro de sus contenedores. La consola de producción no reportó errores ni advertencias durante los recorridos; se restauró el tamaño normal del navegador.

## Comprobaciones técnicas

- Suite integrada final: **203 pruebas aprobadas en 13 archivos**, incluidas **34 pruebas del módulo nuevo**. Una prueba al cruzar medianoche UTC confirma que el cierre respeta la fecha civil de Chile.
- TypeScript y ESLint de la ampliación: aprobados.
- Compilación de producción: aprobada; las cuatro rutas API nuevas y las dos vistas producto/brief están incluidas.
- Auditoría independiente: siete comprobaciones del motor, trece escenarios agrupados en almacenamiento aislado y ocho verificaciones HTTP; véase `AUDITORIA.md`.
- Guardián: registra 42 requisitos entre el caso original y la ampliación, conservando los cuatro hashes originales.
- Los casos de QA se conservan en el almacenamiento local ignorado por Git. No se alteraron las semillas ni los CSV para simular resultados favorables.
- El modo desarrollo presentó una recarga continua durante la integración. Se corrigió el acceso dinámico al archivo de estado y se volvió a abrir: la cuenta y el perfil cargaron, sin repetición continua de solicitudes. La entrega se sirve con la compilación de producción.

Capturas: [Candidato](capturas/candidato.png), [Supervisor](capturas/supervisor.png), [Institución](capturas/institucion.png), [Móvil](capturas/candidato-movil.png).

## Límites de la demostración

Identidades, vacantes, convenios, descuentos y agenda son ficticios. Una solicitud interna no inicia una inscripción oficial. No se evaluará autenticación productiva, ejecución en múltiples instancias ni envío de mensajes externos. Las referencias institucionales no prueban una alianza real.
