/* =======================================================================
   ОПРОСНИК «ПОДБОР ЛЮСТРЫ» — ОБЯЗАТЕЛЬНЫЙ гейт перед сайтом.
   Показывается при каждом входе, пока не пройден (пока не отправлена
   форма хотя бы с телефоном). Закрыть или пропустить его нельзя: нет
   крестика, клик по фону не закрывает, Esc не закрывает. Единственный
   способ убрать окно — нажать «Перейти на сайт» на шаге благодарности,
   который появляется только после успешной отправки формы.
   Обязательное поле в форме — только телефон, остальное опционально.
   Использует CONFIG/showStatus из app.js (тот же обычный <script>,
   общая глобальная область видимости).
   ======================================================================= */
(function(){
  const overlay = document.getElementById('quizOverlay');
  if(!overlay) return;

  const box         = overlay.querySelector('.quiz-box');
  const steps       = Array.from(overlay.querySelectorAll('.quiz-step'));
  const dots        = Array.from(document.querySelectorAll('#quizProgress i'));
  const form        = document.getElementById('quizForm');
  const statusEl    = document.getElementById('quizStatus');
  const continueBtn = document.getElementById('quizContinue');

  const answers = { purpose:'', material:'', size:'' };
  let current = 1;

  function renderProgress(){
    dots.forEach((d,idx)=> d.classList.toggle('done', idx < current-1 || current===5));
  }

  function goTo(n){
    current = n;
    steps.forEach(s=> s.classList.toggle('active', Number(s.dataset.step)===n));
    renderProgress();
    if(box) box.scrollTop = 0;
  }

  function markCompleted(){
    try{ localStorage.setItem('quizCompletedAt', String(Date.now())); }catch(e){}
  }
  function isCompleted(){
    try{ return !!localStorage.getItem('quizCompletedAt'); }catch(e){ return false; }
  }

  function open(){
    goTo(1);
    overlay.hidden = false;
    requestAnimationFrame(()=>overlay.classList.add('on'));
    document.body.style.overflow = 'hidden';
  }

  // Закрыть окно можно только отсюда — вызывается ТОЛЬКО кнопкой
  // «Перейти на сайт» после успешной отправки формы (и тихим honeypot-успехом).
  function closeOverlay(){
    overlay.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(()=>{ overlay.hidden = true; }, 400);
  }

  if(continueBtn) continueBtn.addEventListener('click', closeOverlay);

  /* ---- Вопросы с вариантами ответа ---- */
  overlay.querySelectorAll('.quiz-options').forEach(group=>{
    const key = group.dataset.q;
    group.querySelectorAll('.quiz-opt').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        group.querySelectorAll('.quiz-opt').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        if(key) answers[key] = btn.dataset.v || '';
        setTimeout(()=> goTo(current+1), 260);
      });
    });
  });

  /* ---- Назад / Пропустить конкретный вопрос ----
     Сам гейт всё равно обязателен: пропустить можно вопрос анкеты,
     но не форму с телефоном на шаге 4 — без неё окно не закрыть. */
  overlay.querySelectorAll('[data-back]').forEach(b=>
    b.addEventListener('click', ()=> goTo(Math.max(1, current-1)))
  );
  overlay.querySelectorAll('[data-skip]').forEach(b=>
    b.addEventListener('click', ()=>{
      if(current===1){ goTo(4); } else { goTo(current+1); }
    })
  );

  /* ---- Отправка контактных данных (обязателен только телефон) ---- */
  if(form){
    form.addEventListener('submit', async e=>{
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());

      if(fd.website){ markCompleted(); closeOverlay(); return; } // honeypot — тихо считаем успехом

      const phone = String(fd.phone || '').trim();
      if(phone.replace(/\D/g,'').length < 5){
        showStatus(statusEl,'err','Укажите, пожалуйста, номер телефона.');
        return;
      }

      const payload = {
        type:     'quiz',
        phone:    phone,
        name:     fd.name || '',
        email:    fd.email || '',
        company:  fd.company || '',
        position: fd.position || '',
        purpose:  answers.purpose,
        material: answers.material,
        size:     answers.size,
        page:     location.href,
        website:  fd.website || '',
      };

      const btn = form.querySelector('button[type=submit]');
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<span>Отправляем…</span>';
      try{
        const res = await fetch(CONFIG.endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload),
        });
        if(!res.ok) throw new Error('bad status');
        markCompleted();
        goTo(5);
      }catch(err){
        showStatus(statusEl,'err',
          'Не удалось отправить онлайн. Напишите нам в <a href="https://t.me/'+CONFIG.telegram+'" target="_blank">Telegram</a> или на <a href="mailto:'+CONFIG.email+'">'+CONFIG.email+'</a>.');
      }finally{
        btn.disabled = false; btn.innerHTML = orig;
      }
    });
  }

  /* ---- Обязательный показ при входе: пока опросник не пройден
     (форма не отправлена хотя бы раз), окно открыто на каждом заходе. ---- */
  if(!isCompleted()){
    open();
  }

  /* ---- Ручной вызов для отладки ---- */
  window.openQuiz = open;
})();
