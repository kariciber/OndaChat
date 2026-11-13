# Preparación APK / AAB · OndaChat (beta)

Este documento prepara la empaquetación de la PWA **https://kariciber.github.io/OndaChat/** sin rehacer Firebase, el chat ni los estilos.

## Paso 1: generar primer paquete desde PWABuilder
1. Ir a https://www.pwabuilder.com/ y pegar `https://kariciber.github.io/OndaChat/`.
2. Ejecutar el análisis; corregir las advertencias bloqueantes del manifest, iconos o service worker antes de continuar.
3. **Package for stores** → **Android** → **Generate Package** (pestaña Google Play).
4. Confirmar los valores sugeridos más abajo. Para la primera APK seleccionar **Signing key: New** (para firmar el paquete de prueba; conservar keystore y contraseñas). Si ya existe una aplicación con el mismo identificador en Play Console, NO generar una clave distinta.
5. Descargar el ZIP; incluye normalmente **APK para pruebas, AAB para Google Play y la clave de firma**. Guardar el ZIP y los archivos privados de firma **fuera del repositorio**.
6. Instalar la APK de pruebas en el Motorola desde el gestor de archivos, autorizando esa instalación solo si reconoces el archivo. Probar inicio de Google, chats, panel de moderación, perfiles, navegación y radio.

## Configuración de referencia (revisar antes de firmar/publicar)
| Opción | Valor recomendado |
|---|---|
| App name | OndaChat |
| Short name | OndaChat |
| URL | https://kariciber.github.io/OndaChat/ |
| Web manifest | https://kariciber.github.io/OndaChat/manifest.webmanifest |
| Package ID **provisional** | `com.kharb.ondachat` (confirmar que será el identificador permanente antes de publicar) |
| App version / code | `1.0.0` / `1` |
| Display mode | Standalone |
| Theme color | `#100a22` |
| Background color | `#100a22` |
| Icon URL | https://kariciber.github.io/OndaChat/icon-512.png |
| Target SDK | Android 16 / API 36 o superior para nuevos envíos a Play desde 31/08/2026 |
| Notificaciones, ubicación, compras | Desactivadas si no se utilizan |
| Firma | Clave nueva para app nueva; reutilizar siempre la misma para futuras versiones |

## Paso 2: verificación de la URL con Digital Asset Links
Una Trusted Web Activity (TWA) solo abre a pantalla completa sin barra de navegador cuando se verifica el dominio. Tras generar la APK hay que instalar un archivo JSON con el identificador Android elegido y la huella SHA-256 de la firma en **la raíz exacta de este dominio**:

`https://kariciber.github.io/.well-known/assetlinks.json`

La ruta `https://kariciber.github.io/OndaChat/.well-known/assetlinks.json` **NO sirve** para verificar el dominio `kariciber.github.io`.

Esto requiere un sitio de GitHub Pages en la raíz (por ejemplo, un repositorio `kariciber.github.io`) o un dominio propio configurado en la PWA y en el paquete. **No publicar un assetlinks.json ficticio**; generarlo después de conocer Package ID y SHA-256 auténticos. Si no se completa, la APK puede mostrar una pestaña personalizada con barra de dirección, en vez de una TWA totalmente integrada. Al distribuir por Google Play, Play App Signing puede tener otra huella SHA-256: añadir también su certificado a assetlinks.json.

La clave privada `signing.keystore`, su contraseña, `signing-key-info.txt`, `*.jks` y demás archivos sensibles nunca deben publicarse ni pegarse en un chat.

## Paso 3: Google Play Console
1. Crear OndaChat en **Play Console**, sin lanzarla a producción todavía.
2. Para probar con personas conocidas, usar **Pruebas internas** y cargar el archivo `*.aab`, no la APK de prueba.
3. Si tu cuenta personal de Play Console fue creada después del 13/11/2023, para acceder a producción se exige una prueba cerrada con al menos **12 testers durante 14 días seguidos**.
4. Completar política de privacidad pública, sección Seguridad de los datos, declaraciones de público objetivo y acceso de prueba al inicio de sesión, pruebas de denuncia y moderación, antispam y otros requisitos de Google Play. No afirmar que la beta está lista para publicación general.
5. Antes de subir el AAB, comprobar targetSdkVersion 36+ y la huella SHA-256 de firma de aplicación en Play Console → Integridad de aplicación.

**Actualizaciones posteriores:** La web/PWA se actualiza desde GitHub, pero el APK/AAB debe regenerarse y publicarse con un número de versión superior si cambian la firma, el contenedor o los requisitos nativos de Android.

Referencias:
- https://github.com/pwa-builder/PWABuilder/blob/main/docs/builder/android.md
- https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- https://developers.google.com/digital-asset-links/v1/create-statement
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/14151465
