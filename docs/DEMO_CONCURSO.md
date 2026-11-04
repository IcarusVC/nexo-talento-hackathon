# Guion de demostración

Propuesta para el 4 de noviembre de 2026. Nombre de trabajo: **Nexo Talento**.

## Qué mostrar

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
