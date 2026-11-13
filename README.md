# OndaChat 🎶💬

Primera versión de una aplicación de radio y comunidad en español.

## Estado actual
- Diseño adaptable a móviles y ordenadores.
- Reproductor de radio con URL directa HTTPS que configura cada usuario.
- Chat **local de demostración**: los mensajes se guardan únicamente en el navegador de quien escribe.
- Archivos preparados para conectar Firebase Authentication y Cloud Firestore.
- Facebook Login **pendiente**. Todavía no está conectado.
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
3. Habilitar **Authentication → Anónimo** para pruebas.
4. Crear **Cloud Firestore en modo producción** y publicar las reglas de `firestore.rules`.
5. Probar desde una web HTTPS. Revisar también dominios autorizados para Auth.

⚠️ **No poner un chat abierto al público todavía.** El prototipo carece de herramientas de moderación, denuncias, bloqueos, filtrado antispam robusto, verificación de usuarios y textos legales. Las reglas limitan formato y permisos, pero no evitan abuso con usuarios anónimos.

## Radio
En «Configurar emisión», introducir una URL HTTPS **directa** de audio reproducible y autorizada. La URL de la página de radio no es necesariamente una URL de emisión. Puede haber restricciones de formatos o CORS.

## Próximas fases
- Crear proyecto Firebase y activar chat en entorno de pruebas.
- Añadir inicio de sesión con Facebook mediante Firebase Authentication y Meta Developers.
- Implementar moderación, reportes y políticas de privacidad.
- Publicar en un dominio cuando la versión sea segura.
- Personalizar salas, emisoras e identidad visual.

**Seguridad:** Las claves privadas de servicio, tokens de Meta y contraseñas nunca deben añadirse al repositorio público.
