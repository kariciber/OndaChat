/* Instalación PWA opcional; jamás interfiere con el chat. */
(() => {
  const button = document.getElementById('install-app');
  let deferredPrompt = null;
  if (button) {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      button.hidden = false;
    });
    button.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      const prompt = deferredPrompt;
      deferredPrompt = null;
      button.hidden = true;
      try {
        await prompt.prompt();
        await prompt.userChoice;
      } catch (error) {
        console.warn('Instalación cancelada o no disponible', error);
      }
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      button.hidden = true;
    });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .catch(error => console.warn('No se pudo registrar el servicio offline', error));
    });
  }
})();
