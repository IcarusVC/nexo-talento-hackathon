# Verificación de Skill path

Verificación realizada el 4 de noviembre de 2026 en Chile. Se distingue revisión independiente por HTTP de los recorridos realizados en navegador y de los escenarios controlados de pruebas. Los CSV conservan los hashes de la entrega original.

## Resultados

| Comprobación | Evidencia y resultado |
|---|---|
| Fuentes | 4/4 hashes SHA-256 coinciden. 60 vacantes, 500 postulaciones, 1.500 eventos y 60 cuentas; sin alterar originales. |
| Regresión completa | `npm test`: 169 pruebas aprobadas en 12 archivos; incluye 31 pruebas nuevas de Skill path. |
| Backend | Permisos de seis roles, vacíos, vigencia, discrepancias, persistencia, correcciones, idempotencia y concurrencia aprobados. Tras fijar las cuatro rutas de lectura de CSV se repitieron las 31 pruebas y aprobaron. |
| API independiente | Diez cuentas consultadas; seis intentos de acción fuera de permisos y un origen externo devolvieron 403 sin escrituras. Detalles en `AUDITORIA.md`. |
| Compilación | TypeScript y producción aprobados. Se corrigió una advertencia de trazado de archivos con rutas literales; la compilación final no repitió esa advertencia. |
| Calidad estática | ESLint de backend y vistas nuevas sin errores. |
| Guardián | Habilidad validada con `quick_validate.py`; 22 requisitos trazados. Revisión independiente de dos encargos contrarios al brief: ranking por género y administrador decidiendo contratación. |
| Adaptación y navegación | Postulaciones, Vacantes, Atención y Métricas a 320 px sin desbordamiento (305 px de contenido). Foco al encabezado al cambiar vista. Métricas también observadas a 390 px. |
| Producción | Aplicación compilada en `http://127.0.0.1:3000/skill-path`, sin credenciales. Historial conservado tras detener desarrollo y arrancar producción. Consola sin errores ni advertencias observados. |

## Recorridos observados

- **Candidato USR-001:** vio tres postulaciones propias. Solicitó corregir POS-0001; apareció una solicitud pendiente y el estado siguió Recibida.
- **Reclutador USR-025:** vio cinco postulaciones de VAC-001. Cambió POS-0242 de Preseleccionada a Entrevista, con motivo y confirmación humana. Apareció un evento con REC-001, fecha, origen Manual y ambos estados; los tres eventos originales se conservaron.
- **Derivación y recordatorio:** el mismo caso se derivó a revisión y recibió un recordatorio interno. Ambos quedaron registrados, sin correo real ni transición automática.
- **Revisor USR-058:** encontró POS-0242 en su subcartera de fuente Empresa. Documentó la revisión como atendida; salió de su cola autorizada. Al volver como reclutador se conservó Entrevista, la atención y toda la bitácora.
- **Representante USR-035:** solicitó pausa de VAC-001. La solicitud apareció en atención; la vacante siguió Activa. La vista de métricas mostró 15 indicadores limitados a EMP-001, sin datos de otras empresas.
- **Candidato USR-004 en producción:** POS-0004 mostró fecha y canal como información no disponible, sin afirmar que nunca hubo contacto.
- **Corrección manual en producción:** USR-025 corrigió POS-0242 de Entrevista a Preseleccionada, para restaurar la etapa inicial de la prueba. La corrección agregó un nuevo evento; no se eliminó la transición de prueba ni se alteró el CSV.

Las operaciones de navegador llevan motivos identificados como QA del equipo y permanecen en `.local/skill-path/ledger.json`. Ese archivo no se versiona. Los contadores posteriores pueden diferir de los conteos iniciales por esas operaciones explícitas.

El primer control en GitHub detectó la normalización automática CRLF→LF al versionar los CSV. Se corrigió con `.gitattributes` limitado a esas cuatro fuentes y se volvieron a incorporar sus bytes originales; no se relajó el control de hashes ni se cambiaron sus valores esperados.

## Casos controlados y límites

La semilla no contiene discrepancia entre el estado registrado y el último evento ordenado, aunque sí contiene quiebres de cadena. La discrepancia final se probó con un dataset en memoria, sin editar los originales. La ausencia de ese ejemplo en la pantalla no significa que la validación esté omitida.

No se certificó WCAG ni se realizó un estudio con usuarios. El selector no es autenticación productiva, la persistencia admite un único proceso y no existe envío real de comunicaciones. El brief excluye esas funciones. La advertencia informativa de Vitest sobre un futuro cargador de configuración no afectó los resultados.

La evidencia visual de escritorio está en [capturas/escritorio.png](capturas/escritorio.png). Las pruebas de permisos y operaciones tienen respaldo en `src/lib/skill-path/skill-path.test.ts` y `AUDITORIA.md`.

## Comandos

```sh
npm run skillpath:guard -- --inventory
npm run skillpath:test
npm run typecheck
npm test
npm run build
npm run skillpath:guard
```

El control documental detecta archivos alterados o evidencia faltante; no reemplaza las pruebas funcionales ni una certificación de accesibilidad.
