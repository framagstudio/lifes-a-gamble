'use strict';
/* =====================================================================
   CORE : données, utilitaires et moteur de jeu.
   Le moteur ne tourne QUE chez l'hôte (ou en solo). Les autres joueurs
   reçoivent uniquement l'état qui les concerne (leur propre main).
   ===================================================================== */
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- personnages (originaux) ---------- */
const O='#0d0809';
const CHARS=[
 {id:'oro',name:'SEÑOR ORO',title:'Baron des tropiques, dents en or et sourire de requin.',traits:['Bluffeur','Rancunier'],c:'#f2b33d',
  ai:{bluff:.55,aggr:.55,speed:1},
  svg:`<svg viewBox="0 0 200 216" preserveAspectRatio="xMidYMax meet"><path d="M14 216 Q22 166 68 152 L132 152 Q178 166 186 216Z" fill="#fbf7f4" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M68 152 L86 182 L80 216 M132 152 L114 182 L120 216" fill="none" stroke="${O}" stroke-width="4"/><path d="M82 152 L100 196 L118 152Z" fill="#ff4f8b" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M86 160 Q100 186 114 160" fill="none" stroke="#f2b33d" stroke-width="6"/><circle cx="100" cy="182" r="7" fill="#f2b33d" stroke="${O}" stroke-width="3"/><rect x="84" y="124" width="32" height="32" fill="#c98a5a" stroke="${O}" stroke-width="5"/><ellipse cx="55" cy="96" rx="9" ry="13" fill="#c98a5a" stroke="${O}" stroke-width="5"/><ellipse cx="145" cy="96" rx="9" ry="13" fill="#c98a5a" stroke="${O}" stroke-width="5"/><ellipse cx="100" cy="90" rx="46" ry="50" fill="#c98a5a" stroke="${O}" stroke-width="6"/><path d="M54 86 Q50 32 100 30 Q150 32 146 86 Q140 56 118 50 Q100 60 80 50 Q60 58 54 86Z" fill="#b9bec4" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M64 74 L94 78 M136 74 L106 78" stroke="${O}" stroke-width="7" stroke-linecap="round"/><path d="M60 82 H96 V88 Q96 108 78 108 Q60 108 60 88Z" fill="#f2b33d" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M104 82 H140 V88 Q140 108 122 108 Q104 108 104 88Z" fill="#f2b33d" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M96 86 H104" stroke="${O}" stroke-width="5"/><path d="M68 88 L76 96 M112 88 L120 96" stroke="#fbf7f4" stroke-width="4" stroke-linecap="round"/><path d="M100 98 Q93 112 104 114" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M74 120 Q100 144 126 120Z" fill="#fbf7f4" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><rect x="105" y="121" width="9" height="9" fill="#f2b33d" stroke="${O}" stroke-width="2.5"/></svg>`,
  lines:{play:['{A}, amigo.','Regarde-moi bien : {a}.','{A}. Évidemment.'],accuse:['MENTEUR ! Je le sens d’ici.','Tu mens comme tu respires.'],survive:['Ha ! La chance m’adore.','Pas aujourd’hui, señor.'],shoot:['Rien de personnel.','Adiós.'],self:['Bon… pour la gloire.'],caught:['Bah. Ça valait le coup.']}},
 {id:'velluto',name:'DON VELLUTO',title:'Patriarche de la famiglia. Ne hausse jamais la voix.',traits:['Calculateur','Prudent'],c:'#8f5bff',
  ai:{bluff:.32,aggr:.38,speed:1.25},
  svg:`<svg viewBox="0 0 200 216" preserveAspectRatio="xMidYMax meet"><path d="M14 216 Q22 166 70 152 L130 152 Q178 166 186 216Z" fill="#5a2a8a" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M80 152 L100 204 L120 152Z" fill="#fbf7f4" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M84 160 L100 168 L84 176Z M116 160 L100 168 L116 176Z" fill="#f2b33d" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="168" r="5" fill="#f2b33d" stroke="${O}" stroke-width="3"/><rect x="84" y="126" width="32" height="30" fill="#eab89a" stroke="${O}" stroke-width="5"/><ellipse cx="100" cy="96" rx="44" ry="48" fill="#eab89a" stroke="${O}" stroke-width="6"/><path d="M57 100 Q58 154 100 158 Q142 154 143 100 Q132 128 100 130 Q68 128 57 100Z" fill="#fbf7f4" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><path d="M74 120 Q90 108 100 116 Q110 108 126 120 Q110 126 100 121 Q90 126 74 120Z" fill="#fbf7f4" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="106" r="9" fill="#e09a80" stroke="${O}" stroke-width="4"/><path d="M68 92 Q78 86 88 92" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M64 82 Q78 72 90 80" fill="#fbf7f4" stroke="${O}" stroke-width="4"/><path d="M110 80 Q124 72 136 82" fill="#fbf7f4" stroke="${O}" stroke-width="4"/><circle cx="121" cy="92" r="5" fill="${O}"/><circle cx="121" cy="92" r="14" fill="rgba(255,255,255,.25)" stroke="#f2b33d" stroke-width="4"/><path d="M134 98 Q150 130 140 160" fill="none" stroke="#f2b33d" stroke-width="2.5"/><path d="M54 58 Q56 12 100 10 Q144 12 146 58Z" fill="#3a3340" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M84 18 Q100 32 116 18" fill="none" stroke="${O}" stroke-width="4"/><path d="M55 46 Q100 56 145 46 L146 58 Q100 66 54 58Z" fill="#8f5bff" stroke="${O}" stroke-width="4"/><ellipse cx="100" cy="60" rx="76" ry="13" fill="#2b2530" stroke="${O}" stroke-width="6"/></svg>`,
  lines:{play:['{A}. Je ne mens jamais.','{A}, mon cher.','Voici {a}.'],accuse:['Tu me déçois. Retourne-la.','Mensonge. Je le sais.'],survive:['La famille veille sur moi.','Hm. Ce n’était pas mon heure.'],shoot:['Ce sont les affaires.','Je suis navré. Un peu.'],self:['Un homme paie ses erreurs.'],caught:['Une erreur de calcul.']}},
 {id:'comandante',name:'LA COMANDANTE',title:'Fille des barricades. N’a jamais perdu un bras de fer.',traits:['Agressive','Imprévisible'],c:'#18c29c',
  ai:{bluff:.45,aggr:.66,speed:.9},
  svg:`<svg viewBox="0 0 200 216" preserveAspectRatio="xMidYMax meet"><path d="M16 216 Q24 168 68 156 L132 156 Q176 168 184 216Z" fill="#4c5a2b" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M68 156 L86 190 L100 162 L114 190 L132 156" fill="#61713a" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><circle cx="148" cy="196" r="6" fill="#f2b33d" stroke="${O}" stroke-width="3"/><path d="M48 186 L76 186" stroke="${O}" stroke-width="4"/><rect x="86" y="128" width="28" height="30" fill="#8a5638" stroke="${O}" stroke-width="5"/><path d="M80 148 L120 148 L100 178Z" fill="#e3122b" stroke="${O}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="100" cy="96" rx="40" ry="46" fill="#8a5638" stroke="${O}" stroke-width="6"/><circle cx="61" cy="112" r="8" fill="none" stroke="#f2b33d" stroke-width="4"/><path d="M58 98 Q50 38 100 36 Q152 38 142 100 Q138 70 124 62 Q104 78 80 64 Q66 74 58 98Z" fill="#141014" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M116 42 Q132 56 126 72" stroke="#ff4f8b" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M60 56 Q100 44 140 56" stroke="${O}" stroke-width="6" fill="none"/><circle cx="83" cy="52" r="12" fill="#ffd98a" stroke="${O}" stroke-width="5"/><circle cx="117" cy="52" r="12" fill="#ffd98a" stroke="${O}" stroke-width="5"/><path d="M78 48 L84 44" stroke="#fbf7f4" stroke-width="3"/><path d="M68 94 Q80 85 92 94 Q80 101 68 94Z" fill="#fbf7f4" stroke="${O}" stroke-width="4"/><path d="M108 94 Q120 85 132 94 Q120 101 108 94Z" fill="#fbf7f4" stroke="${O}" stroke-width="4"/><circle cx="82" cy="94" r="4" fill="${O}"/><circle cx="122" cy="94" r="4" fill="${O}"/><path d="M68 82 L92 86 M132 80 L108 86" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M100 98 L96 110 L104 111" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M84 124 Q102 132 118 118" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M126 104 L136 120 M128 112 L134 109" stroke="#4a2516" stroke-width="3"/></svg>`,
  lines:{play:['{A}. Point.','{A}, camarade.','{A}. Suivant.'],accuse:['MENTEUR ! Tout le monde a vu.','Retourne-la. Maintenant.'],survive:['Je suis encore debout.','Raté. Comme toujours.'],shoot:['Pour la cause.','Tu l’as cherché.'],self:['Allez. Je n’ai pas peur.'],caught:['Hé. Fallait essayer.']}},
 {id:'krupp',name:'MAJOR KRUPP',title:'Mercenaire. Un œil, zéro pitié, beaucoup de cigares.',traits:['Gâchette facile','Bourrin'],c:'#ff6a1a',
  ai:{bluff:.5,aggr:.8,speed:.75},
  svg:`<svg viewBox="0 0 200 216" preserveAspectRatio="xMidYMax meet"><path d="M2 216 Q8 156 60 144 L140 144 Q192 156 198 216Z" fill="#2f3b2a" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M34 160 L150 216" stroke="#151a12" stroke-width="12"/><rect x="40" y="182" width="26" height="22" fill="#435238" stroke="${O}" stroke-width="4"/><rect x="134" y="182" width="26" height="22" fill="#435238" stroke="${O}" stroke-width="4"/><rect x="72" y="118" width="56" height="36" fill="#e0a37a" stroke="${O}" stroke-width="5"/><path d="M56 70 Q56 40 100 40 Q144 40 144 70 L144 112 Q144 144 100 146 Q56 144 56 112Z" fill="#e0a37a" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M58 64 L58 30 L142 30 L142 64 Q122 52 100 54 Q78 52 58 64Z" fill="#f2d16b" stroke="${O}" stroke-width="6" stroke-linejoin="round"/><path d="M58 84 L142 72" stroke="${O}" stroke-width="4"/><path d="M68 80 L96 78 L94 98 Q82 106 70 96Z" fill="${O}"/><ellipse cx="118" cy="92" rx="10" ry="7" fill="#fbf7f4" stroke="${O}" stroke-width="4"/><circle cx="119" cy="92" r="4" fill="${O}"/><path d="M102 82 L134 86" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M98 96 L92 114 L106 114" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 128 L118 126" stroke="${O}" stroke-width="6" stroke-linecap="round"/><rect x="112" y="120" width="38" height="10" rx="3" fill="#8a4b22" stroke="${O}" stroke-width="4"/><rect x="148" y="120" width="7" height="10" fill="#ff6a1a" stroke="${O}" stroke-width="3"/><path d="M156 114 Q166 104 158 94 Q152 84 162 74" fill="none" stroke="#b9a3a9" stroke-width="4" stroke-linecap="round"/><path d="M88 138 L96 142" stroke="#9a5a3a" stroke-width="3"/></svg>`,
  lines:{play:['{A}. Tu discutes ?','{A} !','{A}. Grouille.'],accuse:['MENTEUR !','Retourne ça. TOUT DE SUITE.'],survive:['Mon cœur bat même pas.','C’est tout ?'],shoot:['Boum.','Rien de personnel. Si, un peu.'],self:['Viens, petite balle.'],caught:['Pff. Vise bien, alors.']}}
];
const PASS_LINES=['Je passe.','Ça passe… pour cette fois.','Hm. D’accord.','Je te crois. Pour l’instant.'];

/* ---------- cartes ---------- */
const TYPES={ROI:{label:'ROI',plural:'ROIS',art:'un ROI'},REINE:{label:'REINE',plural:'REINES',art:'une REINE'},CHAOS:{label:'CHAOS'},MAITRE:{label:'MAÎTRE'}};
const ICONS={
 ROI:`<svg viewBox="0 0 60 60"><path d="M8 44 L5 16 L20 29 L30 8 L40 29 L55 16 L52 44Z" fill="#f2b33d" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><rect x="8" y="44" width="44" height="8" fill="#e3122b" stroke="${O}" stroke-width="3.5"/><circle cx="30" cy="35" r="4" fill="#fbf7f4" stroke="${O}" stroke-width="2.5"/></svg>`,
 REINE:`<svg viewBox="0 0 60 60"><path d="M6 44 Q30 2 54 44 Q30 32 6 44Z" fill="#e3122b" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="30" cy="22" r="6.5" fill="#fbf7f4" stroke="${O}" stroke-width="3"/><circle cx="17" cy="33" r="3.5" fill="#f2b33d" stroke="${O}" stroke-width="2.5"/><circle cx="43" cy="33" r="3.5" fill="#f2b33d" stroke="${O}" stroke-width="2.5"/><path d="M8 50 Q30 40 52 50" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/></svg>`,
 MAITRE:`<svg viewBox="0 0 60 60"><circle cx="20" cy="21" r="12" fill="#fbf7f4" stroke="${O}" stroke-width="3.5"/><circle cx="20" cy="21" r="4.5" fill="${O}"/><path d="M28 29 L51 52 M43 44 L49 38 M47 48 L53 42" stroke="${O}" stroke-width="5.5" stroke-linecap="round"/></svg>`,
 CHAOS:`<svg viewBox="0 0 60 60"><polygon points="30,3 36,20 54,12 42,28 58,36 39,38 44,57 30,44 16,57 21,38 2,36 18,28 6,12 24,20" fill="#fbf7f4" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><circle cx="30" cy="31" r="7" fill="${O}"/><circle cx="30" cy="31" r="2.5" fill="#e3122b"/></svg>`
};

/* ---------- contrôle asynchrone (annulable) ---------- */
let GEN=0; const ABORT={abort:true}; const PENDING=new Set();
function wait(ms){const g=GEN;return new Promise((res,rej)=>{const h={cancel(){clearTimeout(t);rej(ABORT)}};const t=setTimeout(()=>{PENDING.delete(h);g===GEN?res():rej(ABORT)},ms);PENDING.add(h)})}
function abortEngine(){GEN++;[...PENDING].forEach(h=>{try{h.cancel()}catch(e){}});PENDING.clear()}

/* ---------- moteur ---------- */
let E=null;
const HOOK={emit(){},sync(){},ask(){},cancelAsk(){}};
const emit=ev=>HOOK.emit(ev);
const sync=()=>HOOK.sync();
const EP=i=>E.players[i];
const newGun=()=>({bullet:Math.floor(Math.random()*6),fired:0});
const risk=p=>1/(6-p.gun.fired);
const aliveIdx=()=>E.players.filter(p=>p.alive).map(p=>p.i);
const aliveCount=()=>aliveIdx().length;
function nextAlive(i){for(let k=1;k<=4;k++){const j=(i+k)%4;if(EP(j).alive)return j}return i}
const othersOf=i=>aliveIdx().filter(j=>j!==i);
function fireGun(p){const real=p.gun.fired===p.gun.bullet;p.gun.fired++;if(real)p.gun=newGun();return real}
const line=(p,k,c)=>{const a=c?TYPES[c].art:'';return pick(p.ch.lines[k]).replace('{a}',a).replace('{A}',a.charAt(0).toUpperCase()+a.slice(1))};

/* seats : [{name, ci, kind:'local'|'remote'|'ai', peer, token}] — index = place autour de la table */
function engNew(seats){
  E={players:seats.map((s,i)=>({i,name:s.name,ci:s.ci,ch:CHARS[s.ci],kind:s.kind,peer:s.peer||null,token:s.token||null,wasRemote:!!s.token,
      alive:true,hand:[],gun:newGun(),grudge:[0,0,0,0],caught:0,reveals:0,pending:null})),
     table:'ROI',claims:0,pile:[],revealed:[],round:0,starter:Math.floor(Math.random()*4),cur:-1,deciding:-1,over:false};
}
/* état visible par la place v (seule SA main est envoyée) */
function stateFor(v){
  return{round:E.round,table:E.table,claims:E.claims,cur:E.cur,deciding:E.deciding,over:E.over,
    pile:E.pile.map(e=>({t:e.revealed?e.card.t:null,rot:e.rot,dx:e.dx,dy:e.dy})),
    players:E.players.map(p=>({name:p.name,ci:p.ci,alive:p.alive,n:p.hand.length,fired:p.gun.fired,ai:p.kind==='ai',rm:p.kind==='remote'})),
    hand:(v>=0&&v<4)?EP(v).hand.map(c=>c.t):[]};
}

/* ---------- IA ---------- */
function aiChooseCard(p){
  const h=p.hand,T=E.table,ai=p.ch.ai;
  const truths=[],lies=[];h.forEach((c,k)=>(c.t===T?truths:lies).push(k));
  if(!lies.length)return pick(truths);
  const r=risk(p),others=othersOf(p.i);
  const oppRisk=others.reduce((s,j)=>s+risk(EP(j)),0)/Math.max(1,others.length);
  const after=E.claims+1;
  const exposed=after>5?1:after>=4?.55:after>=3?.25:.1;
  const pickLie=()=>{
    const opts=lies.map(k=>{const t=h[k].t;let w;
      if(t==='MAITRE')w=1.3+exposed*1.6;
      else if(t==='CHAOS')w=r<=oppRisk?1.1+ai.aggr:.3;
      else w=1.1-exposed*.6;
      return[k,Math.max(.05,w)]});
    let x=Math.random()*opts.reduce((s,o)=>s+o[1],0);
    for(const[k,w]of opts){x-=w;if(x<=0)return k}return opts[0][0];
  };
  if(!truths.length)return pickLie();
  let lieP=ai.bluff*(lies.length/h.length+.25)*(1-exposed*.85);
  if(r>=.34)lieP*=.6;
  if(risk(EP(nextAlive(p.i)))>=.34)lieP*=1.3;
  if(h.some(c=>c.t==='MAITRE'))lieP+=.2*(exposed+.3);
  if(lies.length>=2&&after<=2)lieP+=.15;
  return Math.random()<Math.min(.85,lieP)?pickLie():pick(truths);
}
/* Simule des centaines de mains possibles du joueur précédent à partir des cartes
   que l'IA ne voit pas, rejoue ses poses de la manche avec sa tendance au bluff observée. */
function estimatePlay(me,placer){
  const T=E.table,counts={ROI:5,REINE:5,CHAOS:1,MAITRE:1};
  [...me.hand,...E.pile.filter(e=>e.by===me.i).map(e=>e.card),...E.revealed].forEach(c=>counts[c.t]--);
  const pool=[];for(const t in counts)for(let k=0;k<Math.max(0,counts[t]);k++)pool.push(t);
  const L=EP(placer),plays=E.pile.filter(e=>e.by===placer).length;
  const b=clamp((L.caught+.8)/(L.reveals+2.2),.12,.8);
  const res={T:0,S:0,M:0,C:0},N=700;
  for(let s=0;s<N;s++){
    for(let i=0;i<3&&i<pool.length;i++){const j=i+Math.floor(Math.random()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]]}
    const h=pool.slice(0,3);let last=T;
    for(let k=0;k<plays&&h.length;k++){
      const ti=h.indexOf(T),non=[];h.forEach((t,i)=>{if(t!==T)non.push(i)});
      const idx=(ti>=0&&(!non.length||Math.random()>b))?ti:non[Math.floor(Math.random()*non.length)];
      last=h.splice(idx,1)[0];
    }
    res[last===T?'T':last==='MAITRE'?'M':last==='CHAOS'?'C':'S']++;
  }
  return{pT:res.T/N,pS:res.S/N,pM:res.M/N,pC:res.C/N};
}
/* Accuser ou laisser passer : comparaison des espérances des deux choix. */
function aiShouldAccuse(p,placer){
  const{pT,pS,pM,pC}=estimatePlay(p,placer);
  const n=aliveCount(),r=risk(p),ai=p.ch.ai,L=EP(placer),T=E.table;
  const Vd=10,Vk=n<=2?10:4+6/(n-1);
  const incoming=othersOf(p.i).reduce((s,j)=>s+risk(EP(j))/(n-1),0);
  let evCall=pS*r*Vk-pT*r*Vd;
  evCall+=pM*(-risk(L)*Math.min(1,1.4/(n-1))*Vd);
  evCall+=pC*(r*Vk-incoming*Vd);
  const h=p.hand,nx=nextAlive(p.i),q=.4;
  let evPass=0;
  if(h.length){
    if(h.some(c=>c.t===T))evPass=q*.4*risk(EP(nx))*Vk;
    else if(h.some(c=>c.t==='MAITRE'))evPass=q*.8*r*Vk;
    else if(h.some(c=>c.t==='CHAOS'))evPass=q*.5*(r*Vk-incoming*Vd);
    else evPass=-q*.75*risk(EP(nx))*Vd;
  }
  const bias=(ai.aggr-.5)*.35*r*Vd+p.grudge[placer]*.04*r*Vd+rand(-.08,.08)*r*Vd;
  return evCall+bias>evPass;
}
function aiPickTarget(p,ctx={}){
  const c=othersOf(p.i);let best=c[0],bs=-1e9;
  for(const j of c){const q=EP(j);
    let s=rand(0,.9)+p.grudge[j]*.5+q.hand.length*.12+q.gun.fired*.1+(q.kind!=='ai'?.15:0);
    if(ctx.liar===j)s+=.8+p.ch.ai.aggr;
    if(p.ch.id==='comandante')s+=q.hand.length*.15;
    if(s>bs){bs=s;best=j}}
  return best;
}

/* ---------- entrées joueurs (humain local, humain distant ou IA) ---------- */
function aiDecide(i,kind,data){
  const p=EP(i);
  if(kind==='play')return aiChooseCard(p);
  if(kind==='accuse')return aiShouldAccuse(p,data.placer);
  return aiPickTarget(p,data.ctx||{});
}
async function input(i,kind,data={},ms=0){
  const p=EP(i);
  if(p.kind==='ai'){
    const base=kind==='play'?rand(800,1600):kind==='accuse'?rand(1100,2300):rand(1000,1600);
    await wait(base*p.ch.ai.speed);
    return aiDecide(i,kind,data);
  }
  return new Promise((res,rej)=>{
    let fin=false,timer=null;
    const end=()=>{fin=true;clearTimeout(timer);p.pending=null;PENDING.delete(h);HOOK.cancelAsk(i)};
    const finish=v=>{if(fin)return;end();res(v)};
    const h={cancel(){if(fin)return;end();rej(ABORT)}};
    PENDING.add(h);
    p.pending={kind,data,finish,fallback:()=>finish(aiDecide(i,kind,data))};
    HOOK.ask(i,kind,data,ms);
  });
}
function engAnswer(i,v){
  const p=E&&EP(i);if(!p||!p.pending)return;
  const{kind,data,finish}=p.pending;
  if(kind==='play'){v=v|0;if(v<0||v>=p.hand.length)return}
  else if(kind==='accuse')v=!!v;
  else{v=v|0;if(!data.cands.includes(v))return}
  finish(v);
}
function seatToAI(i,why){
  const p=EP(i);if(p.kind==='ai')return;
  p.kind='ai';p.peer=null;
  emit({e:'log',html:`{{p${i}}} ${why||'s’est déconnecté'}. Une IA prend le relais.`});
  if(p.pending)p.pending.fallback();
  sync();
}

/* ---------- déroulement ---------- */
async function engRun(){
  try{
    sync();
    while(aliveCount()>1)await engRound();
    await wait(700);
    E.over=true;E.cur=-1;E.deciding=-1;sync();
    const al=aliveIdx();
    emit({e:'end',winner:al.length?al[0]:-1,rounds:E.round});
  }catch(e){if(e!==ABORT)console.error(e)}
}
async function engRound(){
  E.round++;
  const deck=shuffle([...Array(5)].map(()=>({t:'ROI'})).concat([...Array(5)].map(()=>({t:'REINE'})),[{t:'CHAOS'},{t:'MAITRE'}]));
  E.players.forEach(p=>p.hand=[]);
  E.table=Math.random()<.5?'ROI':'REINE';E.claims=0;E.pile=[];E.revealed=[];E.cur=-1;E.deciding=-1;
  sync();
  emit({e:'round',round:E.round,table:E.table,alive:aliveCount()});
  await wait(1400);
  emit({e:'log',html:`Manche ${E.round} : table des <b>${TYPES[E.table].plural}</b>.`});
  let s=E.starter;if(!EP(s).alive)s=nextAlive(s);
  const order=[];for(let k=0;k<4;k++){const j=(s+k)%4;if(EP(j).alive)order.push(j)}
  for(let n=0;n<3;n++)for(const j of order){EP(j).hand.push(deck.pop());emit({e:'deal',seat:j});await wait(270)}
  sync();
  let cur=s;
  while(true){
    if(aliveCount()<=1)return;
    if(!aliveIdx().some(j=>EP(j).hand.length)){
      emit({e:'cutin',seat:null,text:'NOUVELLE DONNE',sub:'Toutes les cartes sont sur la table'});await wait(1400);break;
    }
    for(let k=0;k<4;k++){const j=(cur+k)%4;if(EP(j).alive&&EP(j).hand.length){cur=j;break}}
    E.cur=cur;sync();
    const p=EP(cur);
    const k=await input(cur,'play');
    const card=p.hand.splice(k,1)[0];
    const entry={card,by:cur,revealed:false,rot:Math.round(rand(-25,25)),dx:Math.round(rand(-14,14)),dy:Math.round(rand(-6,6))};
    sync();
    emit({e:'play',seat:cur,rot:entry.rot});
    await wait(420);
    E.pile.push(entry);E.claims++;sync();
    emit({e:'say',seat:cur,text:p.kind==='ai'?line(p,'play',E.table):`C’est ${TYPES[E.table].art} !`});
    emit({e:'log',html:`{{p${cur}}} pose une carte : « ${TYPES[E.table].art} ».`});
    const acc=await accusationWindow(cur);
    E.cur=-1;E.deciding=-1;sync();
    if(acc!=null){
      await resolveAccusation(acc,cur,entry);
      E.starter=EP(acc).alive?acc:nextAlive(acc);
      await wait(600);
      return;
    }
    cur=nextAlive(cur);
  }
  E.starter=nextAlive(E.starter);
}
async function accusationWindow(placer){
  const nx=nextAlive(placer);if(nx===placer)return null;
  E.deciding=nx;sync();
  const yes=await input(nx,'accuse',{placer});
  E.deciding=-1;sync();
  if(yes)return nx;
  emit({e:'say',seat:nx,text:EP(nx).kind==='ai'?pick(PASS_LINES):'Ça passe.',ms:1500});
  emit({e:'log',html:`{{p${nx}}} laisse passer.`});
  return null;
}
async function resolveAccusation(acc,placer,entry){
  const A=EP(acc),L=EP(placer);
  L.grudge[acc]+=1;
  emit({e:'log',html:`{{p${acc}}} accuse {{p${placer}}} de mentir !`});
  emit({e:'cutin',seat:acc,text:'MENTEUR !',sub:`{{n${acc}}} ➜ {{n${placer}}}`});
  await wait(1400);
  emit({e:'say',seat:acc,text:A.kind==='ai'?line(A,'accuse'):'Retourne cette carte.',ms:1800});
  await wait(500);
  const t=entry.card.t,truth=t===E.table;
  emit({e:'reveal',t,truth,verdict:t==='MAITRE'?'MAÎTRE !':t==='CHAOS'?'CHAOS !':truth?'VÉRITÉ':'MENSONGE'});
  await wait(2100);
  entry.revealed=true;E.revealed.push(entry.card);L.reveals++;sync();
  if(truth){
    emit({e:'say',seat:placer,text:L.kind==='ai'?pick(['Raté.','Mauvais pari.','Dommage pour toi.']):'Je t’avais prévenu.'});
    emit({e:'log',html:`C’était vrai. {{p${acc}}} doit se tirer dessus.`});
    await wait(700);
    return await shoot(acc,acc);
  }
  L.caught++;
  if(t==='MAITRE'){
    emit({e:'cutin',seat:placer,text:'CARTE MAÎTRE',sub:'Le menteur prend l’arme et tire sur qui il veut'});
    await wait(1400);
    emit({e:'log',html:`Carte Maître ! {{p${placer}}} choisit sa cible.`});
    const tg=await input(placer,'target',{cands:othersOf(placer),title:'<b>CARTE MAÎTRE</b> · Choisis ta cible',ctx:{}});
    return await shoot(placer,tg);
  }
  if(t==='CHAOS')return await chaos();
  emit({e:'say',seat:placer,text:L.kind==='ai'?line(L,'caught'):'Aïe.',ms:1600});
  emit({e:'log',html:`Mensonge ! {{p${acc}}} gagne le droit de tirer.`});
  await wait(400);
  const tg=await input(acc,'target',{cands:othersOf(acc),title:'Mensonge démasqué · <b>Choisis ta cible</b>',ctx:{liar:placer}});
  return await shoot(acc,tg);
}
function eliminate(i){const p=EP(i);p.alive=false;p.hand=[]}
async function shoot(si,ti){
  const sh=EP(si),tg=EP(ti),self=si===ti;
  if(self)emit({e:'say',seat:si,text:sh.kind==='ai'?line(sh,'self'):'Allez… pas maintenant.'});
  else{emit({e:'say',seat:si,text:sh.kind==='ai'?line(sh,'shoot'):'Désolé. Pas désolé.'});tg.grudge[si]+=2}
  emit({e:'aim',pairs:[[si,ti]]});
  emit({e:'shotbox',s:si,t:ti,fired:sh.gun.fired});
  await wait(1450);
  const real=fireGun(sh);
  if(real)eliminate(ti);
  emit({e:'fire',results:[{s:si,t:ti,real}]});
  sync();
  emit({e:'log',html:real?`<b class="red">BANG.</b> {{p${ti}}} ${self?'tombe sous sa propre balle':`tombe sous la balle de {{p${si}}}`}.`:`Clic. {{p${ti}}} survit${self?'':` au tir de {{p${si}}}`}.`});
  await wait(1200);
  emit({e:'clearAim'});
  if(!real){emit({e:'say',seat:ti,text:tg.kind==='ai'?line(tg,'survive'):'Ouf…'});await wait(700);return 0}
  await wait(600);
  return 1;
}
async function chaos(){
  emit({e:'flash',red:true});
  emit({e:'cutin',seat:null,text:'CHAOS !',sub:'Tout le monde vise · tirs simultanés'});
  await wait(1400);
  emit({e:'log',html:'<b class="red">CHAOS !</b> Tout le monde dégaine.'});
  const shooters=aliveIdx(),targets={};
  for(const j of shooters)if(EP(j).kind==='ai')targets[j]=aiPickTarget(EP(j),{chaos:true});
  const humans=shooters.filter(j=>EP(j).kind!=='ai');
  if(humans.length){
    emit({e:'aim',pairs:shooters.filter(j=>targets[j]!=null).map(j=>[j,targets[j]])});
    await Promise.all(humans.map(h=>input(h,'target',{cands:othersOf(h),title:'<b>CHAOS</b> · Choisis ta cible',ctx:{chaos:true}}).then(v=>{targets[h]=v})));
  }
  emit({e:'aim',pairs:shooters.map(j=>[j,targets[j]])});
  for(const n of[3,2,1]){emit({e:'count',n});await wait(700)}
  const results=shooters.map(j=>({s:j,t:targets[j],real:fireGun(EP(j))}));
  const dead=[...new Set(results.filter(r=>r.real).map(r=>r.t))];
  results.forEach(r=>{if(r.s!==r.t)EP(r.t).grudge[r.s]+=2});
  dead.forEach(eliminate);
  emit({e:'fire',results});
  sync();
  results.forEach(r=>emit({e:'log',html:`{{p${r.s}}} ➜ {{p${r.t}}} : ${r.real?'<b class="red">BANG</b>':'clic'}`}));
  await wait(1500);
  emit({e:'clearAim'});
  if(dead.length)await wait(600);
  return dead.length;
}
