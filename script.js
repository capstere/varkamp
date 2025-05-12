// --- KONFIGURATION av gåtorna ---
const puzzles = [
  { prompt: '1: Vem i laget startar resan?', type: 'name', answer: '*', hint: 'Skriv ett deltagarnamn från listan' },
  { prompt: '2: Bakom mörkret finner du svaret', type: 'stego', answer: '17', img: 'assets/images/stego.png', hint: 'Prova klicka på bilden.' },
  { prompt: '3: Vilken sång hör du?', type: 'audio', answer: 'editpir', src: 'assets/audio/p3-chorus-rev.mp3', hint: 'Baklängesmusik, lyssna noga.' },
  { prompt: '4: Tajma svar med primtal', type: 'prime', answer: null, hint: 'Det är baserat på minuter som gått...' },
  { prompt: '5: Skanna QR‑koden och följ instruktion', type: 'qr', answer: 'redo', data: 'Välj ett lämpligt träd. Ta en bild med hela laget + trädet. Skriv trädets namn på latin. Ange ert lagnamn. Skriv lösenordet. Ta en skärmdump och visa för domaren.', hint: 'När ni är redo, skriv "redo".' }
];

const validNames = [
  "jana", "jens", "clare", "johannes", "jakob", "nille", "jonatan", "jennifer",
  "ville", "simon", "matias", "liza", "samer", "christina", "oscar", "rebecca",
  "philip", "hampus", "amelia", "malin", "joel"
];

// --- GLOBALA VARIABLER ---
let current = 0, startTime = 0, timerId = 0;
const app = document.getElementById('app');
const timer = document.getElementById('timer');
const aCorrect = document.getElementById('audio-correct');
const aWrong   = document.getElementById('audio-wrong');
const aFinish  = document.getElementById('audio-finish');
let failCount = 0;
let puzzleAudio = null;

// --- PRELOAD ---
const styleFade = document.createElement('style');
styleFade.textContent = `
@keyframes fadeout {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; display: none; }
}`;
document.head.appendChild(styleFade);

window.onload = () => {
  ['correct', 'wrong', 'finish'].forEach(id => {
    const a = document.getElementById('audio-' + id);
    a.load();
  });

  const img = new Image();
  img.src = puzzles.find(p => p.type === 'stego').img;

  if (localStorage.getItem('varkamp_current')) {
    restoreTimer();
  } else {
    renderIntro();
  }
};


// --- TIMER-ÅTERSTÄLLNING ---
function restoreTimer() {
  const saved = localStorage.getItem('varkamp_timer');
  const parsed = parseInt(saved);
  startTime = (!isNaN(parsed) && parsed > 0) ? parsed : Date.now();
  localStorage.setItem('varkamp_timer', startTime);

  const savedPuzzle = parseInt(localStorage.getItem('varkamp_current'));
  current = (!isNaN(savedPuzzle) && savedPuzzle >= 0) ? savedPuzzle : 0;

  timerId = setInterval(updateTimer, 500);
  renderPuzzle(current);
}

// --- INTRO ---
function renderIntro() {
  localStorage.removeItem('varkamp_current');
  localStorage.removeItem('varkamp_timer');
  clearInterval(timerId);
  app.innerHTML = `
    <div class="card">
      <p class="prompt">Välkommen till VÅRKAMP<sup>5</sup>!</p>
      <button id="start" type="button">Starta tävlingen</button>
    </div>`;
  document.getElementById('start').onclick = () => {
    restoreTimer();
  };
}

// --- TIMER ---
function updateTimer() {
  const d = Date.now() - startTime;
  const m = String(Math.floor(d / 60000)).padStart(2, '0');
  const s = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
  timer.textContent = `${m}:${s}`;
}



// --- RENDER PUZZLE ---
function renderPuzzle(i) {
  localStorage.setItem('varkamp_current', i);
  current = i;
  failCount = 0;
  app.innerHTML = '';

  if (puzzleAudio) {
    puzzleAudio.pause();
    puzzleAudio.currentTime = 0;
    puzzleAudio = null;
  }

  if (i >= puzzles.length) return finish();

  const p = puzzles[i];
  const card = document.createElement('div');
  card.className = 'card';

  const prm = document.createElement('div');
  prm.className = 'prompt';
  prm.textContent = p.prompt;
  card.appendChild(prm);

  let inputEl, msgEl, hintEl;

  switch (p.type) {
    case 'name':
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Skriv ett deltagarnamn';
      card.appendChild(inputEl);
      break;

    case 'text':
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Skriv svar';
      card.appendChild(inputEl);
      break;

    case 'stego':
      const img = document.createElement('img');
      img.src = p.img;
      img.alt = 'Stegobild';
      img.style.filter = 'brightness(0)';
      img.onclick = () => img.style.filter = '';
      card.appendChild(img);
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Tal (siffror)';
      card.appendChild(inputEl);
      break;

    case 'audio':
      puzzleAudio = new Audio(p.src);
      puzzleAudio.preload = 'auto';
      const rbtn = document.createElement('button');
      rbtn.type = 'button';
      rbtn.textContent = 'Spela upp baklänges';
      rbtn.onclick = () => {
        try {
          puzzleAudio.pause();
          puzzleAudio.currentTime = 0;
          puzzleAudio.play();
        } catch (e) {
          console.warn("Kunde inte spela upp ljud:", e);
        }
        rbtn.textContent = 'yalpeR';
      };
      card.appendChild(rbtn);
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Svara här';
      card.appendChild(inputEl);
      break;

    case 'prime':
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Ditt svar';
      card.appendChild(inputEl);
      break;

    case 'qr':
      const qdiv = document.createElement('div');
      qdiv.id = 'qrcode';
      card.appendChild(qdiv);
      new QRCode(qdiv, { text: p.data, width: 150, height: 150 });
      inputEl = document.createElement('input');
      inputEl.placeholder = 'Skriv ordet när ni är redo';
      card.appendChild(inputEl);
      break;
  }

  msgEl = document.createElement('div');
  msgEl.className = 'error-msg';
  card.appendChild(msgEl);

  hintEl = document.createElement('div');
  hintEl.className = 'hint-msg';
  card.appendChild(hintEl);

  const btn = document.createElement('button');
  btn.textContent = 'Skicka';
  btn.onclick = () => checkAnswer(p, inputEl.value.trim().toLowerCase(), msgEl, hintEl);
  card.appendChild(btn);

  app.appendChild(card);
  if (inputEl) inputEl.focus();
}

// --- SVARKOLL ---
function checkAnswer(p, ans, msgEl, hintEl) {
  if (puzzleAudio) {
    try {
      puzzleAudio.pause();
      puzzleAudio.currentTime = 0;
    } catch (e) {
      console.warn("Kunde inte stoppa ljudet:", e);
    }
    puzzleAudio = null;
  }

  if (p.type === 'prime') {
    const m = Math.floor((Date.now() - startTime) / 60000);
    p.answer = isPrime(m) ? String(m) : null;
  }

  if (p.type === 'name') {
    if (validNames.includes(ans)) {
      aCorrect.currentTime = 0;
      aCorrect.play();
      renderPuzzle(current + 1);
    } else {
      aWrong.currentTime = 0;
      aWrong.play();
      msgEl.textContent = '❌ Fel – skriv ett korrekt namn.';
    }
    return;
  }

  if (ans === String(p.answer)) {
    if (current + 1 >= puzzles.length) {
      aFinish.currentTime = 0;
      aFinish.play();
      saveCompletionStats();
    } else {
      aCorrect.currentTime = 0;
      aCorrect.play();
    }
    renderPuzzle(current + 1);
  } else {
    aWrong.currentTime = 0;
    aWrong.play();
    msgEl.textContent = '❌ Fel – försök igen!';
    failCount++;
    if (failCount >= 2 && p.hint) {
      hintEl.textContent = `Tips: ${p.hint}`;
    }
  }
}


// --- FINISH ---
function finish() {
  localStorage.removeItem('varkamp_current');
  clearInterval(timerId);
  aFinish.currentTime = 0;
  aFinish.play();
  saveCompletionStats();

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h2>✅ Klart!</h2>
    <p class="prompt">Fyll i formuläret nedan och ta en skärmdump!</p>

    <label>Trädets namn (latin):</label>
    <input placeholder="Ex: Quercus robur">

    <label>Lagnamn:</label>
    <input placeholder="Ex: Tigerlaget">

    <label>Slutlösenord:</label>
    <input placeholder="Ex: KRAMP123">

    <label>Ladda upp bild:</label>
    <input type="file" accept="image/*">

    <p style="margin-top:1rem;">📸 <strong>Ta en skärmdump och visa för domaren!</strong></p>
  `;

  app.innerHTML = '';
  app.appendChild(card);
}

// --- Spara poäng ---
function saveCompletionStats() {
  const ms = Date.now() - startTime;
  const seconds = Math.floor(ms / 1000);
  localStorage.setItem('varkamp_score', seconds);
  localStorage.setItem('varkamp_finished', Date.now());
}

// --- PRIMTALSHJÄLP ---
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
