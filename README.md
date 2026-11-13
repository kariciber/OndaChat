# OndaChat 🎶💬

Primera versión de una aplicación de radio y comunidad en español.

## Estado actual
- Diseño adaptable a móviles y ordenadores, con vista móvil apilada y controles amplios.
- Reproductor de radio con URL directa HTTPS que configura cada usuario.
- Chat **local de demostración** si Firebase no está disponible, solo en General.
- Salas General, Pop, Rock, Electrónica y Chill con mensajes independientes cuando las reglas de Firestore estén publicadas.
- Archivos preparados para conectar Firebase Authentication y Cloud Firestore.
- **Acceso con Google integrado en el código**, pendiente de habilitar Google en Firebase Authentication y autorizar el dominio de GitHub Pages.\n- Facebook Login **pendiente**. Todavía no está conectado.
- No se ha desplegado un sitio web público.

## Cómo probar en local
Servir el directorio desde un servidor HTTP local (no abrir el HTML con `file://`):
```sh
python -m http.server 8000
```
Después abrir `http://localhost:8000`.

## Activación del chat online (solo entorno de pruebas)
1. Crear o seleccionar un proyecto en [Firebase](https://console.firebase.google.com/).
2. Registrar una aplicación Web y copiar su configuración pública a `firebase-config.js`.
3. Habilitar **Authentication → Anónimo** para pruebas.\n4. Para habilitar el botón de Google: **Authentication → Método de acceso → Google → Habilitar**, elegir correo de soporte y guardar. En **Authentication → Configuración → Dominios autorizados**, añadir `kariciber.github.io` (solo dominio, sin `https://` ni `/OndaChat`).
5. Crear **Cloud Firestore en modo producción** y publicar las reglas de `firestore.rules`.
6. Probar desde una web HTTPS. Revisar también dominios autorizados para Auth.

⚠️ **No difundir el chat públicamente todavía.** El prototipo carece de herramientas de moderación, denuncias, bloqueos, filtrado antispam robusto, verificación de usuarios y textos legales. Las reglas limitan formato y permisos, pero no evitan abuso con usuarios anónimos.

## Radio
En «Configurar emisión», introducir una URL HTTPS **directa** de audio reproducible y autorizada. La URL de la página de radio no es necesariamente una URL de emisión. Puede haber restricciones de formatos o CORS.

## Próximas fases
- Crear proyecto Firebase y activar chat en entorno de pruebas.
- Añadir inicio de sesión con Facebook mediante Firebase Authentication y Meta Developers; después crear salas por géneros.
- Implementar moderación, reportes y políticas de privacidad.
- Publicar en un dominio cuando la versión sea segura.
- Moderación y perfiles, presencia de usuarios conectados y personalización de emisoras.

**Seguridad:** Las claves privadas de servicio, tokens de Meta y contraseñas nunca deben añadirse al repositorio público.


## Estado de las preguntas
- La persona autora de una pregunta puede pulsar «✓ Marcar como solución» debajo de una respuesta.
- Cuando se marca una respuesta, aparece «✅ Resuelta» en la lista y «✅ Solución aceptada» en el hilo. También puede elegir otra respuesta como solución posteriormente.
- Las nuevas reglas de `firestore.rules` permiten actualizar únicamente los campos de estado y respuesta aceptada, siempre por la persona autora.
- **Importante:** tras actualizar `firestore.rules` en GitHub, también hay que copiarlas y publicarlas en Firebase Console → Cloud Firestore → Reglas. GitHub no despliega automáticamente las reglas a Firebase.

## Sala de técnicos de informática (beta, en desarrollo)
- Panel violeta de **Preguntas**, **Conversar** y **Normas**.
- Preguntas categorizadas (Windows, Linux, redes, hardware, seguridad, programación y otras), respuestas en hilos y chat en tiempo real.
- Botones de denuncia. Los avisos se almacenan en `techReports`; la revisión es **manual** desde Firebase.
- **Solo para sesiones iniciadas con Google**; el inicio de sesión anónimo no permite leer ni publicar en el centro informático.
- Todas las salas musicales existentes mantienen su funcionamiento.
- Este centro **no está listo para promocionarlo públicamente**: falta protección antispam del servidor, moderación activa, políticas de privacidad, procedimiento de retirada de contenido y pruebas de abuso. El límite de tiempo entre publicaciones en navegador no es una protección contra bots.

### Para activar las pruebas del centro informático
1. En Firebase Authentication → Método de acceso, habilitar Google y configurar el correo de asistencia, si aún no está activado.
2. Añadir `kariciber.github.io` en Authentication → Configuración → Dominios autorizados, si hace falta.
3. En Cloud Firestore → Reglas, reemplazar las reglas antiguas por el contenido actual de `firestore.rules` y publicar.
4. Recargar la web, elegir «💻 Técnicos de informática» e iniciar sesión con Google.
5. Probar una pregunta, una respuesta y un mensaje, desde ordenador y móvil, sin compartir datos personales.

Hasta publicar esas reglas, los formularios de informática no podrán leer ni escribir datos de Firestore. No es necesario crear colecciones a mano.
