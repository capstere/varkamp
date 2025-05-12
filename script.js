// script.js
(() => {
  'use strict';

  // --- KONFIGURATION av gåtorna ---
  const puzzles = [
    { prompt: '1: Vem i laget startar resan?',    type: 'name',  answer: '*',      hint: 'Skriv ett deltagarnamn från listan' },
    { prompt: '2: Bakom mörkret finner du svaret', type: 'stego', answer: '17',     img: 'assets/images/stego.png', hint: 'Prova klicka på bilden.' },
    { prompt: '3: Vilken sång hör du?',           type: 'audio', answer: 'editpir', src: 'assets/audio/p3-chorus-rev.mp3', hint: 'Baklängesmusik, lyssna noga.' },
    { prompt: '4: Tajma svar med primtal',         type: 'prime', hint: 'Det är baserat på minuter som gått...' },
    { prompt: '5: Dokumentera trädet',             type: 'final' }
  ];

  const validNames = [
    'jana','jens','clare','johannes','jakob','nille','jonatan','jennifer',
    'ville','simon','matias','liza','samer','christina','oscar','rebecca',
    'philip','hampus','amelia','malin','joel'
  ];

  // --- LocalStorage-wrappers ---
  const storage = {
    get(k){ try{return localStorage.getItem(k);}catch{return null;} },
    set(k,v){ try{localStorage.setItem(k,v);}catch{} },
    del(k){ try{localStorage.removeItem(k);}catch{} }
  };

  // --- Global state ---
  let current     = 0,
      startTime   = 0,
      timerId     = null,
      failCount   = 0,
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
  function vibrate(p)        { navigator.vibrate?.(p); }
  function play(type) {
    const a = sounds[type];
    if (a) { a.currentTime = 0; a.play().catch(()=>{}); }
    if (type==='correct') vibrate(200);
    if (type==='wrong')   vibrate([100,50,100]);
  }
  function showError(el,msg){ el.textContent = msg; }
  function clearAnim(el)    { el.classList.remove('correct','shake'); }

  // --- Timer-uppdatering ---
  function updateTimer() {
    const d = Date.now() - startTime;
    const mm = String(Math.floor(d/60000)).padStart(2,'0');
    const ss = String(Math.floor((d%60000)/1000)).padStart(2,'0');
    timerEl.textContent = `${mm}:${ss}`;
  }

  // --- Init ---
  function init() {
    Object.values(sounds).forEach(a=>a.load());
    new Image().src = puzzles.find(p=>p.type==='stego').img;
    if (storage.get('varkamp_current')) resumeGame();
    else showIntro();
  }

  // --- Resume ---
  function resumeGame() {
    const saved = parseInt(storage.get('varkamp_timer'),10);
    startTime = saved>0? saved: Date.now();
    storage.set('varkamp_timer', startTime);
    const idx = parseInt(storage.get('varkamp_current'),10);
    current = (idx>=0 && idx<puzzles.length)? idx:0;
    timerId = setInterval(updateTimer,500);
    renderPuzzle(current);
  }

  // --- Intro ---
  function showIntro() {
    storage.del('varkamp_current');
    storage.del('varkamp_timer');
    clearInterval(timerId);
    app.innerHTML = `
      <div class="card">
        <p class="prompt">Välkommen till VÅRKAMP<sup>5</sup>!</p>
        <button id="startBtn">Starta tävlingen</button>
      </div>`;
    document.getElementById('startBtn').onclick = resumeGame;
  }

  // --- Rendera puzzle ---
  function renderPuzzle(i) {
    storage.set('varkamp_current', i);
    current = i; failCount = 0;
    app.innerHTML = '';
    progEl.textContent = `Gåta ${i+1} av ${puzzles.length}`;
    if (!timerId) timerId = setInterval(updateTimer,500);
    if (puzzleAudio) { puzzleAudio.pause(); puzzleAudio=null; }

    const p = puzzles[i];
    if (!p) return;

    if (p.type==='final') { renderFinal(); return; }

    // --- Gåtor 1–4 ---
    const card = document.createElement('div'); card.className='card';
    const prm  = document.createElement('div'); prm.className='prompt'; prm.textContent=p.prompt;
    card.append(prm);

    let inputEl, msgEl, hintEl;
    switch(p.type){
      case 'name':
      case 'prime':
        inputEl = document.createElement('input');
        inputEl.placeholder='Skriv svar';
        card.append(inputEl);
        break;
      case 'stego':
        const img = document.createElement('img');
        img.src=p.img; img.alt='Stegobild'; img.style.filter='brightness(0)';
        img.onclick=()=>img.style.filter='';
        card.append(img);
        inputEl = document.createElement('input');
        inputEl.placeholder='Tal (siffror)';
        card.append(inputEl);
        break;
      case 'audio':
        puzzleAudio=new Audio(p.src); puzzleAudio.preload='auto';
        const btn=document.createElement('button');
        btn.textContent='Spela baklänges';
        btn.onclick=()=>{
          puzzleAudio.currentTime=0; puzzleAudio.play().catch(()=>{});
          btn.textContent='...spelar';
        };
        card.append(btn);
        inputEl = document.createElement('input');
        inputEl.placeholder='Svara här';
        card.append(inputEl);
        break;
    }

    msgEl=document.createElement('div'); msgEl.className='error-msg';
    hintEl=document.createElement('div'); hintEl.className='hint-msg';
    card.append(msgEl, hintEl);

    const send=document.createElement('button');
    send.textContent='Skicka';
    send.setAttribute('aria-label',`Skicka svar gåta ${i+1}`);
    send.onclick=()=>checkAnswer(p,inputEl.value.trim().toLowerCase(),msgEl,hintEl,card,inputEl);
    card.append(send);

    app.append(card);
    inputEl?.focus();
  }

  // --- Check goes ---
  function checkAnswer(p,ans,msgEl,hintEl,card,inputEl){
    if(puzzleAudio){ puzzleAudio.pause(); puzzleAudio=null; }
    clearAnim(card);
    if(p.type==='prime'){
      const mins = Math.floor((Date.now()-startTime)/60000);
      if(!isPrime(mins)){ showError(msgEl,'⏳ Vänta till primtal-minut!'); return; }
      p.answer=String(mins);
    }
    let ok = ans===String(p.answer);
    if(p.type==='name') ok = validNames.includes(ans);
    if(ok){
      play((p.type==='name'||current+1<puzzles.length)?'correct':'finish');
      card.classList.add('correct');
      inputEl?.removeAttribute('aria-invalid');
      setTimeout(()=>renderPuzzle(current+1),500);
    } else {
      play('wrong');
      card.classList.add('shake');
      showError(msgEl,'❌ Fel – försök igen!');
      inputEl?.setAttribute('aria-invalid','true');
      failCount++;
      if(failCount>=2 && p.hint) hintEl.textContent=`Tips: ${p.hint}`;
    }
  }

  // --- Final render ---
  function renderFinal(){
    app.innerHTML = `
      <div class="card" id="final-form">
        <fieldset>
          <legend>Dokumentera trädet</legend>
          <label>1. Ta en gruppbild med trädet</label>
          <input type="file" id="photo" accept="image/*">
          <img id="preview" alt="Förhandsgranskning" style="display:none;">
          <label>2. Trädets latinska namn</label>
          <input type="text" id="latin" placeholder="Ex: Quercus robur">
          <label>3. Ditt lagnamn</label>
          <input type="text" id="team" placeholder="Ex: Tigerlaget">
          <button id="submit" disabled>Skicka</button>
        </fieldset>
      </div>
      <div class="card summary" id="summary">
        <h2>Sammanfattning</h2>
        <div class="field"><strong>Latinskt namn:</strong> <span id="out-latin"></span></div>
        <div class="field"><strong>Lagnamn:</strong> <span id="out-team"></span></div>
        <div class="field"><strong>Tid:</strong> <span id="out-time"></span></div>
        <div class="field"><strong>Bild:</strong><br><img id="out-image" alt="Gruppbild"></div>
        <p style="margin-top:1rem;">📸 Ta en skärmdump av denna vy och skicka till domare</p>
        <a id="sms-link" class="sms-btn">Öppna SMS</a>
      </div>`;

    const photo   = document.getElementById('photo');
    const latinI  = document.getElementById('latin');
    const teamI   = document.getElementById('team');
    const submit  = document.getElementById('submit');
    const preview = document.getElementById('preview');
    const summary = document.getElementById('summary');
    const outLat  = document.getElementById('out-latin');
    const outTeam = document.getElementById('out-team');
    const outTime = document.getElementById('out-time');
    const outImg  = document.getElementById('out-image');
    const smsLink = document.getElementById('sms-link');

    function validate() {
      submit.disabled = !(photo.files.length===1 
        && latinI.value.trim()!=='' 
        && teamI.value.trim()!=='');
    }
    [photo, latinI, teamI].forEach(el => el.addEventListener('input', validate));

    photo.addEventListener('change', () => {
      validate();
      const f = photo.files[0];
      if(!f) return;
      if(f.size>5*1024*1024){
        alert('Max 5 MB.');
        photo.value=''; preview.style.display='none'; validate();
        return;
      }
      const r=new FileReader();
      r.onload=e=>{
        preview.src=e.target.result;
        preview.style.display='block';
      };
      r.readAsDataURL(f);
    });

    submit.addEventListener('click', ()=>{
      clearInterval(timerId);
      const d=Date.now()-startTime;
      const mm=String(Math.floor(d/60000)).padStart(2,'0');
      const ss=String(Math.floor((d%60000)/1000)).padStart(2,'0');
      outTime.textContent=`${mm}:${ss}`;
      outLat.textContent  = latinI.value.trim();
      outTeam.textContent = teamI.value.trim();

      const reader=new FileReader();
      reader.onload=e=>{
        const dataURL=e.target.result;
        preview.src=dataURL;
        outImg.src=dataURL;

        const msg = `Hej! Träd: ${outLat.textContent}\r\nTid: ${outTime.textContent}\r\nLag: ${outTeam.textContent}`;
        smsLink.href = `sms:+46730736978?body=${encodeURIComponent(msg)}`;
      };
      reader.readAsDataURL(photo.files[0]);

      document.getElementById('final-form').style.display='none';
      summary.classList.add('visible');
      play('finish');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();