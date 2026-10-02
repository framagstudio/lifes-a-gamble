'use strict';
/* =====================================================================
   MUSIQUE DES MENUS : thème original « Last Call », acid-jazz funky.
   Entièrement synthétisé en WebAudio (aucun fichier audio).
   Joue en boucle du menu jusqu'au lancement d'une partie.
   ===================================================================== */
const Music=(()=>{
  const BPM=126, STEP=60/BPM/4;          // une double-croche
  const SWING=.12;                        // léger swing sur les doubles impaires
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  let ctx=null,out=null,noise=null,playing=false,timer=null,step=0,nextT=0,wantOn=false;

  /* --- grille : 2 sections de 4 mesures (A puis B), 16 pas par mesure --- */
  // [basse (midi), voicing du piano électrique]
  const CHORDS=[
    [45,[60,64,67,71]], [50,[60,64,66,69]], [43,[59,62,66,69]], [48,[64,67,71,74]],   // A : Am9  D9  Gmaj9  Cmaj9
    [41,[57,60,64,67]], [40,[56,62,67,71]], [45,[60,64,67,71]], [40,[56,59,62,68]]    // B : Fmaj9 E7#9 Am9  E7
  ];
  // motif de basse sur une mesure : [pas, intervalle, durée en pas, fantôme]
  const BASS=[[0,0,2],[3,12,1],[4,0,1,1],[6,0,2],[8,7,1],[10,12,1],[11,10,1],[13,7,1,1],[14,0,1],[15,12,1,1]];
  // accords « stabs » du piano électrique : [pas, durée]
  const KEYS=[[2,1],[6,3],[10,1],[13,3]];
  // thème du saxo (section B seulement) : [pas absolu dans la section, midi, durée]
  const LEAD=[
    [0,72,3],[3,74,1],[4,76,4],[10,79,2],[12,76,3],
    [16,74,2],[18,72,2],[20,71,6],[28,68,3],
    [32,69,2],[34,72,2],[36,76,3],[40,79,2],[42,81,6],
    [48,79,2],[50,76,2],[52,74,2],[54,72,2],[56,69,6],[62,71,2]
  ];
  // réponse de cuivres en fin de section A
  const STAB=[[56,[69,72,76]],[59,[71,74,78]],[62,[72,76,79]]];

  function init(){
    if(ctx)return true;
    const c=(typeof SFX!=='undefined'&&SFX.ctx)||null;
    if(!c)return false;
    ctx=c;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;
    out=ctx.createGain();out.gain.value=0;
    out.connect(comp).connect(ctx.destination);
    const len=ctx.sampleRate;noise=ctx.createBuffer(1,len,ctx.sampleRate);
    const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    return true;
  }
  const env=(g,t,a,peak,dec)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)};

  /* ---------- instruments ---------- */
  function kick(t){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);env(g,t,.003,.9,.28);o.connect(g).connect(out);o.start(t);o.stop(t+.35)}
  function snare(t,v=1){
    const n=ctx.createBufferSource();n.buffer=noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=2400;f.Q.value=.6;const g=ctx.createGain();env(g,t,.002,.7*v,.17);n.connect(f).connect(g).connect(out);n.start(t);n.stop(t+.2);
    const o=ctx.createOscillator(),g2=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(200,t);o.frequency.exponentialRampToValueAtTime(140,t+.08);env(g2,t,.002,.3*v,.08);o.connect(g2).connect(out);o.start(t);o.stop(t+.12);
  }
  function hat(t,open,v=1){const n=ctx.createBufferSource();n.buffer=noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=7500;const g=ctx.createGain();env(g,t,.001,(open?.32:.24)*v,open?.24:.04);n.connect(f).connect(g).connect(out);n.start(t);n.stop(t+(open?.3:.06))}
  function bass(t,m,dur,ghost){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type='sawtooth';o2.type='square';o.frequency.value=o2.frequency.value=mtof(m);o2.detune.value=-7;
    f.type='lowpass';f.Q.value=6;f.frequency.setValueAtTime(ghost?500:1600,t);f.frequency.exponentialRampToValueAtTime(260,t+.18);
    const len=Math.max(.06,dur*STEP*.9);env(g,t,.004,ghost?.12:.34,len);
    o.connect(f);o2.connect(f);f.connect(g).connect(out);o.start(t);o2.start(t);o.stop(t+len+.05);o2.stop(t+len+.05);
  }
  function keys(t,notes,dur){
    notes.forEach((m,k)=>{
      const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();
      o.type='sine';o2.type='sine';o.frequency.value=mtof(m);o2.frequency.value=mtof(m)*2;o.detune.value=(k%2?4:-4);
      const len=dur*STEP+.25;env(g,t+k*.006,.006,.07,len);g2.gain.value=.25;
      o.connect(g);o2.connect(g2).connect(g);g.connect(out);o.start(t);o2.start(t);o.stop(t+len+.1);o2.stop(t+len+.1);
    });
  }
  function lead(t,m,dur){
    const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
    o.type='sawtooth';o.frequency.value=mtof(m);
    lfo.frequency.value=5.6;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(9,t+Math.min(.25,dur*STEP));lfo.connect(lg).connect(o.detune);
    f.type='lowpass';f.Q.value=2;f.frequency.setValueAtTime(1200,t);f.frequency.linearRampToValueAtTime(3800,t+.06);
    const len=dur*STEP*.95;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.13,t+.03);g.gain.setValueAtTime(.12,t+Math.max(.04,len-.06));g.gain.exponentialRampToValueAtTime(0.0001,t+len+.05);
    o.connect(f).connect(g).connect(out);o.start(t);lfo.start(t);o.stop(t+len+.1);lfo.stop(t+len+.1);
  }
  function brass(t,notes){notes.forEach(m=>{const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=mtof(m);f.type='lowpass';f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(700,t+.15);env(g,t,.01,.06,.16);o.connect(f).connect(g).connect(out);o.start(t);o.stop(t+.25)})}

  /* ---------- séquenceur ---------- */
  function playStep(s,t){
    const sec=Math.floor(s/64)%2, inSec=s%64, bar=Math.floor(inSec/16), st=inSec%16;
    const [root,voicing]=CHORDS[sec*4+bar];
    // batterie
    if(st===0||st===7||st===10)kick(t);
    if(st===4||st===12)snare(t);
    if(st===15||(st===9&&bar%2))snare(t,.25);
    if(st%2===0)hat(t,st===14,st%4===0?1:.7); else hat(t,false,.35);
    // basse
    BASS.forEach(([p,iv,d,gh])=>{if(p===st)bass(t,root+iv-12,d,gh)});
    // piano électrique
    KEYS.forEach(([p,d])=>{if(p===st)keys(t,voicing,d)});
    // thème
    if(sec===1)LEAD.forEach(([p,m,d])=>{if(p===inSec)lead(t,m,d)});
    else STAB.forEach(([p,ns])=>{if(p===inSec&&bar===3)brass(t,ns)});
  }
  function tick(){
    if(!playing)return;
    while(nextT<ctx.currentTime+.15){
      const swing=(step%2)?SWING*STEP:0;
      playStep(step,nextT+swing);
      nextT+=STEP;step=(step+1)%128;
    }
  }
  function start(){
    wantOn=true;
    if(typeof SFX==='undefined'||!SFX.on)return;
    if(!init())return;
    if(ctx.state==='suspended')ctx.resume();
    if(playing)return;
    playing=true;step=0;nextT=ctx.currentTime+.08;
    out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setValueAtTime(out.gain.value,ctx.currentTime);out.gain.linearRampToValueAtTime(.24,ctx.currentTime+.6);
    clearInterval(timer);timer=setInterval(tick,40);tick();
  }
  function stop(keepWish){
    if(!keepWish)wantOn=false;
    if(!playing||!ctx)return;
    playing=false;clearInterval(timer);
    const n=ctx.currentTime;out.gain.cancelScheduledValues(n);out.gain.setValueAtTime(out.gain.value,n);out.gain.linearRampToValueAtTime(0,n+.35);
  }
  /* son coupé / rétabli depuis le bouton */
  function setSound(on){if(on&&wantOn)start();else stop(true)}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop(true);else if(wantOn)start()});
  /* rendu hors ligne (aperçu / tests) : renvoie un AudioBuffer de la boucle complète */
  async function render(loops=1){
    const sr=44100,dur=128*STEP*loops+1,off=new OfflineAudioContext(2,Math.ceil(sr*dur),sr);
    const save=[ctx,out,noise];ctx=off;
    const comp=off.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;
    out=off.createGain();out.gain.value=.24;out.connect(comp).connect(off.destination);
    noise=off.createBuffer(1,sr,sr);const d=noise.getChannelData(0);for(let i=0;i<sr;i++)d[i]=Math.random()*2-1;
    for(let s=0;s<128*loops;s++)playStep(s%128,.05+s*STEP+((s%2)?SWING*STEP:0));
    const buf=await off.startRendering();[ctx,out,noise]=save;return buf;
  }
  return{start,stop,setSound,render,get wanted(){return wantOn},get playing(){return playing}};
})();
