const ROLES = {
  chef: {label:'Chef de quai', icon:'⚓', img:null, dossier:null, desc:'Planifier, sécuriser et coordonner les opérations de quai.'},
  admin: {label:'Service administratif', icon:'▣', img:null, dossier:null, desc:'Contrôler les documents, tracer les écarts et communiquer.'},
  logistique: {label:'Équipe logistique', icon:'▦', img:null, dossier:null, desc:'Réceptionner, contrôler, isoler et transférer les marchandises.'},
  magasin: {label:'Magasin / gestion des stocks', icon:'◇', img:null, dossier:null, desc:'Gérer les emplacements, les mouvements et la fiabilité du stock.'}
};
const STAGES = [
  {n:1,title:'Arrivée en avance',type:'Aléa logistique',img:null,teams:['chef','admin'],doc:'D05',desc:'Geodis arrive à 09 h 10 pour la livraison Decathlon prévue à 09 h 30. Le quai 2 est encore occupé.'},
  {n:2,title:'Document manquant',type:'Aléa administratif',img:null,teams:['admin','logistique'],doc:'D06',desc:'Le bon de livraison n’est pas disponible. Le conducteur possède seulement son document de transport.'},
  {n:3,title:'Un opérateur absent',type:'Aléa managérial',img:null,teams:['chef','logistique'],doc:'D03',desc:'Un des deux opérateurs prévus est absent à 09 h 20. Il faut réorganiser les moyens.'},
  {n:4,title:'Danger sur le quai',type:'Aléa sécurité',img:null,teams:['chef','logistique'],doc:'D19',desc:'Flaque d’eau et emballages obstruent la voie piétonne près du quai 2.'},
  {n:5,title:'Quantité incorrecte',type:'Aléa documentaire',img:null,teams:['logistique','admin'],doc:'D08/D09',desc:'120 casquettes sont commandées mais seulement 118 sont physiquement reçues.'},
  {n:6,title:'Palette endommagée',type:'Aléa qualité',img:null,teams:['logistique','admin','magasin'],doc:'D10',desc:'La palette n°4, contenant des casquettes CAP-DEC-022, présente un carton écrasé et un film déchiré.'},
  {n:7,title:'Mauvaise information WMS',type:'Aléa numérique',img:null,teams:['admin','magasin','logistique'],doc:'D17',desc:'Le WMS affiche 120 casquettes réceptionnées alors que le contrôle physique en compte 118.'},
  {n:8,title:'Demande urgente du client',type:'Aléa commercial',img:null,teams:['admin','magasin','chef'],doc:'D15',desc:'Decathlon Nice demande 2 palettes de textile disponibles pour une expédition urgente à 14 h 00.'},
  {n:9,title:'Emplacement indisponible',type:'Aléa stockage',img:null,teams:['magasin','logistique'],doc:'D12/D11',desc:'A-03 est occupé. Le magasinier doit proposer un emplacement alternatif et tracer le transfert.'},
  {n:10,title:'Stock incohérent avant expédition',type:'Aléa transversal',img:null,teams:['magasin','admin','logistique'],doc:'D16',desc:'Le WMS affiche 238 casquettes, mais le comptage physique n’en retrouve que 236.'}
];
const DOCUMENTS = {
  D01:{label:'Planning des réceptions',roles:['chef'],always:true},D02:{label:'Plan des quais et circulation',roles:['chef'],always:true},D03:{label:'Affectation des moyens',roles:['chef'],always:true},
  D04:{label:'Bon de commande Decathlon',roles:['admin'],always:true},D05:{label:'Document de transport Geodis',roles:['admin','logistique'],always:true},D06:{label:'Bon de livraison Decathlon',roles:['admin','logistique'],stage:2},D07:{label:'Mail interne préparation réception',roles:['chef','admin'],always:true},
  D08:{label:'Fiche de contrôle réception',roles:['logistique'],always:true},D09:{label:'Fiche anomalie et réserve',roles:['admin'],always:true},D10:{label:'Fiche quarantaine / attente',roles:['logistique'],always:true},D11:{label:'Bon de transfert interne',roles:['logistique','magasin'],always:true},
  D12:{label:'Plan des emplacements / réserves',roles:['magasin'],always:true},D13:{label:'Extrait WMS — stock initial',roles:['magasin'],always:true},D14:{label:'Journal des mouvements stock',roles:['magasin'],always:true},D15:{label:'Mail urgent Decathlon Nice',roles:['admin'],stage:8},D16:{label:'Inventaire et régularisation',roles:['magasin'],always:true},D17:{label:'Écran WMS — écart de réception',roles:['admin','magasin'],stage:7},D18:{label:'Clôture réception',roles:['chef'],always:true},D19:{label:'Incident sécurité',roles:['chef','logistique'],always:true}
};
const DEFAULT_STATE = () => ({
  sessionCode:null,currentStage:0,started:false,closed:false,
  meta:{createdAt:Date.now(),updatedAt:Date.now(),expiresAt:Date.now()+30*24*60*60*1000},
  unlockedDocs:{D06:false,D15:false,D17:false},
  actions:{},notifications:[],logs:[],clients:{},
  reception:{id:'RC041126-03',date:'04/11/2026',time:'09 h 30',dock:2,pallets:8,weight:1240,carrier:'Geodis',supplier:'Decathlon France',arrival:null,driverWaiting:false,dockSafe:false,teamReady:false,documentsOK:false,physicalControl:false,quarantine:false,quarantineReleased:false,storageDone:false},
  order:{'TSH-DEC-014':240,'CAP-DEC-022':120,'BAG-DEC-011':96},
  delivered:{'TSH-DEC-014':240,'CAP-DEC-022':118,'BAG-DEC-011':96},
  counted:{'TSH-DEC-014':null,'CAP-DEC-022':null,'BAG-DEC-011':null},
  stocks:{'TSH-DEC-014':380,'CAP-DEC-022':120,'BAG-DEC-011':84,'CAP-OLD-004':210},
  locations:{'A-01':{category:'Textile',occupancy:72,available:true},'A-02':{category:'Sacs / accessoires',occupancy:61,available:true},'A-03':{category:'CAP-OLD-004',occupancy:100,available:false},'A-04':{category:'Mixte',occupancy:54,available:true}},
  selectedLocation:null,urgentTextileReserved:false,finalPhysicalCap:null,wmsReceptionCap:120,finalWmsCap:null,
  safety:{hazardReported:false,operationSuspended:false,areaSecured:false,restartApproved:false},
  anomaly:{qtyGap:false,reserveWritten:false,pallet4Damaged:false,quarantineDecision:null},
  admin:{missingDocReported:false,urgentReply:null},
  teacher:{pin:'2026'}
});
let state = loadLocal();
let role = null;
let view = 'dashboard';
let peer = null, connections = [], hostConn = null, isHost=false;

function loadLocal(){
  try{
    const raw=localStorage.getItem('azur-wms-state');
    if(!raw)return DEFAULT_STATE();
    const saved=JSON.parse(raw);
    const now=Date.now();
    const exp=saved?.meta?.expiresAt;
    if(exp && now>exp){localStorage.removeItem('azur-wms-state');return DEFAULT_STATE();}
    if(!saved.meta)saved.meta={createdAt:now,updatedAt:now,expiresAt:now+30*24*60*60*1000};
    return saved;
  }catch{return DEFAULT_STATE()}
}
function saveLocal(){
  const now=Date.now();
  state.meta=state.meta||{};
  state.meta.createdAt=state.meta.createdAt||now;
  state.meta.updatedAt=now;
  state.meta.expiresAt=now+30*24*60*60*1000;
  localStorage.setItem('azur-wms-state',JSON.stringify(state));
  broadcastLocal();
  if(isHost)broadcastState();
}
function formatSaveDate(ts){try{return new Date(ts).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}catch{return '—'}}
function exportBackup(){
  saveLocal();
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  const code=state.sessionCode||'LOCAL';
  a.href=URL.createObjectURL(blob);
  a.download=`AZUR_WMS_SAUVEGARDE_${code}_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
  toast('Sauvegarde exportée');
}
function requestImportBackup(){document.getElementById('backupFile')?.click()}
function importBackupFile(input){
  const file=input.files?.[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{try{
    const incoming=JSON.parse(reader.result);
    if(!incoming || typeof incoming!=='object' || !('currentStage' in incoming))throw new Error('format');
    state=incoming;
    saveLocal();
    render();
    toast('Sauvegarde restaurée');
  }catch{toast('Fichier de sauvegarde invalide')}};
  reader.readAsText(file);
  input.value='';
}
window.exportBackup=exportBackup;window.requestImportBackup=requestImportBackup;window.importBackupFile=importBackupFile;

function resetState(){const pin=state.teacher?.pin||'2026';state=DEFAULT_STATE();state.teacher.pin=pin;saveLocal();render()}
function broadcastLocal(){try{localStorage.setItem('azur-wms-ping',String(Date.now()))}catch{}}
window.addEventListener('storage',e=>{if(e.key==='azur-wms-ping'&&!isHost&&!hostConn){state=loadLocal();render()}});
function logAction(team,msg){state.logs.unshift({ts:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),team,msg});state.logs=state.logs.slice(0,80)}
function notify(target,msg){state.notifications.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),target,msg,stage:state.currentStage,ts:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),read:false})}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function qp(name){return new URLSearchParams(location.search).get(name)}
function sessionLink(code){const u=new URL(location.href);u.searchParams.set('session',code);u.searchParams.delete('role');return u.toString()}

function initPeerHost(code){if(!window.Peer){toast('Mode réseau indisponible : PeerJS non chargé. Le mode local reste actif.');return}
  isHost=true; state.sessionCode=code; saveLocal();
  peer = new Peer('azur-'+code,{debug:0});
  peer.on('open',()=>toast('Session classe active : '+code));
  peer.on('connection',conn=>{connections.push(conn);conn.on('open',()=>{conn.send({type:'state',state});});conn.on('data',data=>handleIncoming(data,conn));conn.on('close',()=>connections=connections.filter(c=>c!==conn));});
  peer.on('error',e=>toast('Réseau classe : '+e.type));
}
function connectPeer(code){if(!window.Peer){toast('Mode réseau indisponible. Utilisation locale.');return}
  peer = new Peer(undefined,{debug:0});
  peer.on('open',()=>{hostConn=peer.connect('azur-'+code,{reliable:true});hostConn.on('open',()=>{hostConn.send({type:'hello',role});toast('Connecté à la session '+code)});hostConn.on('data',data=>handleIncoming(data,hostConn));hostConn.on('close',()=>toast('Connexion à la professeure interrompue'));});
  peer.on('error',e=>toast('Connexion classe : '+e.type));
}
function handleIncoming(data,conn){if(!data)return;
  if(data.type==='state'){state=data.state; localStorage.setItem('azur-wms-state',JSON.stringify(state));render();return}
  if(isHost&&data.type==='action'){applyRemoteAction(data.payload);saveLocal();render();return}
  if(isHost&&data.type==='hello'){conn.teamRole=data.role;return}
}
function broadcastState(){connections.forEach(c=>{if(c.open)c.send({type:'state',state})})}
function submitAction(payload){if(hostConn&&hostConn.open){hostConn.send({type:'action',payload:{...payload,role}});toast('Action envoyée à la professeure');}else{applyRemoteAction({...payload,role});saveLocal();render();}}
function applyRemoteAction(a){const r=a.role||'inconnu';const k=a.key;state.actions[k]=a.value??true;logAction(r,a.log||k);
  if(k==='arrival_wait'){state.reception.driverWaiting=true;state.reception.arrival='09 h 10';notify('admin','Le conducteur Geodis est arrivé à 09 h 10 et a été orienté vers la zone d’attente.')}
  if(k==='missing_doc'){state.admin.missingDocReported=true;notify('teacher','Le service administratif a signalé l’absence du bon de livraison D06.')}
  if(k==='reorg_team'){state.reception.teamReady=true;notify('logistique','Le chef de quai a validé une réorganisation des moyens après l’absence d’un opérateur.')}
  if(k==='suspend_safety'){state.safety.operationSuspended=true;state.safety.hazardReported=true;notify('chef','L’équipe logistique signale le danger au quai 2. Opération suspendue.')}
  if(k==='secure_area'){state.safety.areaSecured=true;notify('chef','La zone a été balisée, la flaque traitée et les obstacles retirés.')}
  if(k==='approve_restart'){state.safety.restartApproved=true;state.reception.dockSafe=true;notify('logistique','Le chef de quai autorise la reprise des opérations.')}
  if(k==='count_goods'){Object.assign(state.counted,a.counted||{});state.reception.physicalControl=true;const cap=Number(state.counted['CAP-DEC-022']);state.anomaly.qtyGap=cap===118;notify('admin',`Contrôle physique terminé : CAP-DEC-022 = ${cap||'non saisi'} / 120 attendues.`)}
  if(k==='write_reserve'){state.anomaly.reserveWritten=true;notify('logistique','Le service administratif a enregistré une réserve pour l’écart de réception.')}
  if(k==='damage_pallet4'){state.anomaly.pallet4Damaged=true;state.reception.quarantine=true;state.anomaly.quarantineDecision='EN ATTENTE';notify('magasin','Palette n°4 CAP-DEC-022 placée temporairement en quarantaine / attente.')}
  if(k==='release_quarantine'){state.reception.quarantineReleased=true;state.reception.quarantine=false;state.anomaly.quarantineDecision='VALIDÉE';notify('magasin','Contrôle complémentaire terminé : sortie de quarantaine autorisée pour la palette n°4.')}
  if(k==='correct_wms'){state.wmsReceptionCap=118;notify('magasin','Écart de réception corrigé : 118 casquettes retenues dans le WMS.')}
  if(k==='urgent_reply'){state.admin.urgentReply=a.reply||'';state.urgentTextileReserved=true;notify('chef','Le service administratif confirme la demande urgente Decathlon Nice : 2 palettes de textile à préparer.')}
  if(k==='choose_location'){state.selectedLocation=a.location;notify('logistique',`Nouvel emplacement validé par le magasinier : ${a.location}.`)}
  if(k==='confirm_storage'){state.reception.storageDone=true;state.stocks['TSH-DEC-014']=620;state.stocks['CAP-DEC-022']=238;state.stocks['BAG-DEC-011']=180;notify('admin','Stockage validé : stocks WMS mis à jour après réception.')}
  if(k==='inventory_final'){state.finalPhysicalCap=Number(a.qty);notify('admin',`Inventaire ciblé CAP-DEC-022 : ${state.finalPhysicalCap} unités physiquement comptées pour 238 WMS.`)}
  if(k==='regularize_final'){state.finalWmsCap=state.finalPhysicalCap||236;state.stocks['CAP-DEC-022']=state.finalWmsCap;notify('teacher','Écart final de stock régularisé / tracé.')}
}

function canUnlockStage(n){if(n===1)return true;const prev=n-1;
 const req={1:['arrival_wait'],2:['missing_doc'],3:['reorg_team'],4:['approve_restart'],5:['count_goods','write_reserve'],6:['damage_pallet4','release_quarantine'],7:['correct_wms'],8:['urgent_reply'],9:['confirm_storage'],10:['inventory_final']}[prev]||[];
 return req.every(k=>state.actions[k]);
}
function triggerStage(n){if(!canUnlockStage(n)){toast('L’étape précédente n’est pas encore suffisamment traitée.');return}
 state.currentStage=Math.max(state.currentStage,n);state.started=true;
 if(n===2){state.unlockedDocs.D06=true;notify('admin','D06 — Bon de livraison Decathlon est désormais disponible.');notify('logistique','D06 — Bon de livraison Decathlon est désormais disponible.')}
 if(n===7){state.unlockedDocs.D17=true;notify('admin','D17 — Écran WMS : écart de réception débloqué.');notify('magasin','D17 — Écran WMS : écart de réception débloqué.')}
 if(n===8){state.unlockedDocs.D15=true;notify('admin','Nouveau message client : D15 — Demande urgente Decathlon Nice.')}
 const s=STAGES[n-1];s.teams.forEach(t=>notify(t,`ÉTAPE ${n} — ${s.title} : ${s.desc}`));logAction('professeure',`Déclenche l’étape ${n} — ${s.title}`);saveLocal();render();
}
function docUnlocked(id){const d=DOCUMENTS[id];return !!(d.always||state.unlockedDocs[id]||(d.stage&&state.currentStage>=d.stage&&state.unlockedDocs[id]));}
function notifForRole(r){return state.notifications.filter(n=>n.target===r||n.target==='all').slice(0,8)}
function roleStageRelevant(r,s){return s.teams.includes(r)}

function topbar(){return `<header class="topbar"><div class="brand"><div class="brand-mark">◈</div><div><h1>Azur Logistique</h1><small>WMS pédagogique — Seconde GATL</small></div></div><div class="top-meta"><span class="pill">Réception ${state.reception.id}</span><span class="pill">${state.started?'Étape '+state.currentStage+'/10':'Atelier non démarré'}</span>${role?`<span class="pill orange">${ROLES[role]?.label||'Professeure'}</span>`:''}</div></header>`}
function landing(){const session=qp('session')||state.sessionCode||'';return `<div class="shell">${topbar()}<main class="page"><section class="hero"><div><span class="status-chip orange">ATELIER PROFESSIONNEL — GESTION DES FLUX LOGISTIQUES</span><h2>Bienvenue sur la plateforme Azur Logistique</h2><p>Choisissez votre équipe métier. Aucune création de compte n’est requise. Les missions se débloquent au rythme des décisions prises par les services et des aléas déclenchés par la professeure.</p><div class="login-row">${session?`<span class="status-chip green">Session classe : ${session}</span>`:'<span class="hint">Mode local : vous pouvez tester tous les espaces sur cet ordinateur.</span>'}</div></div><div class="hero-visual"><strong>10</strong><span>aléas professionnels coordonnés</span><br><strong>4</strong><span>équipes métiers interconnectées</span></div></section><section class="role-grid">${Object.entries(ROLES).map(([k,r])=>`<article class="role-card">${r.img?`<img src="${r.img}" alt="">`:`<div class="role-visual">${r.icon}</div>`}<div class="role-body"><h3>${r.label}</h3><p>${r.desc}</p><button class="btn" onclick="enterRole('${k}')">Accéder à l’espace</button></div></article>`).join('')}<article class="role-card"><div class="role-body" style="padding-top:24px"><h3>Espace Professeure</h3><p>Déclencher les aléas, suivre les équipes et piloter la simulation.</p><div class="login-row"><input id="pin" type="password" placeholder="Code professeure"><button class="btn orange" onclick="enterTeacher()">Ouvrir</button></div><p class="hint">Code de démonstration : 2026</p></div></article></section></main></div>`}
window.enterRole=(r)=>{role=r;view='dashboard';const code=qp('session');if(code)connectPeer(code);render()}
window.enterTeacher=()=>{const pin=document.getElementById('pin').value;if(pin!==state.teacher.pin){toast('Code incorrect');return}role='teacher';view='pilot';render()}
window.go=(v)=>{view=v;render()}
window.leave=()=>{role=null;view='dashboard';render()}

function sidebar(){const teacher=role==='teacher';const items=teacher?[['pilot','Pilotage des 10 étapes'],['teams','Suivi des équipes'],['wms','Stocks & WMS'],['logs','Journal des actions'],['documents','Documents']]:[['dashboard','Tableau de bord'],['mission','Mission en cours'],['wms','WMS / stocks'],['documents','Documents'],['messages','Notifications']];return `<aside class="sidebar"><h3>${teacher?'Professeure':ROLES[role].label}</h3>${items.map(([v,l])=>`<button class="nav-btn ${view===v?'active':''}" onclick="go('${v}')">${l}</button>`).join('')}<hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><button class="nav-btn" onclick="leave()">← Changer d’espace</button>${!teacher?`<a class="nav-btn" style="display:block;text-decoration:none" href="${ROLES[role].dossier}" target="_blank">Ouvrir le dossier métier ↗</a>`:''}</aside>`}
function layout(content){return `<div class="shell">${topbar()}<div class="workspace">${sidebar()}<main class="main">${content}</main></div></div>`}

function roleDashboard(){const ns=notifForRole(role);const s=state.currentStage?STAGES[state.currentStage-1]:null;return layout(`<div class="section-title"><h2>Tableau de bord — ${ROLES[role].label}</h2><span class="status-chip ${state.started?'green':'orange'}">${state.started?'Atelier en cours':'En attente du démarrage'}</span></div><div class="kpi-grid"><div class="kpi"><small>Réception</small><b>09 h 30</b><span>Decathlon / Geodis</span></div><div class="kpi"><small>Quai</small><b>2</b><span>${state.reception.dockSafe?'Sécurisé':'À contrôler'}</span></div><div class="kpi"><small>Palettes</small><b>8</b><span>1 240 kg</span></div><div class="kpi"><small>Étape active</small><b>${state.currentStage||'—'}</b><span>${s?.title||'En attente'}</span></div></div>${s&&roleStageRelevant(role,s)?eventBlock(s):`<div class="card blue" style="margin-top:16px"><h3>Situation</h3><p>${state.started?'Aucune action prioritaire pour votre équipe sur l’étape actuelle. Surveillez les notifications des autres services.':'La professeure n’a pas encore déclenché la première situation.'}</p></div>`}<div class="card"><h3>Dernières notifications</h3>${ns.length?ns.map(n=>`<div class="alert"><b>${n.ts}</b> — ${n.msg}</div>`).join(''):'<p class="hint">Aucune notification pour le moment.</p>'}</div>`) }
function eventBlock(s){return `<div class="card orange" style="margin-top:16px"><div class="event-card"><img src="${s.img}" alt="Carte aléa étape ${s.n}"><div><span class="status-chip orange">Étape ${s.n} — ${s.type}</span><h3 style="font-size:24px;margin-top:10px">${s.title}</h3><p>${s.desc}</p><div class="actions"><button class="btn" onclick="go('mission')">Traiter la mission</button></div></div></div></div>`}
function roleMission(){const s=state.currentStage?STAGES[state.currentStage-1]:null;if(!s)return layout(`<div class="card"><h3>Aucune mission active</h3><p>Attendez le déclenchement de la professeure.</p></div>`);let html=`<div class="section-title"><h2>Mission en cours — étape ${s.n}</h2><span class="status-chip orange">${s.type}</span></div>${eventBlock(s)}`;html+=missionActions(role,s.n);return layout(html)}
function missionActions(r,n){if(!roleStageRelevant(r,STAGES[n-1]))return `<div class="card"><h3>Coordination interservices</h3><p>Cette étape ne nécessite pas d’action principale de votre équipe. Consultez vos notifications et restez disponible pour les autres services.</p></div>`;
 const done=k=>!!state.actions[k];
 if(r==='chef'&&n===1)return actionCard('Prendre en charge l’arrivée anticipée','Vérifiez le planning. Le quai 2 étant occupé, le conducteur doit attendre dans la zone prévue.','arrival_wait','Orienter le conducteur vers la zone d’attente',done('arrival_wait'));
 if(r==='admin'&&n===2)return actionCard('Constater le document manquant','Le bon de commande et le document de transport sont disponibles. Signalez l’absence du bon de livraison.','missing_doc','Signaler D06 manquant',done('missing_doc'));
 if(r==='logistique'&&n===2)return `<div class="card"><h3>Contrôle documentaire</h3><p>Ne commencez pas la réception définitive tant que le bon de livraison D06 n’est pas disponible. Le service administratif doit engager la démarche.</p>${docUnlocked('D06')?'<div class="alert success">D06 a été débloqué par la professeure.</div>':'<div class="alert danger">D06 est encore indisponible.</div>'}</div>`;
 if(r==='chef'&&n===3)return actionCard('Réorganiser les moyens','Un opérateur est absent. Organisez un renfort ou adaptez l’organisation sans dégrader la sécurité.','reorg_team','Valider la réorganisation',done('reorg_team'));
 if(r==='logistique'&&n===3)return `<div class="card"><h3>Équipe réception</h3><p>${state.actions.reorg_team?'Le chef de quai a validé une nouvelle organisation. Vous pouvez vous préparer avec les moyens attribués.':'Attendez la décision du chef de quai concernant le renfort et la nouvelle organisation.'}</p></div>`;
 if(r==='logistique'&&n===4)return `<div class="card red"><h3>Sécuriser le quai</h3><p>Une flaque et des emballages obstruent la circulation. La rapidité ne prime jamais sur la sécurité.</p><div class="actions"><button class="btn red" ${done('suspend_safety')?'disabled':''} onclick="submitAction({key:'suspend_safety',log:'Suspend le déchargement et signale le danger au quai 2'})">Suspendre l’opération</button><button class="btn green" ${!done('suspend_safety')||done('secure_area')?'disabled':''} onclick="submitAction({key:'secure_area',log:'Balisage effectué, flaque traitée et voie piétonne dégagée'})">Sécuriser la zone</button></div></div>`;
 if(r==='chef'&&n===4)return `<div class="card red"><h3>Autoriser ou non la reprise</h3><p>Vous ne pouvez autoriser la reprise que lorsque l’équipe confirme que la zone est sécurisée.</p><div class="alert ${state.safety.areaSecured?'success':'danger'}">Zone sécurisée : ${state.safety.areaSecured?'OUI':'NON'}</div><button class="btn green" ${!state.safety.areaSecured||done('approve_restart')?'disabled':''} onclick="submitAction({key:'approve_restart',log:'Autorise la reprise du déchargement après sécurisation'})">Autoriser la reprise</button></div>`;
 if(r==='logistique'&&n===5)return countForm();
 if(r==='admin'&&n===5)return `<div class="card"><h3>Traiter l’écart</h3><p>Quantité physique communiquée : <b>${state.counted['CAP-DEC-022']??'—'} casquettes</b> pour 120 commandées.</p><div class="actions"><button class="btn orange" ${!state.anomaly.qtyGap||done('write_reserve')?'disabled':''} onclick="submitAction({key:'write_reserve',log:'Enregistre une réserve pour 2 casquettes manquantes'})">Enregistrer la réserve</button></div></div>`;
 if(r==='logistique'&&n===6)return `<div class="card red"><h3>Palette n°4 — CAP-DEC-022</h3><p>Carton écrasé et film déchiré. L’intégrité des produits ne peut pas être confirmée immédiatement.</p><div class="actions"><button class="btn red" ${done('damage_pallet4')?'disabled':''} onclick="submitAction({key:'damage_pallet4',log:'Isole la palette n°4 CAP-DEC-022 en quarantaine / attente'})">Mettre en quarantaine</button><button class="btn green" ${!done('damage_pallet4')||done('release_quarantine')?'disabled':''} onclick="submitAction({key:'release_quarantine',log:'Contrôle complémentaire effectué : produits intacts, sortie de quarantaine autorisée'})">Valider après contrôle complémentaire</button></div></div>`;
 if((r==='admin'||r==='magasin')&&n===6)return `<div class="card"><h3>Suivi quarantaine</h3><p>Statut palette n°4 : <b>${state.anomaly.quarantineDecision||'Non déclarée'}</b>.</p></div>`;
 if((r==='admin'||r==='magasin')&&n===7)return `<div class="card orange"><h3>Corriger l’écart WMS</h3><p>Le WMS affiche 120 alors que 118 casquettes ont été physiquement comptées.</p>${docUnlocked('D17')?'<div class="alert">D17 est disponible.</div>':''}<button class="btn orange" ${done('correct_wms')?'disabled':''} onclick="submitAction({key:'correct_wms',log:'Corrige la réception WMS CAP-DEC-022 de 120 à 118'})">Corriger le WMS à 118</button></div>`;
 if(r==='logistique'&&n===7)return `<div class="card"><h3>Confirmation terrain</h3><p>Votre comptage physique de référence est <b>${state.counted['CAP-DEC-022']||118}</b>. Transmettez cette valeur aux services administratif et magasin.</p></div>`;
 if(r==='admin'&&n===8)return urgentForm();
 if((r==='magasin'||r==='chef')&&n===8)return `<div class="card"><h3>Demande Decathlon Nice</h3><p>${state.urgentTextileReserved?'Le service administratif a confirmé la demande de 2 palettes de textile. Vérifiez la disponibilité et coordonnez la préparation.':'Attendez la demande formalisée par le service administratif.'}</p></div>`;
 if(r==='magasin'&&n===9)return locationForm();
 if(r==='logistique'&&n===9)return `<div class="card"><h3>Transfert vers le stockage</h3><p>Emplacement choisi par le magasinier : <b>${state.selectedLocation||'en attente'}</b>.</p><button class="btn green" ${!state.selectedLocation||done('confirm_storage')?'disabled':''} onclick="submitAction({key:'confirm_storage',log:'Transfert réalisé et stockage Decathlon validé'})">Confirmer le transfert et le stockage</button></div>`;
 if(r==='magasin'&&n===10)return inventoryForm();
 if((r==='admin'||r==='logistique')&&n===10)return `<div class="card"><h3>Écart d’inventaire</h3><p>Le magasinier a compté <b>${state.finalPhysicalCap??'—'}</b> casquettes pour 238 unités WMS.</p>${r==='admin'?`<button class="btn orange" ${state.finalPhysicalCap===null||done('regularize_final')?'disabled':''} onclick="submitAction({key:'regularize_final',log:'Trace et régularise l’écart final de stock CAP-DEC-022'})">Tracer / régulariser l’écart</button>`:''}</div>`;
 return `<div class="card"><h3>Coordination</h3><p>Consultez vos documents et les informations transmises par les autres services.</p></div>`;
}
function actionCard(title,text,key,label,isDone){return `<div class="card blue"><h3>${title}</h3><p>${text}</p>${isDone?'<div class="alert success">Action réalisée et transmise.</div>':`<button class="btn" onclick="submitAction({key:'${key}',log:'${label.replaceAll("'","’")}'})">${label}</button>`}</div>`}
function countForm(){return `<div class="card"><h3>Contrôle quantitatif</h3><div class="form-grid">${[['TSH-DEC-014','Tee-shirt sport mixte',240],['CAP-DEC-022','Casquette de sport',120],['BAG-DEC-011','Sac à dos 30 L',96]].map(([ref,label,q])=>`<div class="field"><label>${ref} — ${label} (attendu ${q})</label><input id="count-${ref}" type="number" value="${state.counted[ref]??''}" placeholder="Quantité reçue"></div>`).join('')}</div><button class="btn" style="margin-top:12px" onclick="submitCounts()">Valider le comptage physique</button></div>`}
window.submitCounts=()=>{const counted={};['TSH-DEC-014','CAP-DEC-022','BAG-DEC-011'].forEach(r=>counted[r]=Number(document.getElementById('count-'+r).value));submitAction({key:'count_goods',counted,log:`Contrôle physique saisi : TSH ${counted['TSH-DEC-014']}, CAP ${counted['CAP-DEC-022']}, BAG ${counted['BAG-DEC-011']}`})}
function urgentForm(){return `<div class="card orange"><h3>D15 — Demande urgente Decathlon Nice</h3><p>Le client demande 2 palettes de textile disponibles pour une expédition à 14 h 00. Vérifiez le stock, les blocages et la coordination quai/magasin.</p><div class="field"><label>Réponse au client</label><textarea id="urgent-reply" placeholder="Rédigez votre réponse professionnelle...">${state.admin.urgentReply||''}</textarea></div><button class="btn orange" onclick="sendUrgentReply()">Transmettre la réponse et réserver 2 palettes</button></div>`}
window.sendUrgentReply=()=>submitAction({key:'urgent_reply',reply:document.getElementById('urgent-reply').value,log:'Répond à Decathlon Nice et réserve 2 palettes de textile pour 14 h 00'})
function locationForm(){return `<div class="card"><h3>A-03 est indisponible</h3><p>Choisissez un emplacement compatible et justifiez votre décision avec le plan de stockage.</p><div class="form-grid"><div class="field"><label>Nouvel emplacement</label><select id="loc"><option value="">— choisir —</option>${Object.entries(state.locations).filter(([k,v])=>v.available).map(([k,v])=>`<option value="${k}" ${state.selectedLocation===k?'selected':''}>${k} — ${v.category} — occupation ${v.occupancy}%</option>`).join('')}</select></div><div class="field"><label>Motif</label><input id="loc-reason" placeholder="Capacité, compatibilité, accessibilité..."></div></div><button class="btn" onclick="chooseLoc()">Valider l’emplacement</button></div>`}
window.chooseLoc=()=>{const l=document.getElementById('loc').value;if(!l){toast('Choisissez un emplacement.');return}submitAction({key:'choose_location',location:l,log:`Valide l’emplacement alternatif ${l} pour le stockage`})}
function inventoryForm(){return `<div class="card red"><h3>Inventaire ciblé CAP-DEC-022</h3><p>WMS : <b>238</b> unités. Effectuez le comptage physique de la réserve.</p><div class="field"><label>Quantité physique comptée</label><input id="inv" type="number" value="${state.finalPhysicalCap??236}"></div><button class="btn red" onclick="submitInventory()">Valider l’inventaire</button></div>`}
window.submitInventory=()=>submitAction({key:'inventory_final',qty:Number(document.getElementById('inv').value),log:`Inventaire ciblé CAP-DEC-022 : ${document.getElementById('inv').value} unités physiquement comptées`})

function wmsView(){const rows=[['TSH-DEC-014','Tee-shirt sport mixte',state.stocks['TSH-DEC-014'],state.reception.storageDone?'A-01':'A-01'],['CAP-DEC-022','Casquette de sport',state.stocks['CAP-DEC-022'],state.reception.storageDone?(state.selectedLocation||'A-02'):'A-02'],['BAG-DEC-011','Sac à dos 30 L',state.stocks['BAG-DEC-011'],'A-04'],['CAP-OLD-004','Casquette ancienne collection',state.stocks['CAP-OLD-004'],'A-03']];return layout(`<div class="section-title"><h2>WMS — Stock article</h2><span class="status-chip ${state.reception.storageDone?'green':'orange'}">${state.reception.storageDone?'Stock mis à jour':'Stock initial / réception en cours'}</span></div><div class="card"><table><thead><tr><th>Référence</th><th>Désignation</th><th class="num">Stock WMS</th><th>Emplacement</th><th>Statut</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="num">${r[2]}</td><td>${r[3]}</td><td>${r[0]==='CAP-DEC-022'&&state.reception.quarantine?'<span class="status-chip red">Quarantaine</span>':'<span class="status-chip green">Disponible</span>'}</td></tr>`).join('')}</tbody></table></div><div class="two-col"><div class="card"><h3>Réception CAP-DEC-022</h3><p>Commandé : <b>120</b></p><p>Physique : <b>${state.counted['CAP-DEC-022']??'—'}</b></p><p>WMS réception : <b>${state.wmsReceptionCap}</b></p></div><div class="card"><h3>Emplacements</h3>${Object.entries(state.locations).map(([k,v])=>`<div class="alert ${v.available?'':'danger'}"><b>${k}</b> — ${v.category} — ${v.occupancy}% — ${v.available?'disponible':'indisponible'}</div>`).join('')}</div></div>`) }
function documentsView(){const list=Object.entries(DOCUMENTS).filter(([id,d])=>role==='teacher'||d.roles.includes(role));return layout(`<div class="section-title"><h2>Documents et outils</h2><span class="hint">D06, D17 et D15 sont volontairement conditionnels.</span></div><div class="doc-grid">${list.map(([id,d])=>{const u=docUnlocked(id);return `<div class="doc ${u?'':'locked'}"><span class="status-chip">${id}</span>${!u?'<span class="lock">🔒</span>':''}<h4>${d.label}</h4><p>${u?'Disponible dans le workflow':'Document non encore déclenché par la professeure.'}</p>${u?`<button class="btn secondary" onclick="openDoc('${id}')">Consulter</button>`:''}</div>`}).join('')}</div>`)}
window.openDoc=(id)=>{modal(`<h3>${id} — ${DOCUMENTS[id].label}</h3><p>Document de référence du grand atelier. Dans cette version web, son déblocage est géré par le workflow. Les PDF complets pourront être ajoutés au site lors d'une mise à jour.</p>`) }
function messagesView(){const ns=notifForRole(role);return layout(`<div class="section-title"><h2>Notifications interservices</h2></div><div class="card">${ns.length?ns.map(n=>`<div class="alert"><b>Étape ${n.stage||'—'} · ${n.ts}</b><br>${n.msg}</div>`).join(''):'<p>Aucune notification.</p>'}</div>`)}

function teacherPilot(){const code=state.sessionCode;return layout(`<div class="section-title"><h2>Pilotage professeure</h2><div class="actions"><button class="btn secondary" onclick="createSession()">${code?'Relancer la session réseau':'Créer une session classe'}</button><button class="btn secondary" onclick="exportBackup()">Exporter sauvegarde</button><button class="btn secondary" onclick="requestImportBackup()">Restaurer sauvegarde</button><input id="backupFile" type="file" accept="application/json,.json" style="display:none" onchange="importBackupFile(this)"><button class="btn red" onclick="confirmReset()">Réinitialiser l’atelier</button></div></div>${code?`<div class="session-box"><b>Session : ${code}</b><p class="hint">Partagez ce lien aux élèves. Ils n’auront qu’à choisir leur équipe métier.</p><div class="session-link">${sessionLink(code)}</div><button class="btn secondary" style="margin-top:8px" onclick="copyLink()">Copier le lien</button></div>`:''}<div class="alert success"><b>Sauvegarde automatique active</b><br>Dernière sauvegarde : ${formatSaveDate(state.meta?.updatedAt)}<br>Conservation : 30 jours glissants après la dernière activité. Export JSON recommandé en fin de séance.</div><div class="card orange"><h3>Déclenchement des 10 étapes</h3><div class="stage-list">${STAGES.map(s=>{const active=state.currentStage===s.n,done=state.currentStage>s.n,allowed=canUnlockStage(s.n);return `<div class="stage ${active?'active':''} ${done?'done':''} ${!allowed&&!done&&!active?'locked':''}"><b>${s.n}. ${s.title}</b><p class="hint">${s.type}</p><button class="btn ${active?'orange':''}" ${!allowed&&state.currentStage<s.n?'disabled':''} onclick="triggerStage(${s.n})">${done?'Relancer':'Déclencher'}</button></div>`}).join('')}</div></div>${state.currentStage?eventBlock(STAGES[state.currentStage-1]):''}<div class="two-col"><div class="card"><h3>Documents conditionnels</h3>${['D06','D17','D15'].map(id=>`<div class="alert ${state.unlockedDocs[id]?'success':'danger'}"><b>${id}</b> — ${DOCUMENTS[id].label}<br>${state.unlockedDocs[id]?'DÉBLOQUÉ':'VERROUILLÉ'}</div>`).join('')}</div><div class="card"><h3>Progression clé</h3>${[['Arrivée traitée','arrival_wait'],['Document manquant signalé','missing_doc'],['Réorganisation équipe','reorg_team'],['Sécurité rétablie','approve_restart'],['Contrôle quantitatif','count_goods'],['Quarantaine traitée','release_quarantine'],['WMS corrigé','correct_wms'],['Urgence client traitée','urgent_reply'],['Stockage validé','confirm_storage'],['Inventaire final','inventory_final']].map(([l,k])=>`<div class="alert ${state.actions[k]?'success':''}">${state.actions[k]?'✓':'○'} ${l}</div>`).join('')}</div></div>`)}
window.createSession=()=>{const code=(state.sessionCode||Math.random().toString(36).slice(2,8).toUpperCase());if(peer){try{peer.destroy()}catch{}}initPeerHost(code);render()}
window.copyLink=()=>navigator.clipboard.writeText(sessionLink(state.sessionCode)).then(()=>toast('Lien copié'))
window.confirmReset=()=>{if(confirm('Réinitialiser tous les stocks, étapes et actions ?'))resetState()}
function teacherTeams(){const stats={chef:['arrival_wait','reorg_team','approve_restart'],admin:['missing_doc','write_reserve','urgent_reply','regularize_final'],logistique:['suspend_safety','secure_area','count_goods','damage_pallet4','release_quarantine','confirm_storage'],magasin:['correct_wms','choose_location','inventory_final']};return layout(`<div class="section-title"><h2>Suivi des équipes</h2></div><div class="role-grid">${Object.entries(ROLES).map(([r,info])=>{const a=stats[r],done=a.filter(k=>state.actions[k]).length;return `<div class="role-card"><img src="${info.img}"><div class="role-body"><h3>${info.label}</h3><p>${done}/${a.length} actions structurantes réalisées</p><div class="alert ${done===a.length?'success':''}">${Math.round(done/a.length*100)} %</div></div></div>`}).join('')}</div>`)}
function logsView(){return layout(`<div class="section-title"><h2>Journal des actions</h2></div><div class="card"><div class="timeline">${state.logs.length?state.logs.map(l=>`<div class="log"><b>${l.ts} — ${l.team}</b><br>${l.msg}</div>`).join(''):'<p>Aucune action enregistrée.</p>'}</div></div>`)}

function modal(content){const d=document.createElement('div');d.className='modal-backdrop';d.innerHTML=`<div class="modal"><div class="modal-head"><b>Azur Logistique — Document</b><button class="close">Fermer</button></div><div class="modal-body">${content}</div></div>`;d.querySelector('.close').onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()};document.body.appendChild(d)}
function render(){const app=document.getElementById('app');if(!role){app.innerHTML=landing();return}if(role==='teacher'){if(view==='pilot')app.innerHTML=teacherPilot();else if(view==='teams')app.innerHTML=teacherTeams();else if(view==='wms')app.innerHTML=wmsView();else if(view==='logs')app.innerHTML=logsView();else app.innerHTML=documentsView();return}if(view==='dashboard')app.innerHTML=roleDashboard();else if(view==='mission')app.innerHTML=roleMission();else if(view==='wms')app.innerHTML=wmsView();else if(view==='documents')app.innerHTML=documentsView();else app.innerHTML=messagesView()}
render();
