/* =======================================================================
   НАСТРОЙКИ — отредактируйте эти строки (контакты подставятся по всему сайту)
   ======================================================================= */
const CONFIG = {
  brand:      "LUMERA",
  phone:      "+7 (000) 000-00-00",     // как показывать
  phoneRaw:   "+70000000000",           // для ссылки tel: (только цифры и +)
  email:      "info@lumera.ru",         // ваша почта для связи
  telegram:   "lumera",                 // username БЕЗ @ (ссылка t.me/lumera)
  address:    "Московская область, Одинцовский район",
  // Адрес бэкенда. После деплоя на Vercel оставьте "/api/lead".
  endpoint:   "/api/lead"
};

/* ---- Подстановка контактов из CONFIG ---- */
(function fillConfig(){
  document.querySelectorAll('[data-tel]').forEach(el=>el.textContent=CONFIG.phone);
  document.querySelectorAll('[data-tel-href]').forEach(el=>el.href='tel:'+CONFIG.phoneRaw);
  document.querySelectorAll('[data-mail]').forEach(el=>el.textContent=CONFIG.email);
  document.querySelectorAll('[data-mail-href]').forEach(el=>el.href='mailto:'+CONFIG.email);
  document.querySelectorAll('[data-tg-href]').forEach(el=>el.href='https://t.me/'+CONFIG.telegram);
  document.querySelectorAll('[data-tg-text]').forEach(el=>el.textContent='@'+CONFIG.telegram);
  document.querySelectorAll('[data-address]').forEach(el=>el.textContent=CONFIG.address);
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();

/* ---- Шапка при скролле ---- */
const header=document.getElementById('header');
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>40));

/* ---- Мобильное меню ---- */
const burger=document.getElementById('burger'), menu=document.getElementById('menu');
burger.addEventListener('click',()=>menu.classList.toggle('open'));
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.classList.remove('open')));

/* ---- Появление секций ---- */
const io=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ---- Отправка форм ---- */
async function sendForm(form, statusEl, type, successText){
  const data=Object.fromEntries(new FormData(form).entries());
  data.type=type;
  data.page=location.href;
  if(!data.name || (type==='lead' && !data.phone) || (type==='catalog' && !data.email)){
    showStatus(statusEl,'err','Заполните, пожалуйста, обязательные поля.');return;
  }
  const btn=form.querySelector('button[type=submit]'); const orig=btn.innerHTML;
  btn.disabled=true; btn.innerHTML='<span>Отправляем…</span>';
  try{
    const res=await fetch(CONFIG.endpoint,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
    });
    if(!res.ok) throw new Error('bad status');
    showStatus(statusEl,'ok',successText);
    form.reset();
    const c=form.querySelector('[name=consent]'); if(c) c.checked=true;
  }catch(err){
    showStatus(statusEl,'err',
      'Не удалось отправить онлайн. Напишите нам в <a href="https://t.me/'+CONFIG.telegram+'" target="_blank">Telegram</a> или на <a href="mailto:'+CONFIG.email+'">'+CONFIG.email+'</a>.');
  }finally{
    btn.disabled=false; btn.innerHTML=orig;
  }
}
function showStatus(el,type,msg){el.className='form-status '+type;el.innerHTML=msg;}

document.getElementById('leadForm').addEventListener('submit',e=>{
  e.preventDefault();
  sendForm(e.target,document.getElementById('leadStatus'),'lead',
    'Спасибо! Заявка отправлена — мы свяжемся с вами в течение дня. Каталог придёт на почту, если вы указали e-mail.');
});
document.getElementById('catalogForm').addEventListener('submit',e=>{
  e.preventDefault();
  sendForm(e.target,document.getElementById('catalogStatus'),'catalog',
    'Готово! Каталог отправлен на вашу почту. Проверьте папку «Входящие» (и «Спам»).');
});

/* ---- Лайтбокс для портфолио и материалов ---- */
(function lightbox(){
  const box   = document.getElementById('lightbox');
  if(!box) return;
  const img   = document.getElementById('lbImg');
  const tEl   = document.getElementById('lbTitle');
  const sEl   = document.getElementById('lbSpec');
  const items = Array.from(document.querySelectorAll('[data-lb]'));
  if(!items.length) return;
  let i = 0, lastFocus = null;

  function show(n){
    i = (n + items.length) % items.length;
    const el = items[i];
    img.src = el.dataset.lb;
    img.alt = el.querySelector('img') ? el.querySelector('img').alt : '';
    tEl.textContent = el.dataset.lbTitle || '';
    sEl.textContent = el.dataset.lbSpec  || '';
  }
  function open(n){
    lastFocus = document.activeElement;
    show(n);
    box.hidden = false;
    requestAnimationFrame(()=>box.classList.add('on'));
    document.body.style.overflow = 'hidden';
    document.getElementById('lbClose').focus();
  }
  function close(){
    box.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(()=>{ box.hidden = true; img.src=''; }, 350);
    if(lastFocus) lastFocus.focus();
  }

  items.forEach((el,n)=>{
    el.setAttribute('tabindex','0');
    el.setAttribute('role','button');
    el.addEventListener('click',()=>open(n));
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(n); }
    });
  });

  document.getElementById('lbClose').addEventListener('click',close);
  document.getElementById('lbPrev').addEventListener('click',()=>show(i-1));
  document.getElementById('lbNext').addEventListener('click',()=>show(i+1));
  box.addEventListener('click',e=>{ if(e.target===box) close(); });
  document.addEventListener('keydown',e=>{
    if(box.hidden) return;
    if(e.key==='Escape')     close();
    if(e.key==='ArrowLeft')  show(i-1);
    if(e.key==='ArrowRight') show(i+1);
  });

  /* свайп на мобильных */
  let x0=null;
  box.addEventListener('touchstart',e=>{ x0=e.changedTouches[0].clientX; },{passive:true});
  box.addEventListener('touchend',e=>{
    if(x0===null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx)>50) show(dx>0 ? i-1 : i+1);
    x0=null;
  },{passive:true});
})();
