/**
 * Centro de ayuda técnica de OndaChat.
 * Vista preliminar hasta publicar reglas específicas de Firestore.
 * Nunca muestra HTML recibido de usuarios: todo se inserta con textContent.
 */
const CATEGORIES = Object.freeze([
  ['windows','🪟 Windows'],
  ['linux','🐧 Linux'],
  ['redes','🌐 Redes y Wi-Fi'],
  ['hardware','🔧 Hardware y reparación'],
  ['seguridad','🛡️ Seguridad'],
  ['programacion','💻 Programación'],
  ['otros','💡 Otras dudas']
]);
const create = (tag, className, content) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
};
const short = (str, max) => String(str || '').trim().slice(0, max);
const clock = timestamp => {
  const d = timestamp?.toDate?.() || new Date();
  return d.toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
};
const catLabel = id => CATEGORIES.find(x => x[0] === id)?.[1] || '💡 Otras dudas';
const authIsGoogle = user => !!user?.providerData?.some(provider => provider.providerId === 'google.com');

export function mountTechSupport({container, firebaseContext, nickname}) {
  let stopped = false, stopList = null, stopDetail = null, stopQuestion = null, view = 'questions';
  let questionItems = [], lastPublish = 0, currentQuestionId = null;
  const ctx = firebaseContext;
  const user = ctx?.auth?.currentUser;
  const ready = Boolean(ctx && authIsGoogle(user));
  const root = create('section','tech-center');
  const header = create('div','tech-head');
  header.append(create('span','tech-symbol','💻'), create('div','tech-head-copy'));
  header.lastChild.append(create('h3','', 'Centro de ayuda informática'),create('p','', 'Pregunta, ayuda o conversa con otras personas. Un rincón para aprender juntos.'));
  root.append(header);
  const badges = create('div','tech-badges');
  badges.append(
    create('span','', '🪟 Windows · 🐧 Linux · 🌐 Redes'),
    create('span','', '🔧 Reparación · 🛡️ Seguridad · 💻 Código')
  );
  root.append(badges);
  const warning = create('p','tech-warning','🧪 En desarrollo. No compartas contraseñas, claves, IP públicas ni información personal. Las publicaciones se mostrarán a otros usuarios con acceso.');
  root.append(warning);
  const tabs = create('div','tech-tabs');
  const questionsBtn = create('button','tech-tab selected','❓ Preguntas');
  const chatBtn = create('button','tech-tab','💬 Conversar');
  const guideBtn = create('button','tech-tab','📋 Normas');
  [questionsBtn,chatBtn,guideBtn].forEach(b=>{b.type='button';tabs.append(b);});
  root.append(tabs);
  const content = create('div','tech-content');
  root.append(content);
  container.replaceChildren(root);
  const disposeSubscriptions = () => {
    if (stopList) {stopList();stopList=null;}
    if (stopDetail) {stopDetail();stopDetail=null;}
    if (stopQuestion) {stopQuestion();stopQuestion=null;}
    currentQuestionId = null;
  };
  const message = (txt, cls='') => {
    const n = create('p','tech-note '+cls,txt); content.prepend(n); return n;
  };
  const permit = () => {
    if (!ready) {
      content.append(create('div','tech-gate','🔐 Para participar en las pruebas de esta sala necesitarás entrar con Google usando el botón «Tu cuenta» que aparece encima.'));
      return false;
    }
    return true;
  };
  async function report(type,id) {
    if (!ready || !confirm('¿Quieres enviar esta publicación para revisión por moderación?')) return;
    try {
      const { dbApi, db } = ctx;
      const key = user.uid + '_' + type + '_' + id;
      await dbApi.setDoc(dbApi.doc(db,'techReports',key), {
        uid:user.uid,resourceType:type,resourceId:id,
        reason:'contenido_inapropiado',createdAt:dbApi.serverTimestamp()
      });
      alert('Aviso recibido. Se revisará desde la consola de moderación.');
    } catch(err) {
      console.error('Denuncia',err);
      alert('No se pudo registrar el aviso. Comprueba si las reglas nuevas están publicadas.');
    }
  }
  function reportButton(type,id,ownerId) {
    if (!ready || ownerId === user.uid) return null;
    const b = create('button','tech-report','Denunciar');
    b.type='button'; b.addEventListener('click',()=>report(type,id));
    return b;
  }
  function renderQuestions() {
    content.replaceChildren();
    const title = create('h4','tech-section-title','Preguntas de informática');
    content.append(title);
    const explanation=create('p','tech-subtitle','Describe tu problema, elige una categoría y recibe respuestas en el mismo hilo.');
    content.append(explanation);
    if (!permit()) {
      const sample=create('div','tech-empty','📌 Próximamente podrás consultar preguntas reales y compartir tus soluciones.');
      content.append(sample);return;
    }
    const details=create('details','tech-new-question');
    const summary=create('summary','', '＋ Hacer una pregunta técnica');
    details.append(summary);
    const form=create('form','tech-question-form');
    const category=create('select','');
    category.name='category';category.required=true;category.setAttribute('aria-label','Categoría del problema');
    CATEGORIES.forEach(([value,label])=>{const opt=create('option','',label);opt.value=value;category.append(opt);});
    const titleInput=create('input','');
    titleInput.placeholder='Ejemplo: Mi portátil no detecta el Wi-Fi';
    titleInput.minLength=8;titleInput.maxLength=120;titleInput.required=true;titleInput.setAttribute('aria-label','Título de la pregunta');
    const detailsInput=create('textarea','');
    detailsInput.placeholder='Qué ocurre, qué has probado y qué sistema utilizas (sin datos personales)';
    detailsInput.minLength=20;detailsInput.maxLength=1200;detailsInput.rows=4;detailsInput.required=true;detailsInput.setAttribute('aria-label','Descripción técnica');
    const submit=create('button','tech-primary','Publicar pregunta');
    submit.type='submit';
    const feedback=create('p','tech-feedback','');
    form.append(category,titleInput,detailsInput,submit,feedback);
    details.append(form); content.append(details);
    const filterRow=create('div','tech-filter-row');
    filterRow.append(create('span','', 'Filtrar por categoría'));
    const filter=create('select','');
    filter.setAttribute('aria-label','Filtrar preguntas');
    const all=create('option','','Todas las categorías');all.value='all';filter.append(all);
    CATEGORIES.forEach(([value,label])=>{const opt=create('option','',label);opt.value=value;filter.append(opt);});
    filterRow.append(filter);content.append(filterRow);
    const list=create('div','tech-question-list');
    list.append(create('p','tech-empty','Cargando preguntas...'));
    content.append(list);
    const renderItems=()=>{
      list.replaceChildren();
      const filtered=questionItems.filter(q=>filter.value==='all'||q.category===filter.value);
      if(!filtered.length){list.append(create('p','tech-empty','Aún no hay preguntas en esta categoría. ¡Puedes inaugurarla!'));return;}
      filtered.forEach(q=>{
        const item=create('article','tech-question');
        const meta=create('div','tech-question-meta');
        const categoryLabel = create('span','tech-category',catLabel(q.category));
        meta.append(categoryLabel, create('span','',clock(q.createdAt)));
        if (q.status === 'resuelta') {
          meta.append(create('span','tech-solved-label','✅ Resuelta'));
          item.classList.add('tech-question-solved');
        }
        const h=create('button','tech-question-title',short(q.title,120));
        h.type='button';h.addEventListener('click',()=>showThread(q.id, q));
        item.append(meta,h,create('p','tech-excerpt',short(q.details,170)));
        const foot=create('div','tech-question-foot');
        foot.append(create('span','', 'Por '+short(q.nickname,24)));
        const reportBtn=reportButton('question',q.id,q.uid);
        if(reportBtn)foot.append(reportBtn);
        item.append(foot);
        list.append(item);
      });
    };
    filter.addEventListener('change',renderItems);
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(Date.now()-lastPublish<30000){feedback.textContent='Deja pasar 30 segundos entre publicaciones.';return;}
      const title=titleInput.value.trim(), desc=detailsInput.value.trim();
      if(title.length<8||desc.length<20){feedback.textContent='Añade un título y explica mejor el problema.';return;}
      submit.disabled=true;
      feedback.textContent='Publicando...';
      try {
        const {dbApi,db}=ctx;
        await dbApi.addDoc(dbApi.collection(db,'techQuestions'),{
          uid:user.uid,nickname:short(nickname(),24)||'Invitado',category:category.value,
          title,details:desc,status:'abierta',createdAt:dbApi.serverTimestamp()
        });
        lastPublish=Date.now();
        titleInput.value='';detailsInput.value='';details.open=false;
        feedback.textContent='Pregunta publicada.';
      } catch(err) {
        console.error('Pregunta',err);
        feedback.textContent='No se pudo publicar. Comprueba las reglas de Firebase.';
      } finally {submit.disabled=false;}
    });
    const {dbApi,db}=ctx;
    const q=dbApi.query(dbApi.collection(db,'techQuestions'),dbApi.orderBy('createdAt','desc'),dbApi.limit(30));
    stopList=dbApi.onSnapshot(q,snap=>{
      if(stopped||view!=='questions'||currentQuestionId) return;
      questionItems=snap.docs.map(doc=>({id:doc.id,...doc.data()}));renderItems();
    },error=>{
      console.error('Preguntas',error);
      if(!stopped&&view==='questions')list.replaceChildren(create('p','tech-empty','Las preguntas aún no están disponibles. Hay que publicar las reglas nuevas de Firebase.'));
    });
  }
  function showThread(id, question) {
    if (!ready) return;
    if (stopDetail) { stopDetail(); stopDetail = null; }
    if (stopQuestion) { stopQuestion(); stopQuestion = null; }
    currentQuestionId = id;

    content.replaceChildren();
    const back = create('button','tech-back','← Volver a preguntas');
    back.type = 'button';
    back.addEventListener('click', () => {
      disposeSubscriptions();
      renderQuestions();
    });
    content.append(back);

    const card = create('article','tech-question opened');
    const solvedBanner = create('div','tech-solved-banner','✅ Pregunta resuelta');
    solvedBanner.hidden = true;
    card.append(create('span','tech-category',catLabel(question.category)),
      create('h4','tech-thread-title',short(question.title,120)),
      create('p','tech-full-description',short(question.details,1200)),
      create('p','tech-question-by','Por '+short(question.nickname,24)+' · '+clock(question.createdAt)),
      solvedBanner);
    content.append(card,create('h4','tech-section-title','Respuestas de la comunidad'));

    const answers = create('div','tech-answer-list');
    answers.append(create('p','tech-empty','Cargando respuestas...'));
    content.append(answers);

    const form = create('form','tech-answer-form');
    const input = create('textarea','');
    input.rows=3;input.minLength=10;input.maxLength=800;input.required=true;
    input.placeholder='Comparte los pasos que podrían ayudar a resolver este problema...';
    input.setAttribute('aria-label','Tu respuesta');
    const btn=create('button','tech-primary','Enviar respuesta');btn.type='submit';
    const feedback=create('p','tech-feedback','');
    form.append(input,btn,feedback);content.append(form);

    const {dbApi,db}=ctx;
    const questionRef=dbApi.doc(db,'techQuestions',id);
    const answersRef=dbApi.collection(db,'techQuestions',id,'answers');
    const q=dbApi.query(answersRef,dbApi.orderBy('createdAt','asc'),dbApi.limit(80));
    let currentQuestion={...question}, loadedAnswers=null;

    const renderAnswers=()=>{
      solvedBanner.hidden=currentQuestion.status!=='resuelta';
      if (!loadedAnswers) return;
      answers.replaceChildren();
      if (loadedAnswers.empty) {
        answers.append(create('p','tech-empty','Todavía no hay respuestas. ¿Sabes cómo ayudar?'));
        return;
      }
      loadedAnswers.docs.forEach(doc=>{
        const data=doc.data();
        const accepted=currentQuestion.status==='resuelta' &&
          currentQuestion.solutionAnswerId===doc.id;
        const article=create('article','tech-answer');
        if (accepted) {
          article.classList.add('tech-accepted-answer');
          article.append(create('div','tech-solved-banner','✅ Solución aceptada'));
        }
        const head=create('div','tech-question-foot');
        head.append(create('strong','',short(data.nickname,24)),create('span','',clock(data.createdAt)));
        article.append(head,create('p','',short(data.text,800)));

        // Solo el autor de la pregunta puede elegir una solución.
        if (currentQuestion.uid===user.uid && !accepted) {
          const acceptBtn=create('button','tech-solve-button','✓ Marcar como solución');
          acceptBtn.type='button';
          acceptBtn.addEventListener('click',async ()=>{
            acceptBtn.disabled=true;
            feedback.textContent='Marcando solución...';
            try {
              await dbApi.updateDoc(questionRef, {
                status:'resuelta',
                solutionAnswerId:doc.id
              });
              feedback.textContent='¡Solución guardada!';
            } catch(error) {
              console.error('Marcar solución',error);
              feedback.textContent='No se pudo marcar. Comprueba que has publicado las nuevas reglas de Firebase.';
              acceptBtn.disabled=false;
            }
          });
          article.append(acceptBtn);
        }
        const reportBtn=reportButton('answer',doc.id,data.uid);
        if (reportBtn) article.append(reportBtn);
        answers.append(article);
      });
    };

    // Mantener en sincronía tanto los mensajes como el estado «resuelta».
    stopQuestion=dbApi.onSnapshot(questionRef, snap=>{
      if (stopped||currentQuestionId!==id) return;
      if (!snap.exists()) {
        feedback.textContent='Esta pregunta ya no está disponible.';
        return;
      }
      currentQuestion={...snap.data()};
      renderAnswers();
    },error=>{
      console.error('Estado de pregunta',error);
      feedback.textContent='No se pudo consultar el estado de esta pregunta.';
    });
    stopDetail=dbApi.onSnapshot(q,snapshot=>{
      if(stopped||currentQuestionId!==id) return;
      loadedAnswers=snapshot;
      renderAnswers();
    },error=>{
      console.error('Respuestas',error);
      answers.replaceChildren(create('p','tech-empty','No se pudieron cargar las respuestas.'));
    });

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const text=input.value.trim();
      if(text.length<10){feedback.textContent='Explica un poco más tu solución.';return;}
      if(Date.now()-lastPublish<15000){feedback.textContent='Espera unos segundos antes de enviar otro mensaje.';return;}
      btn.disabled=true;feedback.textContent='Enviando...';
      try {
        await dbApi.addDoc(answersRef,{uid:user.uid,nickname:short(nickname(),24)||'Invitado',text,createdAt:dbApi.serverTimestamp()});
        lastPublish=Date.now();input.value='';feedback.textContent='Respuesta publicada.';
      } catch(err){console.error('Respuesta',err);feedback.textContent='No se pudo publicar. Revisa las reglas.';}
      finally {btn.disabled=false;}
    });
  }
  function renderChat() {
    content.replaceChildren();
    content.append(create('h4','tech-section-title','Charla técnica en directo'),create('p','tech-subtitle','Para dudas rápidas, experiencias y conversación sobre informática.'));
    if(!permit())return;
    const list=create('div','tech-chat-messages');
    list.append(create('p','tech-empty','Conectando con la sala...'));
    const form=create('form','tech-chat-form');
    const input=create('input','');
    input.maxLength=300;input.required=true;input.placeholder='Escribe algo sobre informática...';
    input.setAttribute('aria-label','Mensaje de chat técnico');
    const send=create('button','tech-primary','Enviar');send.type='submit';
    const feedback=create('p','tech-feedback','');
    form.append(input,send);content.append(list,form,feedback);
    const {dbApi,db}=ctx;
    const room=dbApi.collection(db,'rooms','informatica','messages');
    const q=dbApi.query(room,dbApi.orderBy('createdAt','desc'),dbApi.limit(60));
    stopList=dbApi.onSnapshot(q,snapshot=>{
      if(stopped||view!=='chat')return;
      list.replaceChildren();
      if(snapshot.empty){list.append(create('p','tech-empty','Sé la primera persona en saludar. 💻'));return;}
      [...snapshot.docs].reverse().forEach(doc=>{
        const data=doc.data();
        const card=create('article','tech-chat-message');
        const head=create('div','tech-question-foot');
        head.append(create('strong','',short(data.nickname,24)),create('span','',clock(data.createdAt)));
        card.append(head,create('p','',short(data.text,300)));
        const b=reportButton('chat',doc.id,data.uid);
        if(b)card.append(b);
        list.append(card);
      });
      list.scrollTop=list.scrollHeight;
    },error=>{
      console.error('Chat IT',error);
      list.replaceChildren(create('p','tech-empty','Chat pendiente de activar en Firebase. No se han modificado tus otras salas.'));
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const text=input.value.trim();
      if(!text)return;
      if(Date.now()-lastPublish<5000){feedback.textContent='Espera 5 segundos entre mensajes.';return;}
      send.disabled=true;feedback.textContent='Enviando...';
      try{
        await dbApi.addDoc(room,{uid:user.uid,nickname:short(nickname(),24)||'Invitado',text,createdAt:dbApi.serverTimestamp()});
        lastPublish=Date.now();input.value='';feedback.textContent='';
      }catch(err){console.error('Chat IT',err);feedback.textContent='No se pudo enviar. Comprueba las reglas nuevas.';}
      finally{send.disabled=false;}
    });
  }
  function renderGuide() {
    content.replaceChildren();
    const rules=create('div','tech-guide');
    rules.append(create('h4','tech-section-title','Normas de la comunidad'));
    ['Sé respetuoso y ayuda sin ridiculizar dudas básicas.',
      'Describe el sistema, el error y lo que ya has probado.',
      'No compartas contraseñas, claves, datos personales ni IP públicas.',
      'No publiques enlaces peligrosos ni instrucciones para perjudicar a otros.',
      'Denuncia el contenido inapropiado para su revisión.'].forEach((rule,i)=>{
      rules.append(create('p','', (i+1)+'. '+rule));
    });
    rules.append(create('p','tech-subtitle','La plataforma está en pruebas. Las denuncias quedan pendientes de revisión manual por la administración.'));
    content.append(rules);
  }
  function activate(tab) {
    if(stopped)return;
    disposeSubscriptions();
    view=tab;
    questionsBtn.classList.toggle('selected',tab==='questions');
    chatBtn.classList.toggle('selected',tab==='chat');
    guideBtn.classList.toggle('selected',tab==='guide');
    if(tab==='questions')renderQuestions();
    else if(tab==='chat')renderChat();
    else renderGuide();
  }
  questionsBtn.addEventListener('click',()=>activate('questions'));
  chatBtn.addEventListener('click',()=>activate('chat'));
  guideBtn.addEventListener('click',()=>activate('guide'));
  activate('questions');
  return () => {stopped=true;disposeSubscriptions();};
}
