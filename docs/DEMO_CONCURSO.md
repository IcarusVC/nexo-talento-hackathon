# Guion de demostración

Propuesta para el 4 de noviembre de 2026. Nombre de trabajo: **Nexo Talento**.

## Qué mostrar

Abrir primero **Mi próximo paso**, el nuevo inicio orientado al estudiante:

1. Elegir un cargo de la muestra real con salario publicado. Distinguir práctica, nivel inicial y senior.
2. Ver las capacidades del cargo elegido; marcar una que se pueda respaldar. Comprobar que la ruta se refiere a ese objetivo y no a todos los cargos de la muestra.
3. Consultar una formación vinculada: institución, requisitos previos, precio, duración y credencial. Diferenciar material gratuito, certificado y cupo de inscripción.
4. Revisar oportunidades de experiencia con disponibilidad y país del perfil. Las condiciones pendientes siguen siendo pendientes.
5. Escribir **Analista de datos** y pulsar **Buscar ofertas reales**. El portal busca en sus textos y puede devolver cargos relacionados. Mostrar la fuente Get on Board, la fecha y las condiciones de la captura. Se consulta una página de hasta treinta ofertas; un error conserva la muestra anterior identificada como tal. Los rangos sin período de pago confirmado no se comparan numéricamente.

Para profundizar en la vista institucional y las herramientas de apoyo:

1. **Oportunidades:** escoger una oferta o vía del estudio. Abrir su fuente, revisar la fecha de observación y distinguir conocimientos, experiencia y condiciones. La muestra documental tiene corte al 1 de noviembre; no se presenta como vacantes confirmadas hoy.
2. **Universidad:** seleccionar una carrera y comparar la misma oportunidad con su evidencia curricular. Diferenciar contenido declarado, electivo y pendiente de verificar. Registrar una acción con responsable y fecha.
3. **Mi ruta:** modificar disponibilidad, experiencia y condición de estudiante. Mostrar cómo una barrera horaria cambia el resultado sin atribuir falta de habilidad. La evidencia incorporada por el usuario es autodeclarada hasta una revisión externa.
4. **Importar Luk:** abrir `public/examples/luk-ofertas-demo.jsonl`, claramente ficticio, e importar. También se admiten salidas reales del scraper/CLI. Verificar que las nuevas ofertas aparecen y que los duplicados no se multiplican.
5. **Exportar:** descargar diagnóstico con el programa, requisitos, condiciones y fuentes. Recargar la página para demostrar la conservación local de los registros del piloto.

## Mensaje de producto

La conexión que demostramos es: **ofertas → requisitos con evidencia → formación declarada → condiciones de acceso → acciones y oportunidades**. Una universidad puede necesitar mejorar una evaluación o abrir cupos, además de revisar contenidos.

La base proviene de TurboTrabajo y del asistente Luk de Diego Ostertag. El equipo aporta el modelo curricular, la distinción entre habilidades y acceso, el motor explicable y el recorrido institucional.

## Límites que se deben mostrar correctamente

- Es un piloto funcional con persistencia en el navegador, no un sistema institucional multiusuario validado.
- La extracción usa reglas y vocabularios visibles. Requiere revisión y conserva incertidumbre; no se presenta como un modelo de IA entrenado o una certificación.
- No mide un ranking de países ni empleabilidad individual. La presencia de un ramo no acredita dominio.
- Las fuentes históricas y programas permanentes no son vacantes abiertas. Una etiqueta part-time no equivale automáticamente a veinte horas.
- Los ejemplos de importación son ficticios. El archivo del estudio contiene referencias públicas documentadas, no resultados de estudiantes reales.
- El recorrido `/nexo` no envía postulaciones, no reserva tokens y no realiza pagos. Los servicios originales de TurboTrabajo requieren configuración independiente.

## Antes de presentar

- Ejecutar instalación, pruebas y build según README.
- Iniciar el servidor antes de comenzar la presentación y comprobar `/nexo`.
- Conservar el ejemplo de importación disponible localmente; la demostración principal funciona con el estudio incorporado aunque el portal externo cambie o no responda.
- Abrir el repositorio y el aviso de atribución para mostrar qué se reutilizó y qué añadió el equipo.
