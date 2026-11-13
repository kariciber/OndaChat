import { firebaseConfig } from './firebase-config.js';

const el = id => document.getElementById(id);
const STORE = { name: 'ondachat:nickname', messages: 'ondachat:demo', stream: 'ondachat:stream' };
const MAX_MESSAGES = 60, MAX_LENGTH = 300;
let mode = 'demo', sendRemote = null, lastSent = 0, messages = [];
const clean = (value, limit = 300) => String(value ?? '').trim().slice(0, limit);
const name = () => clean(el('nickname').value, 24) || 'Invitado';
const save = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { console.warn('No se pudo guardar localmente', e); } };
const load = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
function notice(message, online = false) {
  el('status-msg').textContent = message;
  el('status-msg').classList.toggle('online', online);
}
function draw(items) {
  const box = el('messages');
  box.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Todavía no hay mensajes. ¡Inaugura la sala! 🎶';
    box.append(empty);
    return;
  }
  for (const item of items) {
    const row = document.createElement('article');
    row.className = 'message';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = (clean(item.nickname, 24).charAt(0) || '?').toUpperCase();
    const body = document.createElement('div');
    body.className = 'message-body';
    const head = document.createElement('div');
    head.className = 'message-head';
    const author = document.createElement('strong');
    author.textContent = clean(item.nickname, 24) || 'Invitado';
    const time = document.createElement('time');
    const d = new Date(item.createdAt || Date.now());
    time.textContent = Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
    const txt = document.createElement('div');
    txt.className = 'message-text';
    txt.textContent = clean(item.text, MAX_LENGTH);
    head.append(author, time); body.append(head, txt); row.append(avatar, body); box.append(row);
  }
  box.scrollTop = box.scrollHeight;
}
el('nickname').value = load(STORE.name);
el('save-nickname').addEventListener('click', () => {
  el('nickname').value = name();
  save(STORE.name, name());
  el('nickname').blur();
});
el('message-input').addEventListener('input', () => {
  el('counter').textContent = el('message-input').value.length + '/' + MAX_LENGTH;
});
try { messages = JSON.parse(load(STORE.messages)) || []; } catch { messages = []; }
if (!Array.isArray(messages)) messages = [];
messages = messages.slice(-MAX_MESSAGES);
draw(messages);

el('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = clean(el('message-input').value, MAX_LENGTH);
  if (!text) return;
  if (Date.now() - lastSent < 2000) {
    notice('Espera dos segundos antes de enviar otro mensaje.', mode === 'online');
    return;
  }
  const nickname = name();
  el('nickname').value = nickname;
  save(STORE.name, nickname);
  el('send-btn').disabled = true;
  try {
    if (mode === 'online') {
      await sendRemote({ nickname, text });
    } else {
      messages.push({ nickname, text, createdAt: new Date().toISOString() });
      messages = messages.slice(-MAX_MESSAGES);
      save(STORE.messages, JSON.stringify(messages));
      draw(messages);
    }
    lastSent = Date.now();
    el('message-input').value = '';
    el('counter').textContent = '0/' + MAX_LENGTH;
  } catch (error) {
    console.error(error);
    notice('No se pudo enviar el mensaje. Comprueba la conexión.', false);
  } finally { el('send-btn').disabled = false; }
});

// La emisión no está activa hasta que se introduce una URL de audio HTTPS.
const audio = el('radio-audio');
audio.volume = .45;
el('volume').addEventListener('input', e => { audio.volume = Number(e.target.value) / 100; });
el('stream-url').value = load(STORE.stream);
function player(title, detail, playing) {
  el('player-title').textContent = title;
  el('player-state').textContent = detail;
  el('play-btn').textContent = playing ? 'Ⅱ' : '▶';
  el('play-btn').setAttribute('aria-label', playing ? 'Pausar radio' : 'Reproducir radio');
  document.querySelector('.radio').classList.toggle('playing', playing);
}
el('save-stream').addEventListener('click', () => {
  const raw = el('stream-url').value.trim();
  let valid = !raw;
  try { if (raw) { const u = new URL(raw); valid = u.protocol === 'https:'; } } catch {}
  if (!valid) { player('URL no válida', 'Usa una dirección HTTPS', false); return; }
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  save(STORE.stream, raw);
  player('Radio en pausa', raw ? 'Emisión configurada' : 'Lista para conectar', false);
});
el('play-btn').addEventListener('click', async () => {
  if (!audio.paused) { audio.pause(); return; }
  const url = load(STORE.stream);
  if (!url) {
    document.querySelector('.settings').open = true;
    player('Configura la radio', 'Introduce la URL directa del audio', false);
    el('stream-url').focus();
    return;
  }
  try {
    if (audio.src !== url) audio.src = url;
    await audio.play();
  } catch (error) {
    console.error('Error de reproducción', error);
    player('Error de reproducción', 'Revisa la URL, formato o permisos del servidor', false);
  }
});
audio.addEventListener('play', () => player('Sonando en directo', 'La Onda de Alternativas', true));
audio.addEventListener('pause', () => player('Radio en pausa', 'Pulsa reproducir para continuar', false));
audio.addEventListener('error', () => player('Emisión no disponible', 'Comprueba el enlace directo al audio', false));

async function startRealtimeChat() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) return;
  try {
    const [core, authApi, dbApi] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    const app = core.initializeApp(firebaseConfig);
    const login = await authApi.signInAnonymously(authApi.getAuth(app));
    const room = dbApi.collection(dbApi.getFirestore(app), 'rooms', 'general', 'messages');
    const query = dbApi.query(room, dbApi.orderBy('createdAt', 'desc'), dbApi.limit(MAX_MESSAGES));
    dbApi.onSnapshot(query, snapshot => {
      const items = snapshot.docs.map(doc => {
        const d = doc.data();
        return { nickname:d.nickname, text:d.text, createdAt:d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString() };
      });
      draw(items.reverse());
    }, error => {
      console.error('Firestore', error);
      sendRemote = null;
      mode = 'unavailable';
      el('send-btn').disabled = true;
      notice('El chat online no está disponible. Revisa la configuración y las reglas.');
    });
    sendRemote = data => dbApi.addDoc(room, { ...data, uid:login.user.uid, createdAt:dbApi.serverTimestamp() });
    mode = 'online';
    el('mode-badge').textContent = 'Chat conectado';
    notice('Conectado a Firebase. No compartas datos personales.', true);
  } catch (error) {
    console.error('Firebase', error);
    el('mode-badge').textContent = 'Demo local';
    notice('Firebase aún no está configurado correctamente. La demostración continúa en este navegador.');
  }
}
startRealtimeChat();
