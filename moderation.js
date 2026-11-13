/** Panel de moderación de OndaChat.
 * Seguridad real en firestore.rules, no en mostrar/ocultar botones.
 * Solo se habilita tras comprobar moderadores/{uid}.active === true.
 */
const node=(tag, cls='', text='')=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  n.textContent=text;
  return n;
};
const short=(v,max=4000)=>String(v??'').slice(0,max);
const TYPES={question:'Pregunta',answer:'Respuesta',chat:'Mensaje de chat'};
const ROOMS=new Set(['general','pop','rock','electronica','chill','informatica']);
const when=ts=>{
  const d=ts?.toDate?.()||null;
  return d?d.toLocaleString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Fecha no disponible';
};
const signedWithGoogle=user=>Boolean(user?.providerData?.some(p=>p.providerId==='google.com'));

export async function isModerator(ctx){
  const user=ctx?.auth?.currentUser;
  if(!user||!signedWithGoogle(user))return false;
  try{
    const {dbApi,db}=ctx;
    const snapshot=await dbApi.getDoc(dbApi.doc(db,'moderators',user.uid));
    return snapshot.exists()&&snapshot.data()?.active===true;
  }catch(error){
    console.warn('Permisos de moderación aún no activados',error?.code||error);
    return false;
  }
}
export function mountModerationPanel({container,ctx}){
  let disposed=false,unsub=null,filter='pendientes',reports=[];
  const {dbApi,db,auth}=ctx;
  const user=auth.currentUser;
  const root=node('section','mod-panel');
  const heading=node('h4','mod-title','🛡️ Moderación de OndaChat');
  const intro=node('p','mod-intro','Revisa las denuncias y decide si descartar el aviso o retirar la publicación. Solo las personas administradoras autorizadas pueden realizar cambios.');
  const tabs=node('div','mod-filters');
  const pendingBtn=node('button','mod-filter active','Pendientes');
  const reviewedBtn=node('button','mod-filter','Revisadas');
  for(const b of [pendingBtn,reviewedBtn]){b.type='button';tabs.append(b)}
  const feed=node('div','mod-feed');
  feed.append(node('p','mod-empty','Cargando denuncias...'));
  root.append(heading,intro,tabs,feed);
  container.replaceChildren(root);

  const reportRef=d=>dbApi.doc(db,'techReports',d.id);
  const targetRef=d=>{
    const type=d.resourceType,id=d.resourceId,parent=d.parentId;
    if(typeof id!=='string'||!id||id.length>80||id.includes('/'))return null;
    if(type==='question')return dbApi.doc(db,'techQuestions',id);
    if(typeof parent!=='string'||!parent||parent.length>80||parent.includes('/'))return null;
    if(type==='answer')return dbApi.doc(db,'techQuestions',parent,'answers',id);
    if(type==='chat'&&ROOMS.has(parent))return dbApi.doc(db,'rooms',parent,'messages',id);
    return null;
  };
  const reportStatus=d=>d.status==='revisada'?'revisadas':'pendientes';
  const render=()=>{
    if(disposed)return;
    pendingBtn.classList.toggle('active',filter==='pendientes');
    reviewedBtn.classList.toggle('active',filter==='revisadas');
    const pendingCount=reports.filter(r=>reportStatus(r)==='pendientes').length;
    pendingBtn.textContent='Pendientes ('+pendingCount+')';
    reviewedBtn.textContent='Revisadas';
    feed.replaceChildren();
    const visible=reports.filter(r=>reportStatus(r)===filter);
    if(!visible.length){
      feed.append(node('p','mod-empty',filter==='pendientes'?'No hay denuncias pendientes en los últimos 100 registros.':'No hay denuncias revisadas entre los últimos 100 registros.'));
      return;
    }
    for(const report of visible){
      const card=node('article','mod-report');
      card.append(node('strong','mod-report-title',(TYPES[report.resourceType]||'Contenido')+' denunciado'));
      const meta=node('p','mod-report-meta',when(report.createdAt)+' · Motivo: contenido inapropiado');
      card.append(meta);
      const actions=node('div','mod-actions');
      const preview=node('div','mod-preview');
      const inspect=node('button','mod-action','Ver publicación');
      inspect.type='button';
      inspect.addEventListener('click',async()=>{
        inspect.disabled=true;preview.textContent='Buscando contenido...';
        try{
          const ref=targetRef(report);
          if(!ref){preview.textContent='Denuncia antigua o sin ruta válida. Revísala manualmente en Firebase.';return;}
          const snap=await dbApi.getDoc(ref);
          if(!snap.exists()){preview.textContent='Esta publicación ya no existe.';return;}
          const data=snap.data();
          preview.replaceChildren();
          if(data.title)preview.append(node('strong','',short(data.title,120)));
          preview.append(node('p','',short(data.details||data.text||'Contenido sin texto',1200)));
          preview.append(node('small','', 'Publicado por: '+short(data.nickname||'Anónimo',24)));
        }catch(error){
          console.error('Inspección de denuncia',error);
          preview.textContent='No se pudo consultar la publicación. Revisa los permisos.';
        }finally{inspect.disabled=false;}
      });
      actions.append(inspect);
      if(filter==='pendientes'){
        const dismiss=node('button','mod-action','Descartar denuncia');
        dismiss.type='button';
        dismiss.addEventListener('click',()=>review(report,false,dismiss));
        const remove=node('button','mod-action mod-danger','Eliminar publicación');
        remove.type='button';
        remove.addEventListener('click',()=>review(report,true,remove));
        actions.append(dismiss,remove);
      }
      card.append(actions,preview);
      feed.append(card);
    }
  };
  async function deleteContent(report){
    const ref=targetRef(report);
    if(!ref)throw new Error('No se puede localizar la publicación. Revisa la denuncia en Firebase.');
    const original=await dbApi.getDoc(ref);
    if(!original.exists())return; // Puede haberse retirado previamente.
    if(report.resourceType==='question'){
      // Firestore NO elimina subcolecciones automáticamente. Quitamos primero
      // respuestas (hasta 1000) para no dejar hilos huérfanos.
      const child=dbApi.collection(db,'techQuestions',report.resourceId,'answers');
      for(let page=0;page<10;page++){
        const batchDocs=await dbApi.getDocs(dbApi.query(child,dbApi.limit(100)));
        if(batchDocs.empty)break;
        const batch=dbApi.writeBatch(db);
        batchDocs.forEach(doc=>batch.delete(doc.ref));
        await batch.commit();
        if(batchDocs.size<100)break;
      }
      const rest=await dbApi.getDocs(dbApi.query(child,dbApi.limit(1)));
      if(!rest.empty)throw new Error('Aún quedan respuestas. Revísalas desde Firebase antes de eliminar la pregunta.');
    }
    await dbApi.deleteDoc(ref);
  }
  async function review(report,remove,button){
    const target=targetRef(report);
    if(remove&&!target){alert('Falta la ubicación de este contenido. Revisa la denuncia manualmente.');return;}
    const ok=confirm(remove?
      '¿Quieres retirar esta publicación? Esta acción no se puede deshacer.':
      '¿Quieres marcar esta denuncia como revisada sin borrar la publicación?');
    if(!ok)return;
    button.disabled=true;
    try{
      if(remove)await deleteContent(report);
      await dbApi.updateDoc(reportRef(report),{
        status:'revisada',reviewedBy:user.uid,reviewedAt:dbApi.serverTimestamp()
      });
    }catch(error){
      console.error('Error al moderar',error);
      alert('No se completó la operación: '+(error?.message||'Comprueba los permisos y las reglas de Firebase.'));
      button.disabled=false;
    }
  }
  pendingBtn.addEventListener('click',()=>{filter='pendientes';render()});
  reviewedBtn.addEventListener('click',()=>{filter='revisadas';render()});
  const query=dbApi.query(dbApi.collection(db,'techReports'),dbApi.orderBy('createdAt','desc'),dbApi.limit(100));
  unsub=dbApi.onSnapshot(query,snapshot=>{
    if(disposed)return;
    reports=snapshot.docs.map(d=>({id:d.id,...d.data()}));
    render();
  },error=>{
    if(disposed)return;
    console.error('Denuncias',error);
    feed.replaceChildren(node('p','mod-empty','No se pueden consultar las denuncias. Comprueba tu cuenta administradora y las reglas de Firestore.'));
  });
  return()=>{disposed=true;if(unsub)unsub()};
}
