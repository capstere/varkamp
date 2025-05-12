// --- KONFIGURATION av gåtorna ---
const puzzles = [
  { prompt: '1: Vem i laget startar resan?', type: 'name', answer: '*', hint: 'Skriv ett deltagarnamn från listan' },
  { prompt: '2: Bakom mörkret finner du svaret', type: 'stego', answer: '17', img: 'assets/images/stego.png', hint: 'Prova klicka på bilden.' },
  { prompt: '3: Vilken sång hör du?', type: 'audio', answer: 'editpir', src: 'assets/audio/p3-chorus-rev.mp3', hint: 'Baklängesmusik, lyssna noga.' },
  { prompt: '4: Tajma svar med primtal', type: 'prime', answer: null, hint: 'Det är baserat på minuter som gått...' },
  { prompt: '5: Skanna QR-koden och följ instruktion', type: 'qr', answer: 'redo', data: 'Välj ett lämpligt träd. Ta en bild med hela laget + trädet. Skriv trädets namn på latin. Ange ert lagnamn. Skriv lösenordet. Ta en skärmdump och visa för domaren.', hint: 'När ni är redo, skriv "redo".' }
];

const validNames = [
  "jana","jens","clare","johannes","jakob","nille","jonatan","jennifer",
  "ville","simon","matias","liza","samer","christina","oscar","rebecca",
  "philip","hampus","amelia","malin","joel"
];

// --- STORAGE-HJÄLPARE ---
function safeSet(key, val) {
  try { localStorage.setItem(key, val); }
  catch(e) { console.warn('LocalStorage:', e); }
}
function safeGet(key) {
  try { return localStorage.getItem(key); }
  catch(e) { console.warn('LocalStorage:', e); return null; }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); }
  catch(e) { console.warn('LocalStorage:', e); }
}

// --- GLOBALA VARIABLER ---
let current = 0, startTime = 0, timerId = 0;
const app      = document.getElementById('app');
const timerEl  = document.getElementById('timer');
const progEl   = document.getElementById('progress');
const aCorrect = document.getElementById('audio-correct');
const aWrong   = document.getElementById('audio-wrong');
const aFinish  = document.getElementById('audio-finish');
let failCount  = 0, puzzleAudio = null;

// --- INIT ---
window.onload = () => {
  // Preload ljud och bild
  ['correct','wrong','finish'].forEach(id => document.getElementById('audio-'+id).load());
  new Image().src = puzzles.find(p=>p.type==='stego').img;

  if (safeGet('varkamp_current')) {
    restoreTimer();
  } else {
    renderIntro();
  }
};

// --- TIMER/FORTSÄTT ---
function restoreTimer() {
  const t = parseInt(safeGet('varkamp_timer'));
  startTime = (!isNaN(t) && t>0) ? t : Date.now();
  safeSet('varkamp_timer', startTime);
  const p = parseInt(safeGet('varkamp_current'));
  current = (!isNaN(p) && p>=0) ? p : 0;

  timerId = setInterval(updateTimer, 500);
  renderPuzzle(current);
}

function renderIntro() {
  safeRemove('varkamp_current');
  safeRemove('varkamp_timer');
  clearInterval(timerId);
  app.innerHTML = `
    <div class="card">
      <p class="prompt">Välkommen till VÅRKAMP<sup>5</sup>!</p>
      <button id="start" type="button">Starta tävlingen</button>
    </div>`;
  document.getElementById('start').onclick = restoreTimer;
}

// --- TIMER-UPDATE ---
function updateTimer() {
  const d = Date.now() - startTime;
  const m = String(Math.floor(d/60000)).padStart(2,'0');
  const s = String(Math.floor((d%60000)/1000)).padStart(2,'0');
  timerEl.textContent = `${m}:${s}`;
}

// --- RENDERA GÅTA ---
function renderPuzzle(i) {
  safeSet('varkamp_current', i);
  current = i; failCount = 0;
  app.innerHTML = '';
  progEl.textContent = `Gåta ${i+1} av ${puzzles.length}`;

  if (puzzleAudio) { puzzleAudio.pause(); puzzleAudio.currentTime = 0; puzzleAudio=null; }

  if (i>=puzzles.length) return finish();

  const p = puzzles[i];
  const card = document.createElement('div'); card.className = 'card';
  const prm  = document.createElement('div'); prm.className='prompt'; prm.textContent = p.prompt;
  card.appendChild(prm);

  let inputEl, msgEl, hintEl;

  switch(p.type) {
    case 'name':
    case 'prime':
    case 'text':
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Skriv svar';
      card.appendChild(inputEl);
      break;

    case 'stego':
      const img = document.createElement('img');
      img.src = p.img; img.alt='Stegobild'; img.style.filter='brightness(0)';
      img.onclick = ()=> img.style.filter='';
      card.appendChild(img);
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Tal (siffror)';
      card.appendChild(inputEl);
      break;

    case 'audio':
      puzzleAudio = new Audio(p.src); puzzleAudio.preload='auto';
      const btn = document.createElement('button');
      btn.textContent='Spela baklänges';
      btn.onclick = ()=>{
        puzzleAudio.play().catch(()=>{}); 
        btn.textContent='...spelar';
      };
      card.appendChild(btn);
      inputEl = document.createElement('input');
      inputEl.placeholder='Svara här';
      card.appendChild(inputEl);
      break;

    case 'qr':
      const qdiv = document.createElement('div'); qdiv.id='qrcode';
      card.appendChild(qdiv);
      new QRCode(qdiv, { text:p.data, width: Math.min(window.innerWidth*0.7, 200), height: Math.min(window.innerWidth*0.7, 200) });
      inputEl = document.createElement('input');
      inputEl.placeholder='Skriv ordet när ni är redo';
      card.appendChild(inputEl);
      break;
  }

  msgEl  = document.createElement('div'); msgEl.className='error-msg';
  hintEl = document.createElement('div'); hintEl.className='hint-msg';
  card.appendChild(msgEl); card.appendChild(hintEl);

  const send = document.createElement('button');
  send.textContent='Skicka';
  send.setAttribute('aria-label', `Skicka svar på gåta ${i+1}`);
  send.onclick = ()=> checkAnswer(p, inputEl.value.trim().toLowerCase(), msgEl, hintEl, card, inputEl);
  card.appendChild(send);

  app.appendChild(card);
  inputEl?.focus();
}

// --- Kontrollera svar ---
function checkAnswer(p, ans, msgEl, hintEl, card, inputEl) {
  puzzleAudio?.pause();

  // Primtalsgåta: lås upp svaret dynamiskt
  if (p.type==='prime') {
    const m = Math.floor((Date.now()-startTime)/60000);
    if (!isPrime(m)) {
      showError(msgEl, '⏳ Vänta till ett primtal-minut!');
      return;
    }
    p.answer = String(m);
  }

  // Namn-validering
  let correct = (ans===String(p.answer));
  if (p.type==='name') correct = validNames.includes(ans);

  if (correct) {
    playSound((p.type==='name'||current+1<puzzles.length)? aCorrect : aFinish);
    feedback(card, 'correct');
    inputEl?.removeAttribute('aria-invalid');
    setTimeout(()=> renderPuzzle(current+1), 400);
  } else {
    playSound(aWrong);
    feedback(card, 'shake');
    showError(msgEl, '❌ Fel – försök igen!');
    inputEl?.setAttribute('aria-invalid','true');
    if (++failCount>=2 && p.hint) hintEl.textContent=`Tips: ${p.hint}`;
  }
}

// --- Hjälpfunktioner ---
function showError(el, txt){ el.textContent=txt; }
function playSound(audio){ audio.currentTime=0; audio.play().catch(()=>{}); }
function feedback(card, cls){
  card.classList.add(cls);
  setTimeout(()=> card.classList.remove(cls), 500);
}
function isPrime(n){
  if (n<2) return false;
  for (let i=2;i*i<=n;i++) if (n%i===0) return false;
  return true;
}

// --- Slutvy ---
function finish() {
  safeRemove('varkamp_current');
  clearInterval(timerId);
  playSound(aFinish);

  const secs = Math.floor((Date.now()-startTime)/1000);
  safeSet('varkamp_score', secs);
  safeSet('varkamp_finished', Date.now());

  const card = document.createElement('div'); card.className='card';
  card.innerHTML=`
    <h2>✅ Klart!</h2>
    <p class="prompt">Fyll i formuläret nedan och ta en skärmdump!</p>
    <label>Trädets namn (latin):</label>
    <input placeholder="Ex: Quercus robur">
    <label>Lagnamn:</label>
    <input placeholder="Ex: Tigerlaget">
    <label>Slutlösenord:</label>
    <input placeholder="Ex: KRAMP123">
    <label>Tid:</label>
    <input readonly value="${secs} sekunder">
    <label>Ladda upp bild:</label>
    <input type="file" accept="image/*">
    <p style="margin-top:1rem;">📸 <strong>Ta en skärmdump och visa för domaren!</strong></p>
  `;
  app.innerHTML=''; app.appendChild(card);
}
