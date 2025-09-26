// ====== UTIL ======
const $  = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
const rng = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

function makeCardEl(n){
  const t = document.getElementById('tplCard');
  const el = t.content.firstElementChild.cloneNode(true);
  el.querySelector('.corner').textContent=n;
  el.querySelector('.big').textContent=n;
  if(n<0) el.classList.add('neg');
  el.dataset.val = n;
  return el;
}

// ====== GAME STATE ======
const state = {
  round:0,
  target: null,
  difficulty: 'normal',
  allowedOps: ['+','-','×'],
  ranges: {easy:[-10,10], normal:[-20,20], hard:[-50,50]},
  opsByDiff: {easy:['+','-'], normal:['+','-','×'], hard:['+','-','×','÷']},
  community: [], // 5 angka di meja
  players:[
    {name:'Pemain 1 (Anda)', hand:[], score:0, last: ''},
    {name:'Pemain 2 (CPU)', hand:[], score:0, last: ''},
    {name:'Pemain 3 (CPU)', hand:[], score:0, last: ''},
  ],
  turn:0,
};

function setDifficulty(d){
  state.difficulty = d;
  state.allowedOps = state.opsByDiff[d];
}

function drawInt(){
  const [a,b] = state.ranges[state.difficulty];
  let n = rng(a,b);
  return n;
}

function dealHands(){
  state.community = Array.from({length:5}, drawInt);
  state.players.forEach(p=>{p.hand = [drawInt(), drawInt()]});
}

function newTarget(){
  const [a,b] = state.ranges[state.difficulty];
  const mid = Math.floor((a+b)/2);
  state.target = (mid + rng(-Math.abs(a), Math.abs(b))/2) | 0; // integer-ish
}

function scoreFor(delta){
  if(delta===0) return 100;
  if(Math.abs(delta)<=2) return 50;
  if(Math.abs(delta)<=5) return 20;
  return 0;
}

function applyOp(a,op,b){
  switch(op){
    case '+': return a+b;
    case '-': return a-b;
    case '×': return a*b;
    case '÷':
      if(b===0) return null;
      const r = a/b;
      return Number.isInteger(r)? r : null; // bagi bulat
  }
}

function updateScoreboard(){
  const tbody = document.getElementById('scoreBody');
  tbody.innerHTML = state.players.map((p,i)=>`
    <tr>
      <td>${p.name}${i===state.turn? ' <span class="badge bg-info ms-1">giliran</span>':''}</td>
      <td class="fw-bold">${p.score}</td>
      <td class="text-white-50 small">${p.last||'—'}</td>
    </tr>
  `).join('');
  document.getElementById('turnName').textContent = state.players[state.turn].name;
  document.getElementById('round').textContent = state.round;
}

function renderCommunity(){
  const wrap = document.getElementById('community');
  wrap.innerHTML = '';
  state.community.forEach(n=>wrap.appendChild(makeCardEl(n)));
}

function renderHands(){
  const row = document.getElementById('playerHands');
  row.innerHTML = '';
  state.players.forEach((p,idx)=>{
    const col = document.createElement('div');
    col.className = 'col-12 col-md-4';
    col.innerHTML = `
      <div class="p-2 p-md-3 glow rounded h-100">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="fw-bold">${p.name}</div>
          <span class="badge ${idx===0?'bg-success':'bg-secondary'}">${idx===0?'Kendali Anda':'CPU'}</span>
        </div>
        <div class="d-flex gap-2">${p.hand.map(n=>makeCardEl(n).outerHTML).join('')}</div>
      </div>
    `;
    row.appendChild(col);
  });
}

function fillSelectors(){
  const ops = state.allowedOps;
  const opSel = document.getElementById('selOp');
  opSel.innerHTML = ops.map(o=>`<option>${o}</option>`).join('');

  const allChoices = getActiveChoices();
  const aSel = document.getElementById('selA');
  const bSel = document.getElementById('selB');
  aSel.innerHTML = allChoices.map((c,i)=>`<option value="${i}">${c.label}</option>`).join('');
  bSel.innerHTML = aSel.innerHTML;
}

function getActiveChoices(){
  const idx = Number(document.getElementById('activePlayer').value);
  const p = state.players[idx];
  const fromHand = p.hand.map((n,i)=>({type:'hand', idx:i, value:n, label:`Hand ${i+1}: ${n}`}));
  const fromComm = state.community.map((n,i)=>({type:'comm', idx:i, value:n, label:`Meja ${i+1}: ${n}`}));
  return [...fromHand, ...fromComm];
}

function submitMove(){
  const idx = Number(document.getElementById('activePlayer').value);
  const p = state.players[idx];
  const choices = getActiveChoices();
  const aIdx = Number(document.getElementById('selA').value);
  const bIdx = Number(document.getElementById('selB').value);
  const op = document.getElementById('selOp').value;
  const A = choices[aIdx];
  const B = choices[bIdx];
  if(!A || !B) return;

  const countHand = [A,B].filter(c=>c.type==='hand').length;
  const countComm = [A,B].filter(c=>c.type==='comm').length;
  if(!(countHand===2 && countComm===0) && !(countHand===1 && countComm===1)){
    showCalc(`❗ Gunakan kombinasi: (2 kartu tangan) ATAU (1 tangan + 1 meja).`);
    return;
  }
  if(aIdx===bIdx){
    showCalc('❗ Operand A dan B harus berbeda kartu.');
    return;
  }

  const res = applyOp(A.value, op, B.value);
  if(res===null){
    showCalc(`❌ Operasi tidak valid: ${A.value} ${op} ${B.value}`);
    return;
  }
  const delta = res - state.target;
  const pts = scoreFor(delta);
  p.score += pts;
  p.last = `${A.value} ${op} ${B.value} = ${res} (Δ ${delta>0?'+':''}${delta}) ➜ +${pts}`;
  updateScoreboard();
  showCalc(`✅ ${p.name}: ${p.last}`);

  state.turn = (state.turn+1)%3;
  document.getElementById('activePlayer').value = state.turn;
  fillSelectors();
}

function showCalc(text){
  document.getElementById('lastCalc').textContent = text;
}

function nextRound(){
  state.round++;
  state.turn = 0;
  newTarget();
  dealHands();
  renderCommunity();
  renderHands();
  updateScoreboard();
  fillSelectors();
  document.getElementById('targetBox').textContent = state.target;
  document.getElementById('btnNextRound').disabled = false;
}

function newGame(){
  setDifficulty(document.getElementById('difficulty').value);
  state.players.forEach(p=>{p.score=0; p.last='';});
  state.round = 0;
  nextRound();
}

// ====== BOT (CPU) ======
function bestAutoFor(playerIdx){
  const p = state.players[playerIdx];
  const ops = state.allowedOps;
  const choices = [
    ...p.hand.map((n,i)=>({type:'hand', idx:i, value:n, label:`Hand ${i+1}: ${n}`})),
    ...state.community.map((n,i)=>({type:'comm', idx:i, value:n, label:`Meja ${i+1}: ${n}`})),
  ];
  let best = null;
  for(let i=0;i<choices.length;i++){
    for(let j=0;j<choices.length;j++){
      if(i===j) continue;
      const A = choices[i], B=choices[j];
      const countHand = [A,B].filter(c=>c.type==='hand').length;
      const countComm = [A,B].filter(c=>c.type==='comm').length;
      if(!((countHand===2 && countComm===0) || (countHand===1 && countComm===1))) continue;
      for(const op of ops){
        const val = applyOp(A.value, op, B.value);
        if(val===null) continue;
        const delta = Math.abs(val - state.target);
        const pts = scoreFor(val - state.target);
        const scoreRank = (pts*1000) - delta;
        if(!best || scoreRank > best.rank){
          best = {A,B,op,val,delta:val-state.target, pts, rank:scoreRank};
        }
      }
    }
  }
  return best;
}

function doAuto(activeOverrideIdx){
  const idx = activeOverrideIdx ?? Number(document.getElementById('activePlayer').value);
  const best = bestAutoFor(idx);
  if(!best){ showCalc('Tidak ada kombinasi valid.'); return; }
  const p = state.players[idx];
  p.score += best.pts;
  p.last = `${best.A.value} ${best.op} ${best.B.value} = ${best.val} (Δ ${best.delta>0?'+':''}${best.delta}) ➜ +${best.pts}`;
  updateScoreboard();
  showCalc(`🤖 ${p.name}: ${p.last}`);
  state.turn = (state.turn+1)%3;
  document.getElementById('activePlayer').value = state.turn;
  fillSelectors();
}

// ====== AUDIO ======
const bgMusic = document.getElementById('bgMusic');
const btnMusic = document.getElementById('btnMusic');

// setel preferensi awal
bgMusic.volume = 0.3;   // 30% volume
let musicWanted = false; // user belum menyalakan musik

// fungsi untuk update label tombol
function updateMusicButton(){
  if(bgMusic.paused){
    btnMusic.textContent = '🔇 Musik OFF';
    btnMusic.classList.remove('playing');
  } else {
    btnMusic.textContent = '🔊 Musik ON';
    btnMusic.classList.add('playing');
  }
}

// Usaha memulai musik saat ada interaksi pertama (autoplay unlock)
async function tryStartMusic() {
  if(!musicWanted) return;      // hanya jika user menginginkan musik
  if(!bgMusic.muted) return;    // kalau sudah unmuted, biarkan
  try {
    bgMusic.muted = false;
    await bgMusic.play();
  } catch(e){
    // jika tetap gagal (kebijakan browser), biarkan tombol manual
  } finally {
    updateMusicButton();
  }
}

// klik tombol musik
btnMusic.addEventListener('click', async () => {
  musicWanted = !musicWanted;
  if(musicWanted){
    try {
      bgMusic.muted = false;
      await bgMusic.play();
    } catch(e){
      // jika gagal, biarkan user klik lagi setelah interaksi lain
    }
  } else {
    bgMusic.pause();
  }
  updateMusicButton();
});

// setiap interaksi tombol game – coba start musik jika user sudah memilih ON
['btnNewGame','btnNextRound','btnSubmit','btnAuto','btnResetScore'].forEach(id=>{
  const el = document.getElementById(id);
  if(el){
    el.addEventListener('click', tryStartMusic);
  }
});
// juga dengarkan interaksi global (klik/keypress) untuk membantu unlock
document.addEventListener('keydown', tryStartMusic);
document.addEventListener('click', (e)=>{
  // abaikan klik pada tombol musik—sudah ditangani
  if(e.target && e.target.id === 'btnMusic') return;
  tryStartMusic();
});

// ====== EVENTS ======
document.getElementById('btnNewGame').addEventListener('click', newGame);
document.getElementById('btnNextRound').addEventListener('click', nextRound);
document.getElementById('btnSubmit').addEventListener('click', submitMove);
document.getElementById('btnAuto').addEventListener('click', ()=>doAuto());
document.getElementById('activePlayer').addEventListener('change', fillSelectors);
document.getElementById('difficulty').addEventListener('change', ()=>{
  setDifficulty(document.getElementById('difficulty').value);
  fillSelectors();
});
document.getElementById('btnResetScore').addEventListener('click', ()=>{
  state.players.forEach(p=>{p.score=0; p.last='';});
  updateScoreboard();
  showCalc('Skor direset.');
});

// Mulai otomatis satu game
newGame();
// Update tampilan label musik awal
updateMusicButton();
