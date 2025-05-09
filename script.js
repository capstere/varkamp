// --- KONFIGURATION av gåtorna ---
const puzzles = [
  { prompt: '1: Vigenère – avkryptera “ujvjs kfcej” med nyckeln PENTA', type: 'text', answer: 'kamp', hint: 'Det är ett slags chiffer. Nyckeln är viktig.' },
  { prompt: '2: Bakom mörkret finner du svaret', type: 'stego', answer: '17', img: 'assets/images/stego.png', hint: 'Prova klicka på bilden.' },
  { prompt: '3: Vilken sång hör du?', type: 'audio', answer: 'editpir', src: 'assets/audio/p3-chorus-rev.mp3', hint: 'Baklängesmusik, lyssna noga.' },
  { prompt: '4: Tajma svar med primtal', type: 'prime', answer: null, hint: 'Det är baserat på minuter som gått...' },
  { prompt: '5: Skanna QR‑koden för svaret', type: 'qr', answer: 'kramp', data: 'kramp', hint: 'QR-koden innehåller ordet!' }
];

// --- GLOBALA VARIABLER ---
let current = 0, startTime = 0, timerId = 0;
const app = document.getElementById('app');
const timer = document.getElementById('timer');
const aCorrect = document.getElementById('audio-correct');
const aWrong   = document.getElementById('audio-wrong');
const aFinish  = document.getElementById('audio-finish');
let failCount = 0;
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let lastBuffer = null;

// --- PRELOAD ---
window.onload = () => {
  ['correct', 'wrong', 'finish'].forEach(id => {
    const a = document.getElementById('audio-' + id);
    a.load();
  });
  const img = new Image();
  img.src = puzzles.find(p => p.type === 'stego').img;
  renderIntro();
};

// --- RENDER INTRO ---
function renderIntro() {
  clearInterval(timerId);
  app.innerHTML = `
    <div class="card">
      <p class="prompt">Välkommen till VÅRKAMP<sup>5</sup>!</p>
      <button id="start" type="button">Starta tävlingen</button>
    </div>`;
  document.getElementById('start').onclick = () => {
    startTime = Date.now();
    timerId = setInterval(updateTimer, 500);
    renderPuzzle(0);
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
  current = i;
  failCount = 0;
  app.innerHTML = '';

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
    case 'text':
      inputEl = document.createElement('input');
      inputEl.type = 'text';
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
      let buffer = null;
      fetch(p.src)
        .then(r => r.arrayBuffer())
        .then(buf => audioDecodeReverse(buf))
        .then(decoded => buffer = decoded)
        .catch(e => console.error('Ljudfel:', e));

      const rbtn = document.createElement('button');
      rbtn.type = 'button';
      rbtn.textContent = 'Spela upp baklänges';
      rbtn.onclick = () => {
        if (!buffer) {
          console.warn("Ljudet är inte redo ännu.");
          return;
        }
        playBuffer(buffer);
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
      inputEl.placeholder = 'Skriv ordet';
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
  btn.type = 'button';
  btn.textContent = 'Skicka';
  btn.onclick = () => checkAnswer(p, inputEl.value.trim().toLowerCase(), msgEl, hintEl);
  card.appendChild(btn);

  app.appendChild(card);
}

// --- AUDIO ---
function audioDecodeReverse(buf) {
  return audioCtx.decodeAudioData(buf).then(decoded => {
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      Array.prototype.reverse.call(decoded.getChannelData(c));
    }
    lastBuffer = decoded;
    return decoded;
  });
}

function playBuffer(buffer) {
  if (!buffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start();
}


// --- KONTROLLERA SVAR ---
function checkAnswer(p, ans, msgEl, hintEl) {
  if (p.type === 'prime') {
    const m = Math.floor((Date.now() - startTime) / 60000);
    p.answer = isPrime(m) ? String(m) : null;
  }

  if (ans === String(p.answer)) {
    if (current + 1 >= puzzles.length) {
      aFinish.currentTime = 0;
      aFinish.play().catch(err => console.warn("Finish-ljud blockerat:", err));
    } else {
      aCorrect.currentTime = 0;
      aCorrect.play();
    }
    renderPuzzle(current + 1);
  } else {
    aWrong.currentTime = 0;
    aWrong.play();
    msgEl.textContent = 'Fel – försök igen!';
    failCount++;
    if (failCount >= 2 && p.hint) {
      hintEl.textContent = `Tips: ${p.hint}`;
    }
  }
}


// --- FINISH ---
function finish() {
  clearInterval(timerId);
  aFinish.currentTime = 0;
  aFinish.play();

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h2>🎉 Grattis! 🎉</h2>
    <p class="prompt">Slutlösenordet är: <strong>KRAMP123</strong></p>`;

  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Dela framgång!';
  shareBtn.onclick = () => {
    if (navigator.share) {
      navigator.share({
        title: 'VÅRKAMP⁵',
        text: 'Jag klarade VÅRKAMP⁵! Slutlösenordet är KRAMP123.',
        url: location.href
      }).catch(err => console.warn('Delning avbröts', err));
    } else {
      alert('Web Share API stöds inte i din webbläsare.');
    }
  };
  card.appendChild(shareBtn);

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Starta om';
  restartBtn.onclick = () => renderIntro();
  card.appendChild(restartBtn);

  app.innerHTML = '';
  app.appendChild(card);
}

// --- PRIMTAL ---
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}
