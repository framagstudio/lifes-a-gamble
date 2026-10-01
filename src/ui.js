'use strict';
/* =====================================================================
   UI + RÉSEAU. Tous les appareils (hôte compris) affichent la partie
   à partir d'un état (V) et d'une suite d'événements (animations).
   ===================================================================== */
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PEER_PREFIX='lifesagamble-v1-';
const ORDER=['bottom','left','top','right'];

let MODE=null;          // 'solo' | 'host' | 'client'
let ME=0;               // ma place autour de la table
let V=null;             // état visible
let BUILT=false, deadShown=false, soloChar=0;
const UIS={selecting:false,sel:null,onTarget:null};

function ransom(text,seed=0){
  return [...text].map((ch,k)=>{
    if(ch===' ')return '<span class="rl sp"> </span>';
    const v=(k*7+seed*3+(k>>1))%5,r=((k*37+seed*11)%11)-5;
    return `<span class="rl v${v}" style="--r:${r}deg">${esc(ch)}</span>`;
  }).join('');
}
const faceHTML=t=>`<div class="card face t-${t}">${ICONS[t]}<span class="lbl">${TYPES[t].label}</span></div>`;
const backHTML=()=>`<div class="card back"></div>`;
const frameHTML=ch=>`<div class="frame" style="--c:${ch.c}">${ch.svg}</div>`;

/* ---------- son ---------- */
const SFX={ctx:null,on:true,
 init(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}},
 _noise(dur,f,q,g,type){const c=this.ctx;if(!c||!this.on)return;try{const n=c.createBuffer(1,Math.floor(c.sampleRate*dur),c.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);const s=c.createBufferSource();s.buffer=n;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const gn=c.createGain();gn.gain.value=g;s.connect(fl).connect(gn).connect(c.destination);s.start()}catch(e){}},
 _tone(f,dur,type,g,f2){const c=this.ctx;if(!c||!this.on)return;try{const o=c.createOscillator(),gn=c.createGain(),t=c.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(gn).connect(c.destination);o.start();o.stop(t+dur)}catch(e){}},
 bang(){this._noise(.8,650,.7,1.4,'lowpass');this._tone(130,.4,'sine',.9,38)},
 click(){this._tone(2400,.03,'square',.12);this._noise(.05,4500,1,.35,'highpass')},
 card(){this._noise(.13,2800,.8,.35,'bandpass')},
 spin(){for(let i=0;i<9;i++)setTimeout(()=>this._tone(1500+i*30,.02,'square',.05),i*125)},
 cut(){this._tone(260,.28,'sawtooth',.1,1300);this._noise(.3,3200,.6,.25,'bandpass')},
 tick(){this._tone(880,.06,'triangle',.12)},
 ping(){this._tone(1320,.12,'sine',.12)},
 win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this._tone(f,.28,'square',.07),i*130))},
 lose(){[392,330,262,196].forEach((f,i)=>setTimeout(()=>this._tone(f,.3,'triangle',.1),i*160))}
};
const SND_ON=`<svg viewBox="0 0 20 20"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 7q2 3 0 6M15 5q4 5 0 10" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`;
const SND_OFF=`<svg viewBox="0 0 20 20"><path d="M3 8h3l4-3v10l-4-3H3z" fill="currentColor"/><path d="M13 7l5 6M18 7l-5 6" stroke="currentColor" stroke-width="1.8"/></svg>`;

/* ---------- noms ---------- */
const VP=i=>V.players[i];
const chOf=i=>CHARS[VP(i).ci];
const plainName=i=>i===ME?'TOI':VP(i).name.toUpperCase();
const nm=i=>`<b style="color:${chOf(i).c}">${i===ME?'Toi':esc(VP(i).name)}</b>`;
const fmt=s=>String(s||'').replace(/\{\{p(\d)\}\}/g,(_,i)=>nm(+i)).replace(/\{\{n(\d)\}\}/g,(_,i)=>esc(plainName(+i)));
const posOf=abs=>ORDER[(abs-ME+4)%4];
const seatEl=i=>document.getElementById('seat'+i);

/* ---------- construction & rendu ---------- */
function buildSeats(){
  const me=$('.me'),hc=$('.handcol'),scene=$('#scene');
  for(let i=0;i<4;i++){
    const p=VP(i),ch=CHARS[p.ci],el=seatEl(i);
    el.className='seat';el.dataset.pos=posOf(i);el.style.setProperty('--c',ch.c);
    el.innerHTML=`<div class="fbox"><span class="turn-tag"></span><div class="rim">${frameHTML(ch)}</div><div class="stamp">ÉLIMINÉ</div></div>
      <div class="plate"><span class="pname"></span></div>
      <div class="meta"><div class="gun"></div><span class="risk"></span><div class="cards"></div></div>
      <button class="kickbtn" hidden>Remplacer par une IA</button>`;
    el.onclick=e=>{if(el.classList.contains('targetable')&&UIS.onTarget)UIS.onTarget(i)};
    el.querySelector('.kickbtn').onclick=e=>{e.stopPropagation();askKick(i)};
    if(i===ME)me.insertBefore(el,hc);else scene.appendChild(el);
  }
  BUILT=true;
}
function renderSeat(i){
  const p=VP(i),el=seatEl(i);if(!el)return;
  el.classList.toggle('dead',!p.alive);
  const turn=V.cur===i&&p.alive&&!V.over,dec=V.deciding===i&&p.alive;
  el.classList.toggle('turn',turn||dec);
  el.querySelector('.turn-tag').textContent=dec?(i===ME?'À TOI DE JUGER':'RÉFLÉCHIT…'):(i===ME?'À TOI':'SON TOUR');
  el.querySelector('.pname').innerHTML=(i===ME?'TOI · ':'')+esc(i===ME?CHARS[p.ci].name:p.name)+(p.ai&&i!==ME&&MODE!=='solo'?' <i class="aitag">IA</i>':'');
  let g='';for(let k=0;k<6;k++)g+=`<b class="${k<p.fired?'spent':''}"></b>`;
  el.querySelector('.gun').innerHTML=g;
  const r=el.querySelector('.risk'),rk=1/(6-p.fired);
  r.textContent=p.alive?`${Math.round(rk*100)} %`:'—';r.classList.toggle('hot',rk>=.34);
  r.title='Chance que le prochain tir de cette arme soit réel';
  el.querySelector('.cards').innerHTML=i===ME?'':Array.from({length:p.n},()=>'<i class="mini"></i>').join('');
  el.querySelector('.kickbtn').hidden=!(MODE==='host'&&p.rm&&!V.over);
}
function renderHand(){
  const h=$('#hand'),me=VP(ME);
  h.classList.toggle('pickable',UIS.selecting);
  if(!me.alive){h.innerHTML='<div class="hand-note">Tu es tombé. Tu regardes la fin de la partie.</div>';return}
  if(!V.hand.length){h.innerHTML='<div class="hand-note">Plus de cartes en main.</div>';return}
  h.innerHTML=V.hand.map((t,k)=>{const sel=UIS.selecting&&UIS.sel===k;return `<div class="card face t-${t}${sel?' sel':''}" data-k="${k}" tabindex="${UIS.selecting?0:-1}" role="button" aria-label="${TYPES[t].label}">${sel&&t!==V.table?'<span class="tag">BLUFF</span>':''}${ICONS[t]}<span class="lbl">${TYPES[t].label}</span></div>`}).join('');
  h.querySelectorAll('.card').forEach(el=>{const f=()=>{if(!UIS.selecting)return;UIS.sel=+el.dataset.k;SFX.tick();renderHand();UIS.onSel&&UIS.onSel()};el.onclick=f;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}});
}
function renderCenter(){
  $('#tablecard').innerHTML=`${ICONS[V.table]}<span>TABLE DES ${TYPES[V.table].plural}</span>`;
  $('#claims').innerHTML=`<b>${V.claims}</b> annonce${V.claims>1?'s':''} · seulement <b>5</b> ${TYPES[V.table].plural} existent`;
  $('#pile').innerHTML=V.pile.map(e=>`<div class="pc" style="transform:translate(-50%,-50%) translate(${e.dx}px,${e.dy}px) rotate(${e.rot}deg)">${e.t?faceHTML(e.t):backHTML()}</div>`).join('');
  $('#roundlbl').textContent=`MANCHE ${V.round||1}`;
}
function renderAll(){
  if(!V)return;
  if(!BUILT)buildSeats();
  for(let i=0;i<4;i++)renderSeat(i);
  renderHand();renderCenter();
  const me=VP(ME);
  if(!me.alive&&!deadShown&&!V.over){
    deadShown=true;SFX.lose();
    const btns=[{label:'REGARDER LA FIN',cls:'red',on:closeModal}];
    if(MODE==='solo')btns.push({label:'REJOUER',on:()=>{closeModal();startSolo(soloChar)}});
    modal('ÉLIMINÉ',MODE==='host'?'La balle était pour toi. Garde cet onglet ouvert : la partie des autres tourne sur ton appareil.':'La balle était pour toi. Les autres continuent sans toi.',btns,CHARS[me.ci]);
  }
}
function log(html){const l=$('#log');const d=document.createElement('div');d.innerHTML=html;l.appendChild(d);while(l.children.length>6)l.firstChild.remove()}

/* ---------- prompt ---------- */
let promptIv=null;
function showPrompt({text,timer,buttons=[]}){
  hidePrompt();
  const pr=$('#prompt');
  pr.innerHTML=`<div class="ptext"><span>${text}</span></div>${buttons.length?'<div class="pbtns"></div>':''}${timer?`<div class="ptimer"><i style="animation-duration:${timer}ms"></i></div>`:''}`;
  const row=pr.querySelector('.pbtns');
  buttons.forEach(b=>{const e=document.createElement('button');e.className='btn'+(b.cls?' '+b.cls:'');e.innerHTML=`<span>${b.label}</span>`;if(b.id)e.id=b.id;if(b.disabled)e.disabled=true;e.onclick=()=>{SFX.tick();b.on()};row.appendChild(e)});
  if(timer){let left=Math.ceil(timer/1000);promptIv=setInterval(()=>{left--;if(left<=3&&left>0)SFX.tick()},1000)}
}
function hidePrompt(){clearInterval(promptIv);promptIv=null;$('#prompt').innerHTML=''}

/* ---------- demandes au joueur ---------- */
function clearAsk(){
  UIS.selecting=false;UIS.sel=null;UIS.onSel=null;UIS.onTarget=null;
  document.querySelectorAll('.seat.targetable').forEach(e=>e.classList.remove('targetable','picked'));
  hidePrompt();if(V&&BUILT)renderHand();
}
function onAsk(kind,data,ms,answer,preview){
  clearAsk();SFX.ping();
  const art=TYPES[V.table].art;
  if(kind==='play'){
    UIS.selecting=true;UIS.sel=null;renderHand();
    showPrompt({text:`À toi. Choisis une carte et annonce : <b>« C’est ${art} »</b>`,buttons:[{label:'POSER FACE CACHÉE',cls:'red',id:'btn-play',disabled:true,on:()=>{if(UIS.sel==null)return;const k=UIS.sel;clearAsk();answer(k)}}]});
    UIS.onSel=()=>{const b=$('#btn-play');if(b){b.disabled=false;const lie=V.hand[UIS.sel]!==V.table;b.innerHTML=`<span>${lie?'BLUFFER':'POSER'} · « ${art.toUpperCase()} »</span>`}};
  }else if(kind==='accuse'){
    showPrompt({text:`${nm(data.placer)} annonce <b>${art}</b>. Tu es le suivant : tu le crois ?`,buttons:[
      {label:'MENTEUR !',cls:'red',on:()=>{clearAsk();answer(true)}},
      {label:'LAISSER PASSER',on:()=>{clearAsk();answer(false)}}]});
  }else{
    let pickT=null;
    const draw=()=>{
      data.cands.forEach(j=>{const el=seatEl(j);el.classList.add('targetable');el.classList.toggle('picked',j===pickT)});
      if(pickT!=null){setAims([[ME,pickT]],false);preview&&preview(pickT)}
      showPrompt({text:pickT==null?`${fmt(data.title)} · touche un adversaire`:`Cible : ${nm(pickT)}. Tu confirmes ?`,buttons:[
        {label:pickT==null?'CHOISIS UNE CIBLE':`TIRER SUR ${esc(plainName(pickT))}`,cls:'red',id:'btn-fire',disabled:pickT==null,on:()=>{if(pickT==null)return;const t=pickT;clearAsk();answer(t)}}]});
    };
    UIS.onTarget=j=>{if(!data.cands.includes(j))return;SFX.tick();pickT=j;draw()};
    draw();
  }
}

/* ---------- effets ---------- */
function centerOf(el){const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}}
const fboxOf=i=>seatEl(i).querySelector('.fbox');
async function flyCard(fromEl,toEl,html,{dur=420,rot=0,scale=1}={}){
  if(!fromEl||!toEl)return;
  const f=document.createElement('div');f.className='fly';f.innerHTML=html;f.style.setProperty('--d',dur+'ms');
  document.body.appendChild(f);
  const w=f.offsetWidth,h=f.offsetHeight,a=centerOf(fromEl),b=centerOf(toEl);
  f.style.left=(a.x-w/2)+'px';f.style.top=(a.y-h/2)+'px';f.style.transform='scale(.8) rotate(-20deg)';
  void f.offsetWidth;
  f.style.transform=`translate(${b.x-a.x}px,${b.y-a.y}px) rotate(${rot}deg) scale(${scale})`;
  SFX.card();await sleep(dur+20);f.remove();
}
function say(i,text,ms=2300){
  if(!BUILT||!VP(i))return;
  document.querySelectorAll(`.bubble[data-p="${i}"]`).forEach(e=>e.remove());
  const r=fboxOf(i).getBoundingClientRect();
  const b=document.createElement('div');b.className='bubble';b.dataset.p=i;b.textContent=text;$('#bubbles').appendChild(b);
  const bw=b.offsetWidth,bh=b.offsetHeight,W=innerWidth,H=innerHeight,portrait=W<H*.8,pos=posOf(i);
  let x,y;
  if(pos==='bottom'){x=r.right+10;y=r.top-bh*.4}
  else if(portrait){x=r.left;y=r.bottom+50}
  else if(pos==='left'){x=r.right+12;y=r.top+8}
  else if(pos==='right'){x=r.left-bw-12;y=r.top+8}
  else{x=r.right+14;y=r.top+r.height*.25}
  b.style.left=clamp(x,8,W-bw-8)+'px';b.style.top=clamp(y,52,H-bh-8)+'px';
  setTimeout(()=>{b.classList.add('out');setTimeout(()=>b.remove(),220)},ms);
}
function flash(red){const f=$('#flash');f.className='';void f.offsetWidth;f.className='go'+(red?' red':'')}
function shake(){const s=$('#scene');s.classList.remove('shake');void s.offsetWidth;s.classList.add('shake')}
function burstAt(x,y,real){const b=document.createElement('div');b.className='burst '+(real?'bang':'clic');b.innerHTML=`<span>${real?'BANG!':'CLIC'}</span>`;b.style.left=x+'px';b.style.top=y+'px';document.body.appendChild(b);setTimeout(()=>b.remove(),950)}
/* visées en cours : tireur -> {t: cible, final: validée ?} */
let AIMS={};
function setAims(pairs,final=true){pairs.forEach(([s,t])=>{AIMS[s]={t,final}});renderAims()}
function clearAims(){AIMS={};$('#aim').innerHTML='';document.querySelectorAll('.seat.aimed').forEach(e=>e.classList.remove('aimed'))}
function renderAims(){
  if(!BUILT||!V)return;
  const svg=$('#aim');svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
  document.querySelectorAll('.seat.aimed').forEach(e=>e.classList.remove('aimed'));
  svg.innerHTML=Object.entries(AIMS).map(([s,{t,final}])=>{
    s=+s;const col=CHARS[VP(s).ci].c,a=centerOf(fboxOf(s)),b=centerOf(fboxOf(t));
    seatEl(t).classList.add('aimed');
    const cls=final?'fin':'pre';
    if(s===t)return `<circle class="${cls}" style="--lc:${col}" cx="${a.x}" cy="${a.y}" r="${fboxOf(t).getBoundingClientRect().width*.42}"/>`;
    const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,ox=-dy/L*6*((s%2)?1:-1),oy=dx/L*6*((s%2)?1:-1);
    return `<g class="${cls}" style="--lc:${col}"><line x1="${a.x+ox}" y1="${a.y+oy}" x2="${b.x+ox}" y2="${b.y+oy}"/><circle cx="${b.x+ox}" cy="${b.y+oy}" r="22"/><text x="${a.x+(b.x-a.x)*.5+ox}" y="${a.y+(b.y-a.y)*.5+oy-8}">${esc(plainName(s))}${final?' ✓':'…'}</text></g>`;
  }).join('');
}
window.addEventListener('resize',()=>renderAims());
function cylSVG(fired){
  let s='';for(let k=0;k<6;k++){const a=(k*60-90)*Math.PI/180,x=50+28*Math.cos(a),y=50+28*Math.sin(a);s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="${k<fired?'#2a1a20':'#f2b33d'}" stroke="${O}" stroke-width="3"/>`}
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#5d5458" stroke="${O}" stroke-width="5"/><circle cx="50" cy="50" r="40" fill="none" stroke="#8a8085" stroke-width="2"/>${s}<circle cx="50" cy="50" r="8" fill="#2a1a20" stroke="${O}" stroke-width="3"/></svg>`;
}
let cutT=null;
function cutIn(ch,text,sub,color,seed=7){
  const c=$('#cutin');
  c.innerHTML=`<div class="band" style="--c:${color||(ch?ch.c:'#e3122b')}">${ch?`<div class="cpic">${ch.svg}</div>`:''}<div class="ctext"><span class="ransom">${ransom(text,seed)}</span>${sub?`<small>${sub}</small>`:''}</div></div>`;
  c.hidden=false;SFX.cut();clearTimeout(cutT);cutT=setTimeout(()=>{c.hidden=true},1350);
}
let revT=null;
async function showReveal(t,verdict,truth){
  const rv=$('#reveal');clearTimeout(revT);
  rv.innerHTML=`<div class="flip"><div class="inner">${backHTML()}${faceHTML(t)}</div></div>`;rv.hidden=false;
  await sleep(380);rv.querySelector('.inner')?.classList.add('on');SFX.card();
  await sleep(560);
  const v=document.createElement('div');v.className='verdict '+(truth?'truth':'lie');v.textContent=verdict;rv.appendChild(v);
  if(!truth)flash(true);
  revT=setTimeout(()=>{rv.hidden=true},1100);
}

/* ---------- événements du moteur ---------- */
function onEvent(ev){
  if(!V||!BUILT){if(ev.e==='end')onEnd(ev);return}
  switch(ev.e){
    case 'round':V.round=ev.round;V.table=ev.table;renderCenter();cutIn(null,`MANCHE ${ev.round}`,`TABLE DES ${TYPES[ev.table].plural} · ${ev.alive} joueurs en vie`,ev.table==='ROI'?'#f2b33d':'#e3122b',ev.round);break;
    case 'deal':flyCard($('#pile'),ev.seat===ME?$('#hand'):fboxOf(ev.seat),backHTML(),{dur:250,rot:rand(-10,10),scale:.7});VP(ev.seat).n++;renderSeat(ev.seat);break;
    case 'play':flyCard(ev.seat===ME?$('#hand'):fboxOf(ev.seat),$('#pile'),backHTML(),{dur:380,rot:ev.rot,scale:.75});break;
    case 'say':say(ev.seat,ev.text,ev.ms);break;
    case 'log':log(fmt(ev.html));break;
    case 'cutin':cutIn(ev.seat!=null?chOf(ev.seat):null,ev.text,fmt(ev.sub),null,ev.seat??7);break;
    case 'reveal':showReveal(ev.t,ev.verdict,ev.truth);break;
    case 'aim':setAims(ev.pairs,true);break;
    case 'aimset':setAims([[ev.s,ev.t]],!!ev.final);break;
    case 'shotbox':$('#shotbox').innerHTML=`<div class="duel">${esc(plainName(ev.s))} ${ev.s===ev.t?'<em>➜ SUR LUI-MÊME</em>':`<em>➜</em> ${esc(plainName(ev.t))}`}</div><div class="cyl spin">${cylSVG(ev.fired)}</div><div class="odds">Chance de balle réelle : 1 sur ${6-ev.fired}</div>`;SFX.spin();break;
    case 'fire':{
      let any=false;
      ev.results.forEach(r=>{const c=centerOf(fboxOf(r.t));burstAt(c.x+(ev.results.length>1?rand(-20,20):0),c.y,r.real);if(r.real)any=true;
        const el=seatEl(r.t);el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')});
      if(any){SFX.bang();flash();shake()}else SFX.click();
      break}
    case 'clearAim':clearAims();$('#shotbox').innerHTML='';break;
    case 'count':{const d=document.createElement('div');d.className='count';d.textContent=ev.n;document.body.appendChild(d);SFX.tick();setTimeout(()=>d.remove(),700);break}
    case 'flash':flash(ev.red);break;
    case 'end':onEnd(ev);break;
  }
}
function onEnd(ev){
  closeModal();clearAsk();
  const w=ev.winner;
  const btns=[];
  if(MODE==='solo'){btns.push({label:'REJOUER',cls:'red',on:()=>{hideEnd();startSolo(soloChar)}},{label:'CHANGER DE PERSO',on:()=>{hideEnd();openSelect()}},{label:'MENU',cls:'dark',on:()=>{hideEnd();toMenu()}})}
  else if(MODE==='host'){btns.push({label:'REJOUER AVEC LE SALON',cls:'red',on:()=>{hideEnd();hostRestart()}},{label:'QUITTER',cls:'dark',on:()=>{hideEnd();toMenu()}})}
  else btns.push({label:'QUITTER',cls:'dark',on:()=>{hideEnd();toMenu()}});
  const note=MODE==='client'?' L’hôte peut relancer une partie avec le même salon.':'';
  if(w<0){SFX.lose();showEnd('PERSONNE',null,'Tout le monde a tiré en même temps. Le bar ferme plus tôt ce soir.'+note,btns);return}
  const p=VP(w),ch=CHARS[p.ci];
  if(w===ME){SFX.win();showEnd('VICTOIRE',ch,`Dernier debout après ${ev.rounds} manche${ev.rounds>1?'s':''}. Le bar t’offre la tournée.`+note,btns)}
  else{SFX.lose();showEnd('GAME OVER',ch,`${p.name} rafle la mise après ${ev.rounds} manche${ev.rounds>1?'s':''}.`+note,btns)}
}

/* ---------- écrans ---------- */
function wipe(){const w=$('#wipe');w.classList.remove('go');void w.offsetWidth;w.classList.add('go')}
function showScreen(id){wipe();setTimeout(()=>{document.querySelectorAll('.screen:not(#modal)').forEach(s=>s.hidden=s.id!==id)},300)}
function hideScreens(){document.querySelectorAll('.screen').forEach(s=>s.hidden=true)}
function btnRow(row,btns){row.innerHTML='';btns.forEach(b=>{const e=document.createElement('button');e.className='btn'+(b.cls?' '+b.cls:'');e.innerHTML=`<span>${b.label}</span>`;e.onclick=()=>{SFX.tick();b.on()};row.appendChild(e)})}
const picHTML=ch=>ch?`<div class="rimx">${frameHTML(ch)}</div>`:'';
function showEnd(title,ch,sub,btns){$('#endtitle').innerHTML=ransom(title,3);$('#endpic').innerHTML=picHTML(ch);$('#endsub').textContent=sub;btnRow($('#endbtns'),btns);$('#scr-end').hidden=false}
function hideEnd(){$('#scr-end').hidden=true}
function modal(title,sub,btns,ch){$('#mtitle').innerHTML=ransom(title,2);$('#mpic').innerHTML=picHTML(ch);$('#msub').textContent=sub;btnRow($('#mbtns'),btns);$('#modal').hidden=false}
function closeModal(){$('#modal').hidden=true}

function resetTable(){
  clearAsk();
  document.querySelectorAll('.fly,.burst,.count,.bubble').forEach(e=>e.remove());
  clearAims();$('#shotbox').innerHTML='';$('#reveal').hidden=true;$('#cutin').hidden=true;$('#log').innerHTML='';
  closeModal();hideEnd();BUILT=false;deadShown=false;V=null;
  const scene=$('#scene');for(let i=0;i<4;i++){const el=seatEl(i);el.innerHTML='';scene.appendChild(el)}
}
function toMenu(){
  abortEngine();
  if(MODE==='host')hostShutdown();
  if(MODE==='client')clientShutdown();
  MODE=null;resetTable();updateNetPill();
  history.replaceState(null,'',location.pathname);
  showScreen('scr-title');
}
function askKick(i){
  if(MODE!=='host'||!E)return;
  modal('REMPLACER ?',`${EP(i).name} ne joue plus ? Une IA prend sa place pour le reste de la partie.`,[{label:'OUI, UNE IA',cls:'red',on:()=>{closeModal();hostKick(i)}},{label:'ANNULER',on:closeModal}]);
}

/* ---------- branchement du moteur sur l'affichage (solo et hôte) ---------- */
function wireHostHooks(){
  HOOK.emit=ev=>{onEvent(ev);if(MODE==='host')for(const p of E.players)if(p.peer)send(p.peer,{t:'ev',ev})};
  HOOK.sync=()=>{V=stateFor(ME);renderAll();if(MODE==='host')for(const p of E.players)if(p.peer)send(p.peer,{t:'state',s:stateFor(p.i)})};
  HOOK.ask=(i,kind,data,ms)=>{const p=EP(i);if(p.kind==='local')onAsk(kind,data,ms,v=>engAnswer(i,v),v=>engAimPreview(i,v));else if(p.peer)send(p.peer,{t:'ask',kind,data,ms})};
  HOOK.cancelAsk=i=>{const p=EP(i);if(p.kind==='local')clearAsk();else if(p.peer)send(p.peer,{t:'cancelAsk'})};
}

/* ---------- SOLO ---------- */
function startSolo(ci){
  abortEngine();resetTable();
  MODE='solo';ME=0;soloChar=ci;
  const others=shuffle([0,1,2,3].filter(c=>c!==ci));
  engNew([{name:'Toi',ci,kind:'local'},...others.map(c=>({name:CHARS[c].name,ci:c,kind:'ai'}))]);
  wireHostHooks();hideScreens();updateNetPill();
  engRun();
}
let chosen=null;
function openSelect(){
  chosen=null;$('#btn-go').disabled=true;
  $('#picks').innerHTML=CHARS.map((c,k)=>`<button class="pick" data-k="${k}" style="--c:${c.c}" aria-label="${c.name}"><div class="fwrap"><div class="rimx">${frameHTML(c)}</div></div><div class="pn">${c.name}</div><div class="pt">${c.title}</div><div class="traits">${c.traits.map(t=>`<span>${t}</span>`).join('')}</div></button>`).join('');
  $('#picks').querySelectorAll('.pick').forEach(b=>b.onclick=()=>{SFX.init();SFX.tick();chosen=+b.dataset.k;$('#picks').querySelectorAll('.pick').forEach(x=>x.classList.toggle('on',x===b));$('#btn-go').disabled=false});
  showScreen('scr-select');
}

/* ---------- RÉSEAU commun ---------- */
const NET={peer:null,code:null,slots:[],stage:'lobby',conn:null,name:'',joinCode:'',myToken:'',lobby:null,leaving:false};
function send(conn,msg){try{if(conn&&conn.open)conn.send(msg)}catch(e){}}
function token(){let t=null;try{t=localStorage.getItem('lag-token')}catch(e){}if(!t){t=Math.random().toString(36).slice(2)+Date.now().toString(36);try{localStorage.setItem('lag-token',t)}catch(e){}}return t}
function savedName(){try{return localStorage.getItem('lag-name')||''}catch(e){return ''}}
function saveName(n){try{localStorage.setItem('lag-name',n)}catch(e){}}
const CODE_ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode=()=>Array.from({length:4},()=>CODE_ABC[Math.floor(Math.random()*CODE_ABC.length)]).join('');
const cleanName=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,14);
const shareLink=code=>location.origin+location.pathname+'#'+code;
function peerAvailable(){return typeof window.Peer==='function'}
function updateNetPill(){
  const p=$('#netpill');
  if(MODE==='host'&&NET.code){p.hidden=false;p.innerHTML=`<span>SALON ${NET.code}</span>`}
  else if(MODE==='client'&&NET.joinCode){p.hidden=false;p.innerHTML=`<span>SALON ${NET.joinCode}</span>`}
  else p.hidden=true;
}

/* ---------- HÔTE ---------- */
function hostCreate(name){
  if(!peerAvailable()){profileErr('Le module réseau n’a pas pu se charger. Vérifie ta connexion internet puis recharge la page.');return}
  MODE='host';NET.stage='lobby';NET.leaving=false;
  NET.slots=[{name,ci:null,kind:'local',token:'host',conn:null}];
  openPeer(0);
}
function openPeer(attempt){
  NET.code=genCode();
  profileErr('');setBusy(true,'Ouverture du salon…');
  const peer=new Peer(PEER_PREFIX+NET.code,{debug:1});
  NET.peer=peer;
  peer.on('open',()=>{setBusy(false);startHeartbeat();history.replaceState(null,'',location.pathname+'#'+NET.code);renderLobby();showScreen('scr-lobby');updateNetPill()});
  peer.on('error',err=>{
    if(err.type==='unavailable-id'&&attempt<4){peer.destroy();openPeer(attempt+1);return}
    if(NET.stage==='lobby'&&$('#scr-lobby').hidden){setBusy(false);profileErr(netErrText(err));MODE=null;try{peer.destroy()}catch(e){}}
    else console.warn('peer',err);
  });
  peer.on('disconnected',()=>{if(!NET.leaving)try{peer.reconnect()}catch(e){}});
  peer.on('connection',conn=>{
    conn.lastSeen=Date.now();
    conn.on('data',d=>hostOnData(conn,d));
    conn.on('close',()=>hostOnClose(conn));
    conn.on('error',()=>hostOnClose(conn));
  });
}
function netErrText(err){
  const t=err&&err.type;
  if(t==='peer-unavailable')return 'Salon introuvable. Vérifie le code : l’hôte doit avoir la page ouverte.';
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')return 'Impossible de joindre le service de connexion. Vérifie ta connexion internet et réessaie.';
  if(t==='browser-incompatible')return 'Ce navigateur ne gère pas les connexions directes. Essaie Chrome, Firefox ou Safari récent.';
  return 'La connexion a échoué. Réessaie dans un instant.';
}
function lobbyFor(idx){return{code:NET.code,you:idx,slots:NET.slots.map(s=>({name:s.name,ci:s.ci}))}}
function broadcastLobby(){NET.slots.forEach((s,i)=>{if(s.conn)send(s.conn,{t:'lobby',l:lobbyFor(i)})});renderLobby()}
function hostOnData(conn,d){
  conn.lastSeen=Date.now();
  if(!d||typeof d!=='object'||d.t==='pong')return;
  if(d.t==='hello'){
    const name=cleanName(d.name)||'Anonyme',tk=String(d.token||'').slice(0,64);
    if(NET.stage==='lobby'){
      const ex=NET.slots.findIndex(s=>s.token===tk&&s.kind==='remote');
      if(ex>=0){NET.slots[ex].conn=conn;NET.slots[ex].name=name;conn.seat=ex}
      else if(NET.slots.length>=4){send(conn,{t:'reject',why:'Le salon est complet (4 joueurs).'});setTimeout(()=>conn.close(),400);return}
      else{NET.slots.push({name,ci:null,kind:'remote',token:tk,conn});SFX.ping()}
      broadcastLobby();return;
    }
    // partie en cours : reconnexion d'un joueur remplacé par une IA
    const p=E&&E.players.find(p=>p.token&&p.token===tk);
    if(p&&p.kind==='ai'&&!E.over){
      p.kind='remote';p.peer=conn;
      send(conn,{t:'start',seat:p.i});
      emit({e:'log',html:`{{p${p.i}}} est de retour à la table.`});
      sync();return;
    }
    send(conn,{t:'reject',why:'Une partie est déjà en cours dans ce salon.'});setTimeout(()=>conn.close(),400);return;
  }
  if(d.t==='pick'&&NET.stage==='lobby'){
    const s=NET.slots.find(s=>s.conn===conn);const ci=d.ci|0;
    if(s&&ci>=0&&ci<4&&!NET.slots.some(o=>o!==s&&o.ci===ci)){s.ci=ci;broadcastLobby()}
    else if(s)send(conn,{t:'lobby',l:lobbyFor(NET.slots.indexOf(s))});
    return;
  }
  if(d.t==='answer'&&E){const p=E.players.find(p=>p.peer===conn);if(p)engAnswer(p.i,d.v);return}
  if(d.t==='aiming'&&E){const p=E.players.find(p=>p.peer===conn);if(p)engAimPreview(p.i,d.v);return}
  if(d.t==='leave'){hostOnClose(conn);try{conn.close()}catch(e){}}
}
function hostOnClose(conn){
  if(NET.leaving)return;
  if(NET.stage==='lobby'){
    const i=NET.slots.findIndex(s=>s.conn===conn);
    if(i>0){NET.slots.splice(i,1);broadcastLobby()}
    return;
  }
  if(E){const p=E.players.find(p=>p.peer===conn);if(p)seatToAI(p.i)}
}
function hostPick(ci){const me=NET.slots[0];if(NET.slots.some(o=>o!==me&&o.ci===ci))return;me.ci=ci;SFX.tick();broadcastLobby()}
function hostRemoveSlot(i){const s=NET.slots[i];if(!s||i===0)return;send(s.conn,{t:'reject',why:'L’hôte t’a retiré du salon.'});NET.slots.splice(i,1);setTimeout(()=>{try{s.conn.close()}catch(e){}},300);broadcastLobby()}
function hostStart(){
  const used=new Set(NET.slots.map(s=>s.ci).filter(c=>c!=null));
  const free=()=>{const c=[0,1,2,3].filter(c=>!used.has(c));const k=pick(c);used.add(k);return k};
  NET.slots.forEach(s=>{if(s.ci==null)s.ci=free()});
  const seats=NET.slots.map(s=>({name:s.kind==='local'?s.name:s.name,ci:s.ci,kind:s.kind,peer:s.conn,token:s.kind==='remote'?s.token:null}));
  while(seats.length<4){const c=free();seats.push({name:CHARS[c].name,ci:c,kind:'ai'})}
  NET.stage='game';
  beginHostGame(seats);
}
function beginHostGame(seats){
  abortEngine();resetTable();
  shuffle(seats); // placement aléatoire autour de la table à chaque partie
  ME=seats.findIndex(s=>s.kind==='local');engNew(seats);wireHostHooks();
  E.players.forEach(p=>{if(p.peer)send(p.peer,{t:'start',seat:p.i})});
  hideScreens();updateNetPill();
  engRun();
}
function hostRestart(){
  if(!E)return;
  const seats=E.players.map(p=>({name:p.name,ci:p.ci,kind:p.kind,peer:p.peer,token:p.token}));
  beginHostGame(seats);
}
function hostKick(i){
  const p=EP(i),c=p.peer;
  seatToAI(i,'a été remplacé');
  if(c){send(c,{t:'kicked'});setTimeout(()=>{try{c.close()}catch(e){}},400)}
}
/* battement de cœur : un joueur muet depuis 12 s est considéré comme parti */
let HB=null;
function startHeartbeat(){
  clearInterval(HB);
  HB=setInterval(()=>{
    if(MODE!=='host'){clearInterval(HB);return}
    const conns=new Set();NET.slots.forEach(s=>s.conn&&conns.add(s.conn));if(E)E.players.forEach(p=>p.peer&&conns.add(p.peer));
    const now=Date.now();
    conns.forEach(c=>{
      if(now-(c.lastSeen||now)>12000){hostOnClose(c);try{c.close()}catch(e){}}
      else send(c,{t:'ping'});
    });
  },3000);
}
function hostShutdown(){
  clearInterval(HB);
  NET.leaving=true;
  const conns=new Set();NET.slots.forEach(s=>s.conn&&conns.add(s.conn));if(E)E.players.forEach(p=>p.peer&&conns.add(p.peer));
  conns.forEach(c=>{send(c,{t:'bye'});setTimeout(()=>{try{c.close()}catch(e){}},200)});
  setTimeout(()=>{try{NET.peer&&NET.peer.destroy()}catch(e){}NET.peer=null},400);
  NET.slots=[];NET.code=null;E=null;
}

/* ---------- CLIENT ---------- */
function clientJoin(code,name){
  if(!peerAvailable()){profileErr('Le module réseau n’a pas pu se charger. Vérifie ta connexion internet puis recharge la page.');return}
  MODE='client';NET.joinCode=code;NET.name=name;NET.myToken=token();NET.leaving=false;NET.lobby=null;
  profileErr('');setBusy(true,'Connexion au salon '+code+'…');
  const peer=new Peer({debug:1});NET.peer=peer;
  let opened=false;
  const fail=msg=>{if(opened&&MODE!=='client')return;setBusy(false);try{peer.destroy()}catch(e){}NET.peer=null;
    if(!$('#scr-profile').hidden||!opened){MODE=null;profileErr(msg)}else lostConnection(msg)};
  const to=setTimeout(()=>{if(!opened)fail('Pas de réponse du salon '+code+'. Vérifie le code et que l’hôte a la page ouverte.')},12000);
  peer.on('error',err=>{clearTimeout(to);if(!opened)fail(netErrText(err));else console.warn(err)});
  peer.on('open',()=>{
    const conn=peer.connect(PEER_PREFIX+code,{reliable:true});NET.conn=conn;
    conn.on('open',()=>{opened=true;clearTimeout(to);setBusy(false);send(conn,{t:'hello',name,token:NET.myToken});
      lastHost=Date.now();clearInterval(WD);
      WD=setInterval(()=>{if(MODE!=='client'||NET.leaving){clearInterval(WD);return}
        if(Date.now()-lastHost>15000){clearInterval(WD);lostConnection('L’hôte ne répond plus.')}},2000)});
    conn.on('data',clientOnData);
    conn.on('close',()=>{if(!NET.leaving&&MODE==='client')lostConnection('La connexion avec l’hôte a été coupée.')});
  });
}
let WD=null,lastHost=0;
function clientOnData(d){
  lastHost=Date.now();
  if(!d||typeof d!=='object')return;
  switch(d.t){
    case 'ping':send(NET.conn,{t:'pong'});break;
    case 'lobby':NET.lobby=d.l;if($('#scr-lobby').hidden&&!E_LIKE())showScreen('scr-lobby');renderLobby();updateNetPill();break;
    case 'reject':NET.leaving=true;clientShutdown();MODE=null;showScreen('scr-profile');profileErr(d.why||'Accès refusé.');break;
    case 'start':closeModal();hideEnd();resetTable();ME=d.seat|0;hideScreens();updateNetPill();break;
    case 'state':V=d.s;renderAll();break;
    case 'ev':onEvent(d.ev);break;
    case 'ask':if(V)onAsk(d.kind,d.data,d.ms,v=>send(NET.conn,{t:'answer',v}),v=>send(NET.conn,{t:'aiming',v}));break;
    case 'cancelAsk':clearAsk();break;
    case 'kicked':NET.leaving=true;clientShutdown();MODE=null;resetTable();modal('REMPLACÉ','L’hôte a donné ta place à une IA.',[{label:'MENU',cls:'red',on:()=>{closeModal();toMenu()}}]);break;
    case 'bye':NET.leaving=true;clientShutdown();MODE=null;modal('SALON FERMÉ','L’hôte a quitté la partie.',[{label:'MENU',cls:'red',on:()=>{closeModal();toMenu()}}]);break;
  }
}
const E_LIKE=()=>!!V;
function lostConnection(msg){
  const code=NET.joinCode,name=NET.name;
  clientShutdown();
  modal('CONNEXION PERDUE',msg+' Tu peux reprendre ta place : une IA joue pour toi en attendant.',[
    {label:'SE RECONNECTER',cls:'red',on:()=>{closeModal();resetTable();showScreen('scr-profile');clientJoin(code,name)}},
    {label:'MENU',on:()=>{closeModal();toMenu()}}]);
}
function clientShutdown(){
  clearInterval(WD);
  NET.leaving=true;
  if(NET.conn)send(NET.conn,{t:'leave'});
  const p=NET.peer;setTimeout(()=>{try{p&&p.destroy()}catch(e){}},200);
  NET.peer=null;NET.conn=null;
}
function clientPick(ci){send(NET.conn,{t:'pick',ci});SFX.tick()}

/* ---------- SALON (affichage commun) ---------- */
function renderLobby(){
  const host=MODE==='host';
  const L=host?lobbyFor(0):NET.lobby;if(!L)return;
  $('#lob-codecard').hidden=!host;$('#lob-wait').hidden=host;
  if(host){
    $('#lob-code').innerHTML=ransom(L.code,4);
    const link=shareLink(L.code);$('#lob-link').textContent=link;
    const qr=$('#qr');if(qr.dataset.for!==link){qr.innerHTML='';qr.dataset.for=link;if(window.QRCode)try{new QRCode(qr,{text:link,width:150,height:150,colorDark:'#0d0809',colorLight:'#fbf7f4'})}catch(e){}}
  }else $('#lob-wcode').textContent=L.code;
  let html='';
  for(let i=0;i<4;i++){
    const s=L.slots[i];
    if(s){const ch=s.ci!=null?CHARS[s.ci]:null;
      html+=`<div class="slot full" style="--c:${ch?ch.c:'#fbf7f4'}"><div class="mini">${ch?frameHTML(ch):'<div class="frame q">?</div>'}</div><div class="who"><b>${esc(s.name)}${i===L.you?' (toi)':''}</b><span>${i===0?'Hôte · ':''}${ch?ch.name:'choisit son perso…'}</span></div>${host&&i>0?`<button class="x" data-i="${i}" aria-label="Retirer ${esc(s.name)}">RETIRER</button>`:''}</div>`}
    else html+=`<div class="slot empty"><div class="mini"><div class="frame q">IA</div></div><div class="who"><b>Place libre</b><span>${host?'En attente… sinon une IA':'En attente d’un joueur…'}</span></div></div>`;
  }
  $('#slots').innerHTML=html;
  $('#slots').querySelectorAll('.x').forEach(b=>b.onclick=()=>hostRemoveSlot(+b.dataset.i));
  const mine=L.slots[L.you]?L.slots[L.you].ci:null;
  $('#cpick').innerHTML=CHARS.map((c,k)=>{const owner=L.slots.findIndex(s=>s&&s.ci===k);const taken=owner>=0&&owner!==L.you;
    return `<button class="cp${taken?' taken':''}${mine===k?' mine':''}" data-k="${k}" style="--c:${c.c}" ${taken?'disabled':''} aria-label="${c.name}">${frameHTML(c)}<span>${c.name}</span>${taken?`<small>${esc(L.slots[owner].name)}</small>`:''}</button>`}).join('');
  $('#cpick').querySelectorAll('.cp').forEach(b=>b.onclick=()=>{const k=+b.dataset.k;host?hostPick(k):clientPick(k)});
  $('#btn-lobby-go').hidden=!host;
  const n=L.slots.length;
  $('#lob-note').textContent=host?(n<4?`${n} joueur${n>1?'s':''} · ${4-n} place${4-n>1?'s':''} pour l’IA si tu lances maintenant.`:'Table complète. Lance quand tout le monde est prêt.'):'Choisis ton personnage. L’hôte lance la partie quand il veut.';
}

/* ---------- écran profil (créer / rejoindre) ---------- */
let PROFILE='host';
function openProfile(kind,code){
  PROFILE=kind;profileErr('');setBusy(false);
  $('#profhead').innerHTML=ransom(kind==='host'?'CRÉER UN SALON':'REJOINDRE',kind==='host'?6:8);
  $('#f-code-wrap').hidden=kind!=='join';
  $('#f-code').value=code||'';
  $('#f-name').value=savedName();
  $('#btn-prof-go').innerHTML=`<span>${kind==='host'?'OUVRIR LE SALON':'ENTRER'}</span>`;
  showScreen('scr-profile');
  setTimeout(()=>{(kind==='join'&&!code?$('#f-code'):$('#f-name')).focus()},350);
}
function profileErr(t){$('#prof-err').textContent=t||''}
function setBusy(b,t){$('#btn-prof-go').disabled=b;$('#prof-busy').textContent=b?t:''}
function profileGo(){
  SFX.init();
  const name=cleanName($('#f-name').value);
  if(!name){profileErr('Entre un pseudo pour que les autres te reconnaissent.');$('#f-name').focus();return}
  saveName(name);
  if(PROFILE==='host')hostCreate(name);
  else{
    const code=$('#f-code').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(code.length!==4){profileErr('Le code du salon fait 4 caractères, par exemple K7QX.');$('#f-code').focus();return}
    clientJoin(code,name);
  }
}

/* ---------- démarrage ---------- */
(function boot(){
  $('#biglogo').innerHTML=ransom("LIFE'S A",1)+'<br>'+ransom('GAMBLE',4);
  $('#minilogo').innerHTML=ransom("LIFE'S A GAMBLE",2);
  $('#selhead').innerHTML=ransom('CHOISIS TON CAÏD',5);
  $('#lobhead').innerHTML=ransom('LE SALON',9);
  $('#titlecast').innerHTML=CHARS.map(c=>`<div><div class="rimx">${frameHTML(c)}</div></div>`).join('');
  $('#btn-sound').innerHTML=SND_ON;
  $('#btn-sound').onclick=()=>{SFX.init();SFX.on=!SFX.on;$('#btn-sound').innerHTML=SFX.on?SND_ON:SND_OFF};
  const openRules=()=>{$('#rules').hidden=false};
  $('#btn-rules').onclick=openRules;$('#btn-rules2').onclick=openRules;
  $('#btn-rclose').onclick=()=>{$('#rules').hidden=true};
  $('#rules').onclick=e=>{if(e.target.id==='rules')$('#rules').hidden=true};
  $('#btn-solo').onclick=()=>{SFX.init();SFX.tick();openSelect()};
  $('#btn-host').onclick=()=>{SFX.init();SFX.tick();openProfile('host')};
  $('#btn-join').onclick=()=>{SFX.init();SFX.tick();openProfile('join')};
  $('#btn-back').onclick=()=>showScreen('scr-title');
  $('#btn-go').onclick=()=>{if(chosen==null)return;SFX.init();wipe();setTimeout(()=>startSolo(chosen),320)};
  $('#btn-prof-back').onclick=()=>{if(MODE==='client'||MODE==='host')toMenu();else showScreen('scr-title')};
  $('#scr-profile').addEventListener('submit',e=>{e.preventDefault();profileGo()});
  $('#f-code').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)});
  $('#btn-lobby-go').onclick=()=>{SFX.init();wipe();setTimeout(hostStart,320)};
  $('#btn-lobby-quit').onclick=()=>toMenu();
  $('#btn-copy').onclick=()=>{const t=shareLink(NET.code);const done=()=>{$('#btn-copy').innerHTML='<span>LIEN COPIÉ</span>';setTimeout(()=>{$('#btn-copy').innerHTML='<span>COPIER LE LIEN</span>'},1600)};
    if(navigator.clipboard)navigator.clipboard.writeText(t).then(done,()=>selectText($('#lob-link')));else selectText($('#lob-link'))};
  $('#btn-menu').onclick=()=>{
    if(!MODE){showScreen('scr-title');return}
    const sub=MODE==='host'?'Tu es l’hôte : quitter ferme la partie pour tout le monde.':MODE==='client'?'Une IA prendra ta place à la table.':'La partie en cours sera perdue.';
    modal('QUITTER ?',sub,[{label:'QUITTER',cls:'red',on:()=>{closeModal();toMenu()}},{label:'RESTER',on:closeModal}]);
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#rules').hidden=true});
  window.addEventListener('beforeunload',e=>{if(MODE==='host'&&E&&!E.over){e.preventDefault();e.returnValue=''}});
  window.addEventListener('pagehide',()=>{if(MODE==='client'&&NET.conn)send(NET.conn,{t:'leave'});if(MODE==='host')[...(E?E.players.map(p=>p.peer):[]),...NET.slots.map(s=>s.conn)].forEach(c=>c&&send(c,{t:'bye'}))});
  // fond de table derrière l'écran titre
  engNew([0,1,2,3].map(c=>({name:CHARS[c].name,ci:c,kind:'ai'})));E.round=1;V=stateFor(-1);ME=0;V.hand=[];renderAll();V=null;E=null;BUILT=false;
  const m=location.hash.replace('#','').toUpperCase();
  if(/^[A-Z0-9]{4}$/.test(m))openProfile('join',m);
})();
function selectText(el){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}
