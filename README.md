# OndaChat 🎶💬

Primera versión de una aplicación de radio y comunidad en español.

## Estado actual
- Diseño adaptable a móviles y ordenadores, con vista móvil apilada y controles amplios.
- Reproductor de radio con URL directa HTTPS que configura cada usuario.
- Chat en tiempo real con Firebase Firestore. Si Firebase falla, las salas no muestran mensajes locales para evitar mezclas.
- Salas General, Pop, Rock, Electrónica y Chill con mensajes independientes cuando las reglas de Firestore estén publicadas.
- Firebase Authentication y Cloud Firestore configurados para pruebas.
- **Inicio de sesión con Google activo** para entrar en la zona técnica y gestionar perfiles.
- Web desplegada en **https://kariciber.github.io/OndaChat/** (la dirección es públicamente accesible, pero sigue siendo una beta).

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

⚠️ **No promocionar OndaChat todavía:** falta antispam obligatorio del lado del servidor, procedimiento de respuesta a denuncias, privacidad, política de tratamiento de datos y otras pruebas de seguridad. El frontend por sí solo no puede bloquear robots.

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

## Panel de moderación (beta)
- Los usuarios que entran con Google pueden **denunciar mensajes musicales**, preguntas, respuestas y mensajes del chat informático.
- Las denuncias se guardan en la colección `techReports`, ahora con `parentId` para encontrar la publicación.
- La pestaña **🛡️ Moderación** se muestra en el Centro de ayuda informática **solo si** la cuenta Google está autorizada como moderadora.
- En el panel se pueden consultar denuncias, descartar avisos, y eliminar el contenido denunciado. Las preguntas eliminadas requieren borrar antes sus respuestas, tarea que realiza el panel en lotes con límite.
- La comprobación real de los permisos ocurre en **Firestore Rules**, nunca solo en el navegador.

### Autorizar la primera cuenta moderadora
1. Publicar las reglas nuevas de `firestore.rules` desde Firebase Console → Firestore → Reglas.
2. Ir a **Firebase → Authentication → Usuarios**, localizar la cuenta que iniciará sesión como administradora con Google y copiar su **UID** (no el correo).
3. Abrir **Firestore → Datos → Iniciar colección**, escribir como ID de colección `moderators`.
4. Elegir como **ID de documento el UID exacto** del paso 2.
5. Añadir un campo llamado **`active`**, tipo **booleano**, valor **`true`** (no escribir la palabra como texto). Guardar.
6. Volver a OndaChat, acceder con esa cuenta de Google, actualizar la página y abrir la sala **💻 Técnicos de informática**. Deberá aparecer la pestaña **🛡️ Moderación**.

**IMPORTANTE:** No crear una regla que permita a los usuarios escribir en `moderators`. Solo el propietario que tenga acceso a Firebase Console/Admin SDK debe crear o modificar esos documentos. No se necesitan credenciales privadas en GitHub.

### Límites pendientes antes de lanzar
- La eliminación de contenido se prueba primero con publicaciones de ejemplo; es irreversible, no un simple ocultado.
- Retirar una respuesta aceptada puede dejar la pregunta marcada como resuelta hasta que su autor elija otra solución.
- Falta un historial de auditoría del servidor, medidas antispam contra cuentas reales o anónimas, flujos de apelación y un sistema de bloqueo de usuarios.
