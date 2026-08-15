/* =======================================================================
   ОПРОСНИК «ПОДБОР ЛЮСТРЫ» — модалка из 3 вопросов + контакты
   Показывается автоматически при входе (раз в 7 дней), либо по клику
   на элемент с атрибутом [data-quiz-open]. Обязательное поле — только
   телефон, остальное опционально. Использует CONFIG/showStatus из app.js
   (тот же обычный <script>, общая глобальная область видимости).
   ======================================================================= */
(function(){
  const overlay = document.getElementById('quizOverlay');
  if(!overlay) return;

  const box      = overlay.querySelector('.quiz-box');
  const steps    = Array.from(overlay.querySelectorAll('.quiz-step'));
  const dots     = Array.from(document.querySelectorAll('#quizProgress i'));
  const closeBtn = document.getElementById('quizClose');
  const form     = document.getElementById('quizForm');
  const statusEl = document.getElementById('quizStatus');

  const answers = { purpose:'', material:'', size:'' };
  let current = 1;
  let lastFocus = null;

  function renderProgress(){
    dots.forEach((d,idx)=> d.classList.toggle('done', idx < current-1 || current===5));
  }

  function goTo(n){
    current = n;
    steps.forEach(s=> s.classList.toggle('active', Number(s.dataset.step)===n));
    renderProgress();
    if(box) box.scrollTop = 0;
  }

  function markSeen(){
    try{ localStorage.setItem('quizSeenAt', String(Date.now())); }catch(e){}
  }

  function open(){
    lastFocus = document.activeElement;
    goTo(1);
    overlay.hidden = false;
    requestAnimationFrame(()=>overlay.classList.add('on'));
    document.body.style.overflow = 'hidden';
  }
  function close(){
    overlay.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(()=>{ overlay.hidden = true; }, 400);
    if(lastFocus) lastFocus.focus();
    markSeen();
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown', e=>{
    if(overlay.hidden) return;
    if(e.key==='Escape') close();
  });

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

  /* ---- Назад / Пропустить ---- */
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

      if(fd.website){ goTo(5); markSeen(); return; } // honeypot — тихо "успех"

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
        goTo(5);
        markSeen();
      }catch(err){
        showStatus(statusEl,'err',
          'Не удалось отправить онлайн. Напишите нам в <a href="https://t.me/'+CONFIG.telegram+'" target="_blank">Telegram</a> или на <a href="mailto:'+CONFIG.email+'">'+CONFIG.email+'</a>.');
      }finally{
        btn.disabled = false; btn.innerHTML = orig;
      }
    });
  }

  /* ---- Автопоказ при входе на сайт (не чаще раза в 7 дней) ---- */
  function maybeAutoShow(){
    let seenAt = 0;
    try{ seenAt = Number(localStorage.getItem('quizSeenAt')) || 0; }catch(e){}
    const weekMs = 7*24*60*60*1000;
    if(Date.now() - seenAt < weekMs) return;
    setTimeout(open, 3500);
  }
  maybeAutoShow();

  /* ---- Ручной вызов, если понадобится кнопка-триггер ---- */
  window.openQuiz = open;
  document.querySelectorAll('[data-quiz-open]').forEach(el=>
    el.addEventListener('click', e=>{ e.preventDefault(); open(); })
  );
})();
