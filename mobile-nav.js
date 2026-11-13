/* Barra inferior OndaChat: navegación local, sin cambiar salas ni sesión. */
(() => {
  'use strict';
  const nav = document.getElementById('mobile-bottom-nav');
  if (!nav) return;
  const buttons = [...nav.querySelectorAll('.mobile-nav-button')];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollToElement = (element) => {
    if (!element) return;
    element.scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  };
  const activate = (target) => {
    for (const button of buttons) {
      const chosen = button.dataset.target === target;
      button.classList.toggle('active', chosen);
      if (chosen) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      // Al salir de «Mi perfil», plegar su editor sin modificar los datos.
      if (target === 'radio' || target === 'salas') {
        const profile = document.getElementById('profile-settings');
        if (profile) profile.open = false;
      }
      if (target === 'radio') {
        activate(target);
        scrollToElement(document.querySelector('.radio'));
        return;
      }
      if (target === 'salas') {
        activate(target);
        scrollToElement(document.querySelector('.chat'));
        return;
      }
      if (target === 'perfil') {
        const profile = document.getElementById('profile-settings');
        if (profile && !profile.hidden) {
          profile.open = true;
          activate(target);
          scrollToElement(profile);
        } else {
          // Invitados: guiamos al acceso de Google sin iniciar sesión por sorpresa.
          activate(target);
          scrollToElement(document.querySelector('.auth-panel'));
          const signIn = document.getElementById('google-signin');
          if (signIn && !signIn.hidden && !signIn.disabled) {
            signIn.focus({ preventScroll: true });
          }
        }
      }
    });
  }
})();
