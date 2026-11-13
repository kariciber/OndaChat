import { firebaseConfig } from './firebase-config.js';

const el = id => document.getElementById(id);
const STORE = { name: 'ondachat:nickname', messages: 'ondachat:demo', stream: 'ondachat:stream' };
const MAX_MESSAGES = 60, MAX_LENGTH = 300;
let mode = 'demo', sendRemote = null, lastSent = 0, messages = [];
const ROOMS = Object.freeze({
  general: { title: 'Sala general 💬', label: 'General' },
  pop: { title: 'Sala Pop 🎤', label: 'Pop' },
  rock: { title: 'Sala Rock 🎸', label: 'Rock' },
  electronica: { title: 'Sala Electrónica 🎛️', label: 'Electrónica' },
  chill: { title: 'Sala Chill 🌙', label: 'Chill' }
});
let activeRoom = 'general', firebaseContext = null, unsubscribeRoom = null, roomGeneration = 0;
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

function setRoom(roomId) {
  if (!Object.hasOwn(ROOMS, roomId)) return;
  activeRoom = roomId;
  el('chat-title').textContent = ROOMS[roomId].title;
  document.querySelectorAll('.room-tab').forEach(button => {
    const selected = button.dataset.room === roomId;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (firebaseContext) {
    subscribeRoom(roomId);
  } else if (roomId !== 'general') {
    draw([]);
    mode = 'unavailable';
    el('send-btn').disabled = true;
    notice('Esta sala necesita la conexión a Firebase. Vuelve a General para la demostración.');
  } else {
    draw(messages);
    mode = 'demo';
    el('send-btn').disabled = false;
    notice('Modo demo local: los mensajes se guardan solo en este navegador.');
  }
}
document.querySelectorAll('.room-tab').forEach(button => {
  button.addEventListener('click', () => setRoom(button.dataset.room));
});

el('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = clean(el('message-input').value, MAX_LENGTH);
  if (!text) return;
  if (Date.now() - lastSent < 2000) {
    notice('Espera dos segundos antes de enviar otro mensaje.', mode === 'online');
    return;
  }
  if (mode !== 'online' && !(mode === 'demo' && activeRoom === 'general')) {
    notice('Esta sala todavía no permite enviar mensajes. Revisa las reglas de Firebase.');
    return;
  }
  const nickname = name();
  el('nickname').value = nickname;
  save(STORE.name, nickname);
  el('send-btn').disabled = true;
  try {
    if (mode === 'online' && sendRemote) {
      await sendRemote({ nickname, text });
    } else if (mode === 'demo') {
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

function subscribeRoom(roomId) {
  if (!firebaseContext) return;
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }
  const generation = ++roomGeneration;
  const { dbApi, db, uid } = firebaseContext;
  const roomRef = dbApi.collection(db, 'rooms', roomId, 'messages');
  const recent = dbApi.query(roomRef, dbApi.orderBy('createdAt', 'desc'), dbApi.limit(MAX_MESSAGES));

  mode = 'loading';
  sendRemote = null;
  el('send-btn').disabled = true;
  el('mode-badge').textContent = 'Conectando...';
  notice('Abriendo ' + ROOMS[roomId].label + '...');
  draw([]);

  unsubscribeRoom = dbApi.onSnapshot(recent, snapshot => {
    if (generation !== roomGeneration) return;
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        nickname: data.nickname,
        text: data.text,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      };
    });
    draw(items.reverse());
    sendRemote = data => dbApi.addDoc(roomRef, {
      ...data, uid, createdAt: dbApi.serverTimestamp()
    });
    mode = 'online';
    el('send-btn').disabled = false;
    el('mode-badge').textContent = 'Chat conectado';
    notice('Sala ' + ROOMS[roomId].label + ' conectada a Firebase. No compartas datos personales.', true);
  }, error => {
    if (generation !== roomGeneration) return;
    console.error('Firestore / sala ' + roomId, error);
    sendRemote = null;
    mode = 'unavailable';
    el('send-btn').disabled = true;
    el('mode-badge').textContent = 'Sala no disponible';
    notice(roomId === 'general'
      ? 'No se pudo acceder al chat. Revisa la configuración y las reglas de Firebase.'
      : 'Esta sala aún no tiene permisos en Firebase. Publica las nuevas reglas y vuelve a entrar.');
  });
}

async function startRealtimeChat() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) return;
  try {
    const [core, authApi, dbApi] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    const app = core.initializeApp(firebaseConfig);
    const auth = authApi.getAuth(app);
    const login = await authApi.signInAnonymously(auth);
    firebaseContext = { dbApi, db: dbApi.getFirestore(app), uid: login.user.uid };
    subscribeRoom(activeRoom);
  } catch (error) {
    console.error('Firebase', error);
    firebaseContext = null;
    sendRemote = null;
    mode = activeRoom === 'general' ? 'demo' : 'unavailable';
    el('send-btn').disabled = activeRoom !== 'general';
    el('mode-badge').textContent = 'Demo local';
    notice('Firebase no está disponible. Solo la sala General permite una demostración local.');
  }
}
startRealtimeChat();
