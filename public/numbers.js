/* Orbit – 123 Levels & Games (ES module) */

/* ---------- helpers ---------- */
const R=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[R(0,a.length-1)];
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=R(0,i);[a[i],a[j]]=[a[j],a[i]]}return a};
const NAMES=['','Ek','Do','Teen','Char','Paanch','Chhe','Saat','Aath','Nau','Das','Gyarah','Barah','Terah','Chaudah','Pandrah','Solah','Satrah','Atharah','Unnis','Bees'];
const EMO=['🍎','⭐','🐟','🎈','🐥','🍌','⚽','🌸'];
const opts4=(ans,lo,hi)=>{const s=new Set([ans]);while(s.size<4)s.add(R(lo,hi));return shuf([...s])};
const DN=['','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस','ग्यारह','बारह','तेरह','चौदह','पंद्रह','सोलह','सत्रह','अठारह','उन्नीस','बीस'];
const Q=(prompt,big,options,answer,say)=>({prompt,big:String(big),options:options.map(String),answer:String(answer),say:say||prompt});

/* ---------- question makers ---------- */
const MK={
 name10(){const n=R(1,10);const w=shuf([1,2,3,4,5,6,7,8,9,10].filter(x=>x!==n)).slice(0,3);return Q('Is number ka naam chuno',n,shuf([n,...w]).map(x=>NAMES[x]),NAMES[n],'इस नंबर का नाम चुनो। '+DN[n])},
 name20(){const n=R(1,20);const w=shuf([...Array(20).keys()].map(i=>i+1).filter(x=>x!==n)).slice(0,3);return Q('Is number ka naam chuno',n,shuf([n,...w]).map(x=>NAMES[x]),NAMES[n],'इस नंबर का नाम चुनो। '+DN[n])},
 count(){const n=R(1,10),e=pick(EMO);return Q('Kitne hain? Gino aur number chuno',e.repeat(n),opts4(n,1,10),n,'गिनो! कितने हैं?')},
 bigger(){let a=R(1,50),b=R(1,50);while(a===b)b=R(1,50);return Q('Kaun sa number bada hai?',a+'  ya  '+b,shuf([a,b]),Math.max(a,b),'कौन सा नंबर बड़ा है? '+a+' या '+b)},
 gap(){const s=R(1,16),i=R(1,3),seq=[s,s+1,s+2,s+3,s+4];const ans=seq[i];seq[i]='__';return Q('Gayab number dhundo',seq.join(', '),opts4(ans,1,22),ans,'गायब नंबर ढूँढो')},
 skip(){const st=pick([2,5,10]),s=st*R(0,3)||st,seq=[s,s+st,s+2*st,s+3*st,s+4*st];const i=R(1,3),ans=seq[i];seq[i]='__';return Q(st+' ke kadam: agla number kya?',seq.join(', '),opts4(ans,st,st*9),ans,st+' के कदम। गायब नंबर क्या है?')},
 order(){const a=shuf([...new Set(Array.from({length:4},()=>R(1,30)))]);while(a.length<4)a.push(R(31,40));const ok=a.slice().sort((x,y)=>x-y).join(' < ');const o=new Set([ok]);while(o.size<4)o.add(shuf(a).join(' < '));return Q('Chhote se bade ka sahi order chuno',a.join('   '),shuf([...o]),ok,'छोटे से बड़े का सही क्रम चुनो')},
 add(){const a=R(1,6),b=R(1,6),e=pick(EMO);return Q('Jodo!',e.repeat(a)+' + '+e.repeat(b)+'\n'+a+' + '+b+' = ?',opts4(a+b,2,12),a+b,a+' जमा '+b+' बराबर कितना?')},
 sub(){const a=R(3,10),b=R(1,a-1);return Q('Ghatao!',a+' − '+b+' = ?',opts4(a-b,0,10),a-b,a+' घटा '+b+' बराबर कितना?')},
 tens(){const t=R(1,9),u=R(0,9),n=t*10+u,f=(x,y)=>x+' das '+y+' ikai';const o=new Set([f(t,u)]);while(o.size<4)o.add(f(R(1,9),R(0,9)));return Q('Das aur ikai batao',n,shuf([...o]),f(t,u),n+' में कितने दहाई और कितनी इकाई?')},
 evenodd(){const n=R(1,30);return Q('Jod (even) hai ya Bejod (odd)?',n,['Jod (even)','Bejod (odd)'],n%2?'Bejod (odd)':'Jod (even)',n+' जोड़ है या बेजोड़?')},
 table(){const t=R(2,5),m=R(1,10);return Q(t+' ka table',t+' × '+m+' = ?',opts4(t*m,t,t*10),t*m,t+' का पहाड़ा। '+t+' गुणा '+m+' बराबर कितना?')},
 sign(){const a=R(1,30),b=Math.random()<.2?a:R(1,30);return Q('Sahi chinh chuno',a+'  __  '+b,['<','>','='],a<b?'<':a>b?'>':'=','सही चिह्न चुनो। '+a+' और '+b)},
 before(){const n=R(2,29),b=Math.random()<.5;return Q(b?'Kaun sa number PEHLE aata hai?':'Kaun sa number BAAD mein aata hai?',n,opts4(b?n-1:n+1,Math.max(0,n-4),n+5),b?n-1:n+1,(b?'कौन सा नंबर पहले आता है? ':'कौन सा नंबर बाद में आता है? ')+n)}
};
/* ---------- levels / games ---------- */
const LEVELS=[
 ['Number ka naam 1–10','Digit dekho, naam chuno','name10'],
 ['Number ka naam 1–20','Saare 20 numbers','name20'],
 ['Gino aur chuno','Picture gino, number chuno','count'],
 ['Chhota ya bada','Bada number dhundo','bigger'],
 ['Ek khali jagah','Gayab number dhundo','gap'],
 ['Gino aage badho','2, 5, 10 ke kadam','skip'],
 ['Number order','Chhote se bade tak lagao','order'],
 ['Jodo','Pictures ke saath addition','add'],
 ['Ghatao','Subtraction seekho','sub'],
 ['Das aur ikai','Place value samjho','tens']
];
const GAMES=[
 ['🔢','Number Match','Gino aur sahi number dabao','count',null],
 ['⬅️➡️','Pehle aur Baad','Pehle/baad wala number','before',null],
 ['⚡','Fast Math','30 second mein jitne ho sake','fast',30],
 ['🎈','Balloon Pop','Sahi number wale gubbare phodo','balloon',null],
 ['🃏','Memory Match','Number aur picture ki jodi milao','memory',null],
 ['👆','Tap in Order','1 se 9 tak jaldi se dabao','tap',null],
 ['➗','Jod ya Bejod','Even aur odd pehchano','evenodd',null],
 ['✖️','Table Time','2 se 5 ke tables','table',null],
 ['⚖️','Sahi Chinh','Chhota <, bada > ya barabar =','sign',null]
];
/* ---------- progress (store: Firestore / localStorage) ---------- */
let P={stars:{},best:{}};
const save=()=>{store.save(P).catch(e=>console.warn('Progress save failed',e))};
const starsFor=p=>p>=100?3:p>=70?2:p>=40?1:0;
const stars=n=>'<span class="st">'+'★'.repeat(n)+'<span class="o">'+'★'.repeat(3-n)+'</span></span>';
let app=null,tab='levels',store=null;

/* ---------- voice (natural, kabhi cut nahi hoti) ----------
   - Host app ka apna voice function mile (opts.speak) to wahi use hota hai.
   - Warna browser ki sabse natural Hindi voice. speechSynthesis.cancel() kabhi beech mein nahi chalta,
     isliye awaaz adhuri/kati nahi hoti; agla sawal tabhi aata hai jab bolna khatam ho.  */
let VOX={host:null,on:true};const KEEP=new Set();let VOICE=null;
const hasTTS=()=>typeof window!=='undefined'&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';
function pickVoice(){
 if(!hasTTS())return null;const vs=speechSynthesis.getVoices();if(!vs.length)return VOICE;
 const hi=vs.filter(v=>/^hi/i.test(v.lang)),en=vs.filter(v=>/^en[-_]IN/i.test(v.lang));
 return VOICE=hi.find(v=>/natural|neural|online/i.test(v.name))||hi.find(v=>/google/i.test(v.name))||hi[0]||en.find(v=>/natural|neural|online/i.test(v.name))||en[0]||null;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function say(text,o={}){
 if(!VOX.on||!text)return Promise.resolve();
 if(VOX.host){try{return Promise.resolve(VOX.host(text)).then(()=>{},()=>{})}catch(e){return Promise.resolve()}}
 if(!hasTTS())return Promise.resolve();
 if(o.skipIfBusy&&speechSynthesis.speaking)return Promise.resolve();
 return new Promise(res=>{
  const u=new SpeechSynthesisUtterance(text),v=pickVoice();
  if(v){u.voice=v;u.lang=v.lang}else u.lang='hi-IN';
  u.rate=.9;u.pitch=1;u.volume=1;KEEP.add(u);
  let tm;const done=()=>{KEEP.delete(u);clearTimeout(tm);res()};
  u.onend=done;u.onerror=done;tm=setTimeout(done,7000);
  setTimeout(()=>{try{speechSynthesis.speak(u)}catch(e){done()}},o.delay==null?150:o.delay);
 });
}
const stopVoice=()=>{if(hasTTS()&&!VOX.host)try{speechSynthesis.cancel()}catch(e){}};
if(hasTTS()){pickVoice();try{speechSynthesis.addEventListener('voiceschanged',pickVoice)}catch(e){}}
const PRAISE=['शाबाश!','बहुत बढ़िया!','सही जवाब!','वाह!'],TRY=['कोई बात नहीं, फिर कोशिश करो।','थोड़ा और ध्यान से देखो।'];

/* ---------- views ---------- */
function home(){
 const total=Object.values(P.stars).reduce((a,b)=>a+(b.s||0),0);
 let h='<div class="tabs"><button class="tab '+(tab=='games'?'on':'')+'" onclick="OrbitNum.setTab(\'games\')">123 Games</button><button class="tab '+(tab=='levels'?'on':'')+'" onclick="OrbitNum.setTab(\'levels\')">123 Levels</button></div>';
 if(tab=='levels'){
  h+='<div class="head"><div><h2>123 Levels</h2><p class="sub">Level pass karo, agla level khulega.</p></div><div class="pill">★ '+total+' / '+LEVELS.length*3+'</div></div><div class="path">';
  LEVELS.forEach((L,i)=>{const r=P.stars[i],open=i==0||(P.stars[i-1]&&P.stars[i-1].s>=1);
   h+='<div class="node '+(i%2?'r ':'')+(open?'':'lock')+'" onclick="'+(open?'OrbitNum.level('+i+')':'')+'"><div class="circle">'+(open?i+1:'🔒')+'</div><div><div class="t">'+L[0]+'</div><div class="d">'+L[1]+'</div><div class="s">'+(r?stars(r.s)+' Sabse achha '+r.p+'%':stars(0)+' Abhi khela nahi')+'</div></div></div>'});
  h+='</div>';
 }else{
  h+='<h2>123 Games</h2><p class="sub">Khelo aur score badhao!</p><div class="games">';
  GAMES.forEach((G,i)=>{h+='<div class="g" onclick="OrbitNum.game('+i+')"><div class="em">'+G[0]+'</div><div><b>'+G[1]+'</b><span>'+G[2]+'</span></div><div class="hs">'+(P.best[i]!=null?'🏆 '+P.best[i]:'')+'</div></div>'});
  h+='</div>';
 }
 app.innerHTML=h;
}
let S=null;
function run(cfg){S=Object.assign({i:0,ok:0,done:false,qs:[]},cfg);next()}
function level(i){const mk=MK[LEVELS[i][2]];run({kind:'level',idx:i,n:5,mk,title:LEVELS[i][0]})}
function game(i){const G=GAMES[i];if(PLAY[G[3]])return PLAY[G[3]](i);if(G[3]=='fast'){const mk=()=>MK[pick(['add','sub','bigger','gap'])]();run({kind:'game',idx:i,n:999,mk,time:G[4],title:G[1]});S.t=setInterval(()=>{S.time--;const e=document.getElementById('tm');if(e)e.textContent='⏱ '+S.time+'s';if(S.time<=0)finish()},1000)}
 else run({kind:'game',idx:i,n:8,mk:MK[G[3]],title:G[1]})}
function next(){
 if(S.i>=S.n)return finish();
 const q=S.mk();S.q=q;
 app.innerHTML='<div class="top"><button class="back" onclick="OrbitNum.quit()">← Wapas</button><div class="bar"><i style="width:'+(S.n<999?S.i/S.n*100:0)+'%"></i></div>'+(S.time?'<div class="timer" id="tm">⏱ '+S.time+'s</div>':'')+'</div><div class="q"><div class="p">'+q.prompt+'</div><div class="big">'+q.big.replace(/\n/g,'<br>')+'</div></div><div class="opts">'+q.options.map(o=>'<button class="opt" onclick="OrbitNum.ans(this)" data-v="'+o+'">'+o+'</button>').join('')+'</div>';
 if(q.options.some(o=>o.length>9))document.querySelectorAll('.opt').forEach(b=>b.style.fontSize='18px');
 if(!S.time)say(q.say);
}
function ans(b){if(!S||S.lock)return;S.lock=1;const me=S,ok=b.dataset.v===S.q.answer;if(ok)S.ok++;b.classList.add(ok?'ok':'no');
 if(!ok)document.querySelectorAll('.opt').forEach(x=>{if(x.dataset.v===S.q.answer)x.classList.add('ok')});
 S.i++;
 const fb=me.time?null:say(ok?pick(PRAISE):pick(TRY));   /* Fast Math mein tez chalta hai, isliye bolna nahi */
 Promise.all([fb,wait(ok?600:1200)]).then(()=>{if(S!==me)return;me.lock=0;if(!me.done)next()});}
function replay(){if(S&&S.q)say(S.q.say)}
function quit(){if(S)clearInterval(S.t);S=null;stopVoice();home()}
function finish(){
 if(S.done)return;S.done=true;clearInterval(S.t);let h='<div class="res">';
 if(S.kind=='level'){const p=Math.round(S.ok/S.n*100),s=starsFor(p),old=P.stars[S.idx]||{s:0,p:0};
  P.stars[S.idx]={s:Math.max(s,old.s),p:Math.max(p,old.p)};save();
  h+='<div class="big">'+(s?'🎉':'💪')+'</div><h2>'+(s?'Level pass!':'Thoda aur practice!')+'</h2><div style="font-size:30px">'+stars(s)+'</div><p class="sub">Score: '+S.ok+' / '+S.n+' ('+p+'%)</p><button class="btn" onclick="OrbitNum.level('+S.idx+')">Phir khelo</button>'+(s&&S.idx<LEVELS.length-1?'<button class="btn alt" onclick="OrbitNum.level('+(S.idx+1)+')">Agla level →</button>':'')
 }else{const sc=S.ok;if(P.best[S.idx]==null||sc>P.best[S.idx])P.best[S.idx]=sc;save();
  h+='<div class="big">🏆</div><h2>Score: '+sc+'</h2><p class="sub">Best: '+P.best[S.idx]+'</p><button class="btn" onclick="OrbitNum.game('+S.idx+')">Phir khelo</button>'}
 h+='<br><button class="btn alt" onclick="OrbitNum.quit()">Wapas jao</button></div>';app.innerHTML=h;
 if(S.kind=='level'){const s2=starsFor(Math.round(S.ok/S.n*100));say(s2?'शाबाश! तुमने लेवल पास कर लिया!':'अच्छी कोशिश! थोड़ा और अभ्यास करो।')}
 else say('वाह! तुम्हारा स्कोर '+S.ok+' है।');
}


/* ---------- interactive games ---------- */
const topBar=x=>'<div class="top"><button class="back" onclick="OrbitNum.quit()">← Wapas</button><div style="flex:1"></div>'+x+'</div>';
const newG=i=>{S={kind:'game',idx:i,ok:0,done:false,n:999,i:0}};
function tick(){S.time--;const e=document.getElementById('tm');if(e)e.textContent='⏱ '+S.time+'s';if(S.time<=0)finish()}
const setSc=()=>{const e=document.getElementById('sc');if(e)e.textContent='⭐ '+S.ok};

function playBalloon(i){newG(i);S.time=30;S.t=setInterval(tick,1000);balloonRound()}
function balloonRound(){
 if(!S||S.done)return;const tg=R(1,20);S.target=tg;S.left=3;say(tg+' नंबर वाले गुब्बारे फोड़ो');
 const others=shuf([...Array(20).keys()].map(x=>x+1).filter(x=>x!==tg)).slice(0,9);
 const nums=shuf([tg,tg,tg,...others]);
 app.innerHTML=topBar('<div class="pill" id="sc">⭐ '+S.ok+'</div><div class="timer" id="tm">⏱ '+S.time+'s</div>')+
 '<div class="q"><div class="p">Sirf is number wale gubbare phodo</div><div class="big">'+tg+'</div></div><div class="bgrid">'+
 nums.map((n,k)=>'<button class="balloon c'+(k%5)+'" data-n="'+n+'" onclick="OrbitNum.pop(this)">'+n+'</button>').join('')+'</div>';
}
function pop(b){
 if(!S||S.done||b.classList.contains('gone'))return;
 if(+b.dataset.n===S.target){S.ok++;b.classList.add('gone');S.left--;setSc();if(S.left==0)setTimeout(balloonRound,250)}
 else{S.ok=Math.max(0,S.ok-1);setSc();b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),400)}
}

function playMemory(i){newG(i);say('नंबर और उतनी गिनती की जोड़ी मिलाओ');S.moves=0;S.found=0;S.open=[];S.lock=false;
 const ns=shuf([1,2,3,4,5,6,7,8,9]).slice(0,4),e=pick(EMO);
 S.cards=shuf(ns.flatMap(n=>[{k:n,t:String(n)},{k:n,t:e.repeat(n)}]));
 app.innerHTML=topBar('<div class="pill" id="sc">Chaal: 0</div>')+'<div class="q"><div class="p">Number aur uski gintiyon ki jodi milao</div></div><div class="mgrid">'+
 S.cards.map((c,k)=>'<button class="mc" data-i="'+k+'" onclick="OrbitNum.flip(this)">?</button>').join('')+'</div>';
}
function flip(b){
 if(!S||S.lock||b.classList.contains('open')||b.classList.contains('done'))return;
 const c=S.cards[+b.dataset.i];b.textContent=c.t;b.classList.add('open');if(c.t.length>2)b.style.fontSize='15px';S.open.push(b);
 if(S.open.length<2)return;
 S.moves++;const sc=document.getElementById('sc');if(sc)sc.textContent='Chaal: '+S.moves;
 const[a,d]=S.open;S.lock=true;
 if(S.cards[+a.dataset.i].k===S.cards[+d.dataset.i].k){a.classList.add('done');d.classList.add('done');S.open=[];S.lock=false;S.found++;
  if(S.found==4){S.ok=Math.max(1,20-(S.moves-4)*2);setTimeout(finish,700)}}
 else setTimeout(()=>{[a,d].forEach(x=>{x.classList.remove('open');x.textContent='?';x.style.fontSize=''});S.open=[];S.lock=false},900);
}

function playTap(i){newG(i);say('एक से नौ तक क्रम से दबाओ');S.next=1;S.start=Date.now();
 S.t=setInterval(()=>{const e=document.getElementById('tm');if(e)e.textContent='⏱ '+Math.floor((Date.now()-S.start)/1000)+'s'},500);
 app.innerHTML=topBar('<div class="timer" id="tm">⏱ 0s</div>')+'<div class="q"><div class="p">1 se 9 tak order mein dabao</div></div><div class="tgrid">'+
 shuf([1,2,3,4,5,6,7,8,9]).map(n=>'<button class="tb" data-n="'+n+'" onclick="OrbitNum.tapn(this)">'+n+'</button>').join('')+'</div>';
}
function tapn(b){
 if(!S||S.done||b.classList.contains('done'))return;
 if(+b.dataset.n===S.next){b.classList.add('done');S.next++;
  if(S.next>9){S.ok=Math.max(1,60-Math.floor((Date.now()-S.start)/1000));finish()}else say(DN[+b.dataset.n],{skipIfBusy:true,delay:0})}
 else{b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),400)}
}
const PLAY={balloon:playBalloon,memory:playMemory,tap:playTap};

/* ---------- public API ---------- */
window.OrbitNum={setTab(t){tab=t;home()},level,game,ans,quit,replay,pop,flip,tapn};

/** Number section ko `el` ke andar chalao. store = {load():Promise<obj|null>, save(obj):Promise} */
export async function mountNumbers(el,theStore,opts={}){
 el.innerHTML='<div id="orbit-numbers"><div class="wrap" id="num-app"></div></div>';
 app=el.querySelector('#num-app');store=theStore;tab='levels';
 VOX.host=typeof opts.speak==='function'?opts.speak:null;VOX.on=opts.voice!==false;
 try{const d=await store.load();if(d)P={stars:d.stars||{},best:d.best||{}}}catch(e){console.warn('Progress load failed',e)}
 home();
}
export function unmountNumbers(){if(S&&S.t)clearInterval(S.t);S=null;app=null;stopVoice()}

/** Guest / offline: browser localStorage */
export const localStore=(key='orbit_num_v1')=>({
 load:async()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}},
 save:async d=>{try{localStorage.setItem(key,JSON.stringify(d))}catch(e){}}
});

/** Firestore (modular SDK v9+). Path: users/{uid}/progress/numbers
 *  fs = {doc, getDoc, setDoc, serverTimestamp} aapke apne firebase/firestore import se */
export const firestoreStore=(db,uid,fs)=>{
 const ref=fs.doc(db,'users',uid,'progress','numbers');
 return{
  load:async()=>{const snap=await fs.getDoc(ref);return snap.exists()?snap.data():null},
  save:async d=>fs.setDoc(ref,{stars:d.stars,best:d.best,updatedAt:fs.serverTimestamp()})
 };
};
