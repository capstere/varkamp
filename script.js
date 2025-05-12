(() => {
  'use strict';

  // --- KONFIGURATION av gåtorna ---
  const puzzles = [
    { prompt: '1: Vem i laget startar resan?',    type: 'name',  answer: '*',       hint: 'Skriv ett deltagarnamn från listan' },
    { prompt: '2: Bakom mörkret finner du svaret', type: 'stego', answer: '17',      img: 'assets/images/stego.png',            hint: 'Prova klicka på bilden.' },
    { prompt: '3: Vilken sång hör du?',           type: 'audio', answer: 'editpir', src: 'assets/audio/p3-chorus-rev.mp3', hint: 'Baklängesmusik, lyssna noga.' },
    { prompt: '4: Tajma svar med primtal',         type: 'prime', hint: 'Det är baserat på minuter som gått...' },
    { prompt: '5: Skanna QR-koden och följ instruktion', type: 'qr', answer: 'redo',
      data: 'Välj ett lämpligt träd. Ta en bild med hela laget + trädet. Skriv trädets namn på latin. Ange ert lagnamn. Skriv lösenordet. Ta en skärmdump och visa för domaren.',
      hint: 'När ni är redo, skriv "redo".'
    }
  ];

  const validNames = ['jana','jens','clare','johannes','jakob','nille','jonatan','jennifer','ville','simon','matias','liza','samer','christina','oscar','rebecca','philip','hampus','amelia','malin','joel'];

  // --- Enkla LocalStorage-wrappers ---
  const storage = {
    get(key)    { try { return localStorage.getItem(key); } catch { return null; } },
    set(key,val){ try { localStorage.setItem(key,val); } catch {} },
    del(key)    { try { localStorage.removeItem(key); } catch {} }
  };

  // --- Globala state ---
  let current   = 0,
      startTime = 0,
      timerId   = null,
      failCount = 0,
      puzzleAudio = null;

  const app     = document.getElementById('app');
  const timerEl = document.getElementById('timer');
  const progEl  = document.getElementById('progress');
  const sounds  = {
    correct: document.getElementById('audio-correct'),
    wrong:   document.getElementById('audio-wrong'),
    finish:  document.getElementById('audio-finish')
  };

  // --- Hjälpfunktioner ---
  function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }
  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }
  function play(type) {
    const a = sounds[type];
    if (a) { a.currentTime = 0; a.play().catch(()=>{}); }
    if (type === 'correct') vibrate(200);
    if (type === 'wrong')   vibrate([100,50,100]);
  }
  function showError(el,msg){ el.textContent = msg; }
  function clearAnim(el)  { el.classList.remove('correct','shake'); }

  // --- Timer-uppdatering ---
  function updateTimer() {
    const diff = Date.now() - startTime;
    const m = String(Math.floor(diff/60000)).padStart(2,'0');
    const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    timerEl.textContent = `${m}:${s}`;
  }

  // --- Init ---
  function init() {
    // Preload ljud + bild
    Object.values(sounds).forEach(a => a.load());
    new Image().src = puzzles.find(p=>p.type==='stego').img;

    if (storage.get('varkamp_current')) {
      resumeGame();
    } else {
      showIntro();
    }
  }

  // --- Återuppta ---
  function resumeGame() {
    const savedT = parseInt(storage.get('varkamp_timer'),10);
    startTime = savedT > 0 ? savedT : Date.now();
    storage.set('varkamp_timer', startTime);

    const idx = parseInt(storage.get('varkamp_current'),10);
    current = (idx>=0 && idx < puzzles.length) ? idx : 0;

    timerId = setInterval(updateTimer, 500);
    renderPuzzle(current);
  }

  // --- Introduktion ---
  function showIntro() {
    storage.del('varkamp_current');
    storage.del('varkamp_timer');
    clearInterval(timerId);
    app.innerHTML = `
      <div class="card">
        <p class="prompt">Välkommen till VÅRKAMP<sup>5</sup>!</p>
        <button id="startBtn">Starta tävlingen</button>
      </div>`;
    document.getElementById('startBtn').addEventListener('click', resumeGame);
  }

  // --- Rendera en gåta ---
  function renderPuzzle(i) {
    storage.set('varkamp_current', i);
    current = i;
    failCount = 0;
    app.innerHTML = '';

    const p = puzzles[i];
    if (!p) return finishGame();

    // Visa progress
    progEl.textContent = `Gåta ${i+1} av ${puzzles.length}`;
    if (!timerId) timerId = setInterval(updateTimer, 500);

    // Stoppa ev ljud
    if (puzzleAudio) { puzzleAudio.pause(); puzzleAudio=null; }

    const card = document.createElement('div');
    card.className = 'card';

    const prm = document.createElement('div');
    prm.className = 'prompt';
    prm.textContent = p.prompt;
    card.appendChild(prm);

    let inputEl, msgEl, hintEl;

    switch (p.type) {
      case 'name':
      case 'prime':
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
        img.addEventListener('click',()=> img.style.filter='');
        card.appendChild(img);

        inputEl = document.createElement('input');
        inputEl.placeholder = 'Tal (siffror)';
        card.appendChild(inputEl);
        break;

      case 'audio':
        puzzleAudio = new Audio(p.src);
        puzzleAudio.preload = 'auto';
        const btn = document.createElement('button');
        btn.textContent = 'Spela baklänges';
        btn.addEventListener('click', ()=>{
          puzzleAudio.currentTime = 0;
          puzzleAudio.play().catch(()=>{});
          btn.textContent = '...spelar';
        });
        card.appendChild(btn);

        inputEl = document.createElement('input');
        inputEl.placeholder = 'Svara här';
        card.appendChild(inputEl);
        break;

      case 'qr':
        const qdiv = document.createElement('div');
        qdiv.id = 'qrcode';
        card.appendChild(qdiv);

        const size = Math.min(window.innerWidth * 0.9, 300);
        try {
          new QRCode(qdiv, { text: p.data, width: size, height: size });
        } catch (e) {
          console.error('QRCode-fel', e);
          const err = document.createElement('div');
          err.className = 'error-msg';
          err.textContent = '⚠️ Kunde inte visa QR-kod, använd extern skanner.';
          card.appendChild(err);
        }

        inputEl = document.createElement('input');
        inputEl.placeholder = 'Skriv ordet när ni är redo';
        card.appendChild(inputEl);
        break;
    }

    // Fel- och hint-element
    msgEl  = document.createElement('div'); msgEl.className = 'error-msg';
    hintEl = document.createElement('div'); hintEl.className = 'hint-msg';
    card.appendChild(msgEl);
    card.appendChild(hintEl);

    // Skicka-knapp
    const send = document.createElement('button');
    send.textContent = 'Skicka';
    send.setAttribute('aria-label', `Skicka svar på gåta ${i+1}`);
    send.addEventListener('click', ()=> checkAnswer(p, inputEl.value.trim().toLowerCase(), msgEl, hintEl, card, inputEl));
    card.appendChild(send);

    app.appendChild(card);
    inputEl?.focus();
  }

  // --- Kontrollera svar ---
  function checkAnswer(p, ans, msgEl, hintEl, card, inputEl) {
    if (puzzleAudio) { puzzleAudio.pause(); puzzleAudio=null; }
    clearAnim(card);

    // Prime-gåtan: svar är minutantalet
    if (p.type === 'prime') {
      const mins = Math.floor((Date.now() - startTime)/60000);
      if (!isPrime(mins)) {
        showError(msgEl, '⏳ Vänta till primtal-minut!');
        return;
      }
      p.answer = String(mins);
    }

    // Namn-gåtan
    let correct = (ans === String(p.answer));
    if (p.type === 'name') correct = validNames.includes(ans);

    if (correct) {
      play((p.type==='name'|| current+1<puzzles.length) ? 'correct' : 'finish');
      card.classList.add('correct');
      inputEl?.removeAttribute('aria-invalid');
      setTimeout(()=> renderPuzzle(current+1), 500);
    } else {
      play('wrong');
      card.classList.add('shake');
      showError(msgEl, '❌ Fel – försök igen!');
      inputEl?.setAttribute('aria-invalid','true');
      failCount++;
      if (failCount >= 2 && p.hint) hintEl.textContent = `Tips: ${p.hint}`;
    }
  }

  // --- Avsluta spel ---
  function finishGame() {
    clearInterval(timerId);
    play('finish');
    storage.del('varkamp_current');

    const secs = Math.floor((Date.now() - startTime)/1000);
    storage.set('varkamp_score', secs);
    storage.set('varkamp_finished', Date.now());

    app.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h2>✅ Klart!</h2>
      <p class="prompt">Fyll i formuläret och ta en skärmdump:</p>
      <label>Trädets namn (latin):</label><input placeholder="Ex: Quercus robur">
      <label>Lagnamn:</label><input placeholder="Ex: Tigerlaget">
      <label>Slutlösenord:</label><input placeholder="Ex: KRAMP123">
      <label>Tid:</label><input readonly value="${secs} sekunder">
      <label>Ladda upp bild:</label><input type="file" accept="image/*">
      <p style="margin-top:1rem;">📸 <strong>Ta en skärmdump och visa för domaren!</strong></p>
    `;
    app.appendChild(card);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
