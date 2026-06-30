/* =======================================================================
   НАСТРОЙКИ — отредактируйте эти строки (контакты подставятся по всему сайту)
   ======================================================================= */
const CONFIG = {
  brand:      "LUMERA",
  phone:      "+7 962 882-74-54",       // как показывать
  phoneRaw:   "+79628827454",           // для ссылки tel: (только цифры и +)
  email:      "9280365@mail.ru",        // ваша почта для связи
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
