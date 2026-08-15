/* =====================================================================
   LUX — обработчик заявок (Vercel Serverless Function)
   ---------------------------------------------------------------------
   Что делает при отправке формы с сайта:
     1) присылает заявку ВАМ в Telegram (мгновенное уведомление);
     2) дублирует заявку ВАМ на e-mail;
     3) если клиент указал свой e-mail — автоматически отправляет ему
        письмо со ссылкой на PDF-каталог (и вложением, если включено).

   Не требует установки пакетов: используются Telegram Bot API и Resend
   через обычные HTTP-запросы (fetch). Все ключи задаются в переменных
   окружения на Vercel — см. файл .env.example и НАСТРОЙКА.md.
   ===================================================================== */

module.exports = async (req, res) => {
  // ---- CORS (на случай, если форма встроена на другой домен) ----
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ---- Чтение тела запроса ----
  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const clean = (s) => String(s ?? '').toString().trim().slice(0, 2000);
  const data = {
    type:     clean(body.type) || 'lead',
    name:     clean(body.name),
    phone:    clean(body.phone),
    email:    clean(body.email),
    object:   clean(body.object),
    message:  clean(body.message),
    page:     clean(body.page),
    // поля опросника «Подбор люстры»
    purpose:  clean(body.purpose),
    material: clean(body.material),
    size:     clean(body.size),
    company:  clean(body.company),
    position: clean(body.position),
    website:  clean(body.website), // honeypot (скрытое поле для ботов)
  };

  // ---- Анти-спам: honeypot ----
  if (data.website) return res.status(200).json({ ok: true }); // тихо игнорируем бота

  // ---- Минимальная валидация ----
  // В опроснике обязателен только телефон — имя не требуем.
  if (data.type === 'quiz') {
    if (!data.phone) return res.status(400).json({ ok: false, error: 'Не указан телефон' });
  } else {
    if (!data.name) return res.status(400).json({ ok: false, error: 'Не указано имя' });
    if (data.type === 'lead' && !data.phone) return res.status(400).json({ ok: false, error: 'Не указан телефон' });
    if (data.type === 'catalog' && !isEmail(data.email)) return res.status(400).json({ ok: false, error: 'Некорректный e-mail' });
  }

  // ---- Переменные окружения ----
  const {
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
    RESEND_API_KEY, MAIL_FROM, MAIL_TO,
    CATALOG_URL, CATALOG_ATTACH, BRAND_NAME,
  } = process.env;

  const brand = BRAND_NAME || 'LUX';
  const isLead = data.type === 'lead';
  const isQuiz = data.type === 'quiz';
  const title = isQuiz ? '🧩 Заявка из опросника «Подбор люстры»'
              : isLead ? '🛎 Новая заявка с сайта'
              : '📩 Запрос каталога';

  // Текст уведомления для владельца
  const lines = [
    `<b>${title}</b>`,
    `${brand}`,
    '—',
    data.name     ? `👤 <b>Имя:</b> ${esc(data.name)}` : '',
    data.position ? `💼 <b>Должность:</b> ${esc(data.position)}` : '',
    data.company  ? `🏢 <b>Компания:</b> ${esc(data.company)}` : '',
    data.phone    ? `📞 <b>Телефон:</b> ${esc(data.phone)}` : '',
    data.email    ? `✉️ <b>E-mail:</b> ${esc(data.email)}` : '',
    data.object   ? `🏛 <b>Объект:</b> ${esc(data.object)}` : '',
    data.purpose  ? `🏛 <b>Назначение:</b> ${esc(data.purpose)}` : '',
    data.material ? `💎 <b>Материал:</b> ${esc(data.material)}` : '',
    data.size     ? `📐 <b>Размер:</b> ${esc(data.size)}` : '',
    data.message  ? `📝 <b>Сообщение:</b> ${esc(data.message)}` : '',
    '—',
    `🌐 ${esc(data.page || '')}`,
    `🕒 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`,
  ].filter(Boolean);
  const ownerText = lines.join('\n');

  const results = { telegram: null, ownerMail: null, clientMail: null };

  // ---- 1. Telegram ----
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: ownerText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      results.telegram = r.ok ? 'ok' : 'fail:' + (await safeText(r));
    } catch (e) { results.telegram = 'error:' + e.message; }
  }

  // ---- 2. E-mail владельцу ----
  if (RESEND_API_KEY && MAIL_FROM && MAIL_TO) {
    try {
      const html = ownerText.replace(/\n/g, '<br>');
      const r = await resendSend(RESEND_API_KEY, {
        from: MAIL_FROM, to: MAIL_TO,
        subject: `${title} — ${data.name || data.phone || 'без имени'}`,
        html,
        reply_to: isEmail(data.email) ? data.email : undefined,
      });
      results.ownerMail = r.ok ? 'ok' : 'fail:' + (await safeText(r));
    } catch (e) { results.ownerMail = 'error:' + e.message; }
  }

  // ---- 3. Каталог клиенту на почту ----
  if (RESEND_API_KEY && MAIL_FROM && isEmail(data.email) && CATALOG_URL) {
    try {
      const attach = String(CATALOG_ATTACH).toLowerCase() === 'true'
        ? [{ path: CATALOG_URL, filename: `Katalog-${brand}.pdf` }]
        : undefined;
      const r = await resendSend(RESEND_API_KEY, {
        from: MAIL_FROM, to: data.email,
        subject: `Каталог ${brand} — большие люстры на заказ`,
        html: catalogEmailHtml(brand, data.name, CATALOG_URL),
        attachments: attach,
      });
      results.clientMail = r.ok ? 'ok' : 'fail:' + (await safeText(r));
    } catch (e) { results.clientMail = 'error:' + e.message; }
  }

  // ---- Итог: успех, если сработал хотя бы один канал ----
  const anyOk = Object.values(results).some((v) => v === 'ok');
  if (anyOk) return res.status(200).json({ ok: true, results });

  return res.status(500).json({
    ok: false,
    error: 'Не настроен ни один канал доставки (Telegram/почта). См. переменные окружения.',
    results,
  });
};

/* ---------------- Вспомогательные функции ---------------- */
function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
async function safeText(r) { try { return (await r.text()).slice(0, 200); } catch { return r.status; } }

async function resendSend(apiKey, payload) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function catalogEmailHtml(brand, name, url) {
  const hi = name ? `${esc(name)}, здравствуйте!` : 'Здравствуйте!';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#0b0b0d;padding:30px;text-align:center">
      <div style="color:#d8b878;font-size:26px;letter-spacing:4px;font-family:Georgia,serif">${esc(brand)}</div>
      <div style="color:#9c968a;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-top:4px">большие люстры</div>
    </div>
    <div style="padding:34px 30px;background:#faf8f3">
      <p style="font-size:16px">${hi}</p>
      <p style="font-size:15px;line-height:1.6;color:#444">
        Спасибо за интерес к нашим люстрам. Прикладываем каталог с моделями, размерами,
        материалами и примерами реализованных объектов — домов культуры, театров,
        консерваторий и торговых центров.
      </p>
      <p style="text-align:center;margin:30px 0">
        <a href="${esc(url)}" style="background:#d8b878;color:#11110d;text-decoration:none;
          padding:15px 36px;font-weight:bold;letter-spacing:1px;display:inline-block;border-radius:2px">
          СКАЧАТЬ КАТАЛОГ (PDF)</a>
      </p>
      <p style="font-size:15px;line-height:1.6;color:#444">
        Если нужна люстра под конкретный зал — ответьте на это письмо или напишите нам,
        и мы подготовим эскиз и расчёт стоимости. Производство собственное, под Одинцовом:
        работаем по всей России под ключ.
      </p>
      <p style="font-size:14px;color:#888;margin-top:28px">С уважением,<br>команда ${esc(brand)}</p>
    </div>
  </div>`;
}
