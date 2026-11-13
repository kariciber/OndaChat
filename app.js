import { firebaseConfig } from './firebase-config.js';
import { mountTechSupport } from './tech-support.js';

const el = id => document.getElementById(id);
const STORE = { name: 'ondachat:nickname', stream: 'ondachat:stream' };
const MAX_MESSAGES = 60, MAX_LENGTH = 300;
let mode = 'loading', sendRemote = null, lastSent = 0, messages = [];
const ROOMS = Object.freeze({
  general: { title: 'Sala general 💬', label: 'General' },
  pop: { title: 'Sala Pop 🎤', label: 'Pop' },
  rock: { title: 'Sala Rock 🎸', label: 'Rock' },
  electronica: { title: 'Sala Electrónica 🎛️', label: 'Electrónica' },
  chill: { title: 'Sala Chill 🌙', label: 'Chill' },
  informatica: { title: 'Sala de Técnicos de Informática 💻', label: 'Técnicos de informática', preview: true }
});
let activeRoom = 'general', firebaseContext = null, unsubscribeRoom = null, roomGeneration = 0;
let techCleanup = null;
const AVATARS = Object.freeze(['🎧','🎤','🎸','💻','🌙','🎨','✨','🎮']);
let currentAvatar = '🎧', profileLoadVersion = 0;
const profileButtons = [...document.querySelectorAll('.profile-avatar')];
function chooseAvatar(icon) {
  currentAvatar = AVATARS.includes(icon) ? icon : '🎧';
  profileButtons.forEach(button => {
    const selected = button.dataset.avatar === currentAvatar;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  updateProfilePreview();
}
function updateProfilePreview() {
  const nickname = document.getElementById('profile-name')?.value.trim() || 'Invitado';
  el('profile-preview').textContent = currentAvatar + ' ' + nickname.slice(0,24);
}
profileButtons.forEach(button=>button.addEventListener('click',()=>chooseAvatar(button.dataset.avatar)));
el('profile-name').addEventListener('input',updateProfilePreview);
function profileFeedback(text) {
  el('profile-feedback').textContent = text;
}
function showProfilePanel(user) {
  const google = Boolean(user?.providerData?.some(p=>p.providerId === 'google.com'));
  el('profile-settings').hidden = !google;
  if (!google) {
    ++profileLoadVersion;
    chooseAvatar('🎧');
    profileFeedback('');
  }
}
async function loadProfile(user) {
  const version = ++profileLoadVersion;
  el('profile-name').value = name();
  chooseAvatar('🎧');
  profileFeedback('Cargando perfil...');
  if (!firebaseContext || !user) return;
  try {
    const {dbApi,db} = firebaseContext;
    const snapshot = await dbApi.getDoc(dbApi.doc(db,'profiles',user.uid));
    if (version !== profileLoadVersion || firebaseContext.auth.currentUser?.uid !== user.uid) return;
    if (snapshot.exists()) {
      const data = snapshot.data();
      const nick = clean(data.nickname,24);
      if (nick) {
        el('nickname').value = nick;
        el('profile-name').value = nick;
        save(STORE.name,nick);
      }
      chooseAvatar(data.avatar);
    }
    profileFeedback(snapshot.exists() ? 'Perfil cargado. Puedes editarlo cuando quieras.' : 'Personaliza tu apodo y avatar y pulsa Guardar.');
  } catch(error) {
    if(version !== profileLoadVersion)return;
    console.error('Cargar perfil',error);
    profileFeedback('No se pudo cargar el perfil. Revisa que hayas publicado las nuevas reglas de Firebase.');
  }
}
async function saveProfile(nickname, icon) {
  if (!signedInGoogle() || !firebaseContext) {
    profileFeedback('Inicia sesión con Google para guardar tu perfil.');
    return false;
  }
  const nick = clean(nickname,24);
  if (!nick) {
    profileFeedback('Elige un apodo antes de guardar.');
    return false;
  }
  const avatar = AVATARS.includes(icon) ? icon : '🎧';
  const {dbApi,db,auth}=firebaseContext;
  const uid=auth.currentUser.uid;
  const button=el('save-profile');
  button.disabled = true;
  profileFeedback('Guardando...');
  try {
    await dbApi.setDoc(dbApi.doc(db,'profiles',uid),{
      nickname:nick,avatar,updatedAt:dbApi.serverTimestamp()
    });
    if(auth.currentUser?.uid !== uid) return false;
    el('nickname').value = nick;
    el('profile-name').value = nick;
    save(STORE.name,nick);
    chooseAvatar(avatar);
    profileFeedback('✅ Perfil guardado. Tu avatar aparecerá en tus próximos mensajes.');
    return true;
  } catch(error) {
    console.error('Guardar perfil',error);
    profileFeedback('No se pudo guardar. Publica las nuevas reglas de Firestore y vuelve a intentarlo.');
    return false;
  } finally { button.disabled=false; }
}
el('profile-form').addEventListener('submit',event=>{
  event.preventDefault();
  saveProfile(el('profile-name').value,currentAvatar);
});
const clean = (value, limit = 300) => String(value ?? '').trim().slice(0, limit);
const name = () => clean(el('nickname').value, 24) || 'Invitado';
const save = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { console.warn('No se pudo guardar localmente', e); } };
const load = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
function notice(message, online = false) {
  el('status-msg').textContent = message;
  el('status-msg').classList.toggle('online', online);
}
function authFeedback(message = '') {
  const feedback = el('auth-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = !message;
}
function signedInGoogle() {
  return Boolean(firebaseContext?.auth?.currentUser?.providerData?.some(p=>p.providerId === 'google.com'));
}
async function reportMusicMessage(roomId, messageId) {
  if (!signedInGoogle() || !firebaseContext) {
    authFeedback('Inicia sesión con Google para enviar una denuncia.');
    return;
  }
  if (!confirm('¿Quieres enviar este mensaje a moderación?')) return;
  const { dbApi, db, auth } = firebaseContext;
  try {
    const uid=auth.currentUser.uid;
    const reportId=uid+'_chat_'+messageId;
    await dbApi.setDoc(dbApi.doc(db,'techReports',reportId),{
      uid,resourceType:'chat',resourceId:messageId,parentId:roomId,
      reason:'contenido_inapropiado',createdAt:dbApi.serverTimestamp()
    });
    notice('Denuncia enviada. El equipo de moderación podrá revisarla.',true);
  } catch(error) {
    console.error('Denunciar mensaje musical',error);
    notice('No se pudo registrar la denuncia. Comprueba las reglas de Firestore.',false);
  }
}
function showMusicControls() {
  const chat = document.querySelector('.chat');
  chat.classList.remove('tech-active');
  el('chat-form').removeAttribute('hidden');
  el('chat-footer').removeAttribute('hidden');
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
    avatar.textContent = AVATARS.includes(item.avatar) ? item.avatar : (clean(item.nickname, 24).charAt(0) || '?').toUpperCase();
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
    head.append(author, time); body.append(head, txt);
    if(item.docId && item.roomId && signedInGoogle() &&
        item.uid !== firebaseContext?.auth?.currentUser?.uid) {
      const flag=document.createElement('button');
      flag.type='button';
      flag.className='message-report';
      flag.textContent='Denunciar';
      flag.setAttribute('aria-label','Denunciar mensaje de '+author.textContent);
      flag.addEventListener('click',()=>reportMusicMessage(item.roomId,item.docId));
      body.append(flag);
    }
    row.append(avatar, body); box.append(row);
  }
  box.scrollTop = box.scrollHeight;
}
el('nickname').value = load(STORE.name);
el('save-nickname').addEventListener('click', () => {
  el('nickname').value = name();
  save(STORE.name, name());
  el('nickname').blur();
  if (signedInGoogle()) {
    el('profile-name').value = name();
    updateProfilePreview();
    saveProfile(name(),currentAvatar);
  }
});
el('message-input').addEventListener('input', () => {
  el('counter').textContent = el('message-input').value.length + '/' + MAX_LENGTH;
});
// Nunca recuperar mensajes locales en una sala conectada: podrían parecer
// mensajes compartidos y mezclarse con otros chats. Firestore es la fuente única.
draw([]);
el('send-btn').disabled = true;
notice('Conectando con el chat de Firebase...');

function showPreviewRoom() {
  draw([]);
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }
  ++roomGeneration;
  if (techCleanup) {techCleanup(); techCleanup = null;}
  mode = 'preview';
  sendRemote = null;
  el('send-btn').disabled = true;
  el('chat-form').hidden = true;
  document.querySelector('.chat').classList.add('tech-active');
  el('chat-footer').hidden = true;
  el('mode-badge').textContent = 'Sala en desarrollo';
  notice('Centro de informática en pruebas. Para participar, inicia sesión con Google.');
  try {
    techCleanup = mountTechSupport({
      container: el('messages'),
      firebaseContext,
      nickname: name,
      avatar: () => signedInGoogle() ? currentAvatar : null
    });
  } catch (error) {
    console.error('Sala informática', error);
    const info = document.createElement('p');
    info.className = 'tech-empty';
    info.textContent = 'No se pudo cargar el centro de informática. Prueba a recargar la página.';
    el('messages').replaceChildren(info);
  }
}

function setRoom(roomId) {
  if (!Object.hasOwn(ROOMS, roomId)) return;
  // Aislamiento estricto: borrar mensajes y estado de la sala anterior ANTES
  // de activar la nueva. No mostramos nunca cachés de otra conversación.
  if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
  ++roomGeneration;
  sendRemote = null;
  mode = 'loading';
  el('send-btn').disabled = true;
  draw([]);
  activeRoom = roomId;
  el('chat-title').textContent = ROOMS[roomId].title;
  document.querySelectorAll('.room-tab').forEach(button => {
    const selected = button.dataset.room === roomId;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (ROOMS[roomId].preview) {
    showPreviewRoom();
    return;
  }
  if (techCleanup) {techCleanup(); techCleanup = null;}
  showMusicControls();
  if (firebaseContext?.auth?.currentUser) {
    subscribeRoom(roomId);
  } else {
    mode = 'unavailable';
    el('mode-badge').textContent = 'Sin conexión';
    notice('No hay conexión con Firebase. Los mensajes de esta sala no están disponibles.');
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
  if (mode !== 'online' || typeof sendRemote !== 'function') {
    notice('Espera a que esta sala se conecte con Firebase antes de enviar.');
    return;
  }
  const nickname = name();
  el('nickname').value = nickname;
  save(STORE.name, nickname);
  const roomWhenSent = activeRoom;
  const sendToCurrentRoom = sendRemote;
  el('send-btn').disabled = true;
  try {
    await sendToCurrentRoom({ nickname, text, ...(signedInGoogle() ? { avatar: currentAvatar } : {}) });
    lastSent = Date.now();
    el('message-input').value = '';
    el('counter').textContent = '0/' + MAX_LENGTH;
  } catch (error) {
    console.error(error);
    notice('No se pudo enviar el mensaje. Comprueba la conexión.', false);
  } finally {
    el('send-btn').disabled = !(mode === 'online' && roomWhenSent === activeRoom);
  }
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
  if (ROOMS[roomId]?.preview) {
    showPreviewRoom();
    return;
  }
  if (!firebaseContext) return;
  showMusicControls();
  // Unsubscribe antes de iniciar cada consulta y limpiar todo dato previo.
  sendRemote = null;
  el('send-btn').disabled = true;
  draw([]);
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }
  const generation = ++roomGeneration;
  const { dbApi, db, auth } = firebaseContext;
  const roomRef = dbApi.collection(db, 'rooms', roomId, 'messages');
  const recent = dbApi.query(roomRef, dbApi.orderBy('createdAt', 'desc'), dbApi.limit(MAX_MESSAGES));

  mode = 'loading';
  sendRemote = null;
  el('send-btn').disabled = true;
  el('mode-badge').textContent = 'Conectando...';
  notice('Abriendo ' + ROOMS[roomId].label + '...');
  draw([]);

  unsubscribeRoom = dbApi.onSnapshot(recent, snapshot => {
    if (generation !== roomGeneration || activeRoom !== roomId) return;
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        docId:doc.id,
        roomId,
        uid:data.uid,
        nickname: data.nickname,
        avatar: data.avatar,
        text: data.text,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
      };
    });
    draw(items.reverse());
    sendRemote = async data => {
      if (!auth.currentUser) throw new Error('La sesión no está disponible');
      const payload = { ...data, uid: auth.currentUser.uid, createdAt: dbApi.serverTimestamp() };
      try {
        return await dbApi.addDoc(roomRef, payload);
      } catch (error) {
        // Hasta publicar reglas nuevas, los chats antiguos aceptan el
        // formato sin avatar. No interrumpimos los mensajes existentes.
        if (error?.code !== 'permission-denied' || !('avatar' in data)) throw error;
        const { avatar, ...legacy } = payload;
        return dbApi.addDoc(roomRef, legacy);
      }
    };
    mode = 'online';
    el('send-btn').disabled = false;
    el('mode-badge').textContent = 'Chat conectado';
    notice('Sala ' + ROOMS[roomId].label + ' conectada a Firebase. No compartas datos personales.', true);
  }, error => {
    if (generation !== roomGeneration || activeRoom !== roomId) return;
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
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    el('auth-state').textContent = 'Configuración pendiente';
    mode = 'unavailable';
    notice('El chat necesita una configuración válida de Firebase.');
    return;
  }
  try {
    const [core, authApi, dbApi] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
    ]);
    const app = core.initializeApp(firebaseConfig);
    const auth = authApi.getAuth(app);
    const googleBtn = el('google-signin');
    const logoutBtn = el('google-signout');
    await auth.authStateReady();
    if (!auth.currentUser) await authApi.signInAnonymously(auth);
    firebaseContext = { dbApi, db: dbApi.getFirestore(app), auth };

    function updateAccount(user) {
      const isGoogle = Boolean(user?.providerData?.some(p => p.providerId === 'google.com'));
      if (isGoogle) authFeedback();
      el('auth-state').textContent = isGoogle
        ? 'Google: ' + (user.displayName || 'Cuenta conectada')
        : user ? 'Participas como invitado' : 'Iniciando sesión...';
      googleBtn.hidden = isGoogle;
      logoutBtn.hidden = !isGoogle;
    }
    authApi.onAuthStateChanged(auth, user => {
      updateAccount(user);
      showProfilePanel(user);
      if (user && signedInGoogle()) {
        loadProfile(user);
      }
      if (!user) {
        if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
        ++roomGeneration;
        sendRemote = null;
        mode = 'unavailable';
        el('send-btn').disabled = true;
        draw([]);
        el('mode-badge').textContent = 'Conectando...';
        notice('Preparando tu sesión...');
        if (ROOMS[activeRoom].preview) showPreviewRoom();
      } else if (ROOMS[activeRoom].preview) {
        // Actualiza el estado Google/Invitado sin mostrar el chat General.
        showPreviewRoom();
      } else {
        subscribeRoom(activeRoom);
      }
    });
    googleBtn.disabled = false;
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      authFeedback();
      try {
        const provider = new authApi.GoogleAuthProvider();
        await authApi.signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Google login', error);
        const hints = {
          'auth/operation-not-allowed': 'Activa Google en Firebase > Authentication > Método de acceso.',
          'auth/unauthorized-domain': 'Autoriza kariciber.github.io en Authentication > Configuración.',
          'auth/popup-blocked': 'El navegador bloqueó la ventana. Prueba en Chrome o permite ventanas emergentes.',
          'auth/popup-closed-by-user': 'Has cerrado la ventana de acceso a Google.',
          'auth/account-exists-with-different-credential': 'Esta cuenta ya usa otro método de acceso.'
        };
        authFeedback(hints[error.code] || 'No se pudo iniciar sesión con Google. Prueba de nuevo.');
      } finally {
        googleBtn.disabled = false;
      }
    });
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      try {
        authFeedback();
        await authApi.signOut(auth);
        await authApi.signInAnonymously(auth);
      } catch (error) {
        console.error('Google logout', error);
        notice('No se pudo cerrar sesión. Recarga la página.');
      } finally {
        logoutBtn.disabled = false;
      }
    });
  } catch (error) {
    console.error('Firebase', error);
    firebaseContext = null;
    sendRemote = null;
    mode = 'unavailable';
    el('send-btn').disabled = true;
    el('mode-badge').textContent = 'Sin conexión';
    el('auth-state').textContent = 'Acceso no disponible';
    draw([]);
    if (ROOMS[activeRoom].preview) {
      showPreviewRoom();
    } else {
      notice('No hay conexión con Firebase. Por seguridad, no se mostrarán mensajes locales de otras salas.');
    }
  }
}
startRealtimeChat();
