# -*- coding: utf-8 -*-
"""
Генератор PDF-каталога LUX (премиальный тёмный дизайн).
Запуск:  python3 tools/catalog_generator.py
Результат: catalog.pdf в корне проекта.

Контакты и список моделей вынесены в начало файла — отредактируйте под себя
и запустите скрипт заново (или попросите меня перегенерировать).
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ----------------------- ДАННЫЕ (редактируйте) -----------------------
BRAND   = "LUX"
TAGLINE = "большие люстры"
PHONE   = "+7 962 882-74-54"
EMAIL   = "info@luuxx.ru"
TG      = "@luuxx"
ADDRESS = "Московская область, Одинцовский район"
SITE    = "luuxx.ru"

MODELS = [
    ("«Ассамблея»", ["Ø 4,2 м · 36 ламп", "Латунь, хрусталь", "Зрительный зал ДК"]),
    ("«Каскад»",    ["Высота 9 м", "Нержавеющая сталь", "Атриум ТЦ"]),
    ("«Аллегро»",   ["Ø 3,5 м · опускание", "Золочёная бронза", "Концертный зал"]),
    ("«Партер»",    ["Комплект из 5 шт.", "Ковка, золочение", "Фойе театра"]),
    ("«Соборная»",  ["Ø 5 м · паникадило", "Латунь, эмаль", "Храм / собор"]),
    ("«Резиденс»",  ["Ø 2,8 м", "Нерж. сталь, хрусталь", "Лобби отеля 5★"]),
]
OUT = os.path.join(os.path.dirname(__file__), "..", "catalog.pdf")

# ----------------------- ЦВЕТА -----------------------
def rgb(r, g, b): return (r/255, g/255, b/255)
BG    = rgb(11, 11, 13)
BG2   = rgb(16, 16, 20)
CARD  = rgb(20, 20, 24)
GOLD  = rgb(216, 184, 120)
WARM  = rgb(255, 233, 191)
TEXT  = rgb(243, 239, 230)
MUTED = rgb(156, 150, 138)
MUT2  = rgb(120, 114, 104)
LINE  = rgb(58, 54, 46)

# ----------------------- ШРИФТЫ -----------------------
FD = "/usr/share/fonts/truetype/dejavu"
def reg(name, fname):
    p = os.path.join(FD, fname)
    if os.path.exists(p):
        pdfmetrics.registerFont(TTFont(name, p)); return True
    return False
reg("Serif",   "DejaVuSerif.ttf")
reg("SerifB",  "DejaVuSerif-Bold.ttf")
reg("Sans",    "DejaVuSans.ttf")
reg("SansB",   "DejaVuSans-Bold.ttf")
SERIF  = "Serif"  if "Serif"  in pdfmetrics.getRegisteredFontNames() else "Times-Roman"
SERIFB = "SerifB" if "SerifB" in pdfmetrics.getRegisteredFontNames() else "Times-Bold"
SANS   = "Sans"   if "Sans"   in pdfmetrics.getRegisteredFontNames() else "Helvetica"
SANSB  = "SansB"  if "SansB"  in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

W, H = A4
MX = 56  # поля

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle(f"Каталог {BRAND} — большие люстры")
c.setAuthor(BRAND)

# ----------------------- ХЕЛПЕРЫ -----------------------
def bg(color=BG):
    c.setFillColor(color); c.rect(0, 0, W, H, stroke=0, fill=1)

def tracked(text, x, y, font, size, color, align='left', track=0):
    w = c.stringWidth(text, font, size) + track*max(len(text)-1, 0)
    if align == 'center': x -= w/2
    elif align == 'right': x -= w
    c.saveState()  # изолируем char-spacing, чтобы он не «утекал» в обычный текст
    to = c.beginText(x, y); to.setFont(font, size); to.setFillColor(color)
    if track: to.setCharSpace(track)
    to.textOut(text); c.drawText(to)
    c.restoreState()

def eyebrow(text, x, y, color=GOLD, size=8.5, track=2.6):
    tracked(text.upper(), x, y, SANSB, size, color, 'left', track)

def ctext(text, x, y, font, size, color, center=False, track=0):
    tracked(text, x, y, font, size, color, 'center' if center else 'left', track)

def wrap(text, font, size, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def para(text, x, y, font, size, maxw, leading, color, center=False):
    c.setFont(font, size); c.setFillColor(color)
    for ln in wrap(text, font, size, maxw):
        (c.drawCentredString if center else c.drawString)(x, y, ln); y -= leading
    return y

def rule(x1, y, x2, color=LINE, w=0.8):
    c.setStrokeColor(color); c.setLineWidth(w); c.line(x1, y, x2, y)

def chandelier(cx, hook_y, s=1.0, glow=True, alpha_dots=1.0):
    if glow:
        c.saveState()
        for r, a in [(150*s, .05), (110*s, .07), (72*s, .10)]:
            c.setFillColor(GOLD); c.setFillAlpha(a)
            c.circle(cx, hook_y - 95*s, r, stroke=0, fill=1)
        c.restoreState()
    c.setStrokeColor(GOLD); c.setLineWidth(1.0)
    c.line(cx, hook_y, cx, hook_y - 28*s)
    rings = [(112, 30, 70), (82, 23, 110), (54, 16, 145), (30, 10, 174)]
    for rx, ry, off in rings:
        rx, ry = rx*s, ry*s; y = hook_y - off*s
        c.ellipse(cx - rx, y - ry, cx + rx, y + ry, stroke=1, fill=0)
    # лампочки
    c.setFillColor(WARM); c.setFillAlpha(alpha_dots)
    dot_rows = [(112, 70, 5, 3.0), (82, 110, 4, 2.6), (54, 145, 3, 2.3), (30, 174, 2, 2.0)]
    for rx, off, n, dr in dot_rows:
        rx = rx*s; y = hook_y - off*s - (ry if False else 0)
        for i in range(n):
            fx = cx - rx*0.82 + (1.64*rx*0.82) * (i/(n-1) if n > 1 else .5)
            c.circle(fx, y - 2*s, dr*s, stroke=0, fill=1)
    c.setFillAlpha(1.0)

def footer_dark(left, right):
    rule(MX, 64, W-MX, LINE)
    ctext(left, MX, 48, SANS, 8.5, MUT2)
    c.setFont(SANS, 8.5); c.setFillColor(MUT2)
    c.drawRightString(W-MX, 48, right)

def page_num(n):
    c.setFont(SANS, 8); c.setFillColor(MUT2)
    c.drawRightString(W-MX, 30, f"{n:02d}")

# ======================= СТР. 1 — ОБЛОЖКА =======================
bg(BG)
eyebrow("Каталог · 2026", MX, H-70)
tracked("СОБСТВЕННОЕ ПРОИЗВОДСТВО · МО", W-MX, H-70, SANS, 8.5, MUT2, 'right', 1.2)
chandelier(W/2, H-150, s=1.25, glow=True)
ctext(BRAND, W/2, 360, SERIF, 70, TEXT, center=True, track=10)
ctext("Б О Л Ь Ш И Е   Л Ю С Т Р Ы", W/2, 330, SANSB, 9, GOLD, center=True, track=3)
para("Монументальный свет для домов культуры, театров, консерваторий и торговых центров",
     W/2, 290, SERIF, 15, 380, 22, MUTED, center=True)
rule(W/2-40, 250, W/2+40, GOLD, 1)
footer_dark("Собственное производство · Одинцово, МО", SITE)
c.showPage()

# ======================= СТР. 2 — ПРОИЗВОДСТВО =======================
bg(BG)
chandelier(W-110, H-60, s=0.5, glow=True, alpha_dots=.8)
eyebrow("О производстве", MX, H-90)
y = H-120
y = para("Фабрика света", MX, y-30, SERIF, 40, 420, 44, TEXT)
y = para("под Москвой", MX, y, SERIF, 40, 420, 44, GOLD)
y -= 16
y = para("Наше производство расположено в Московской области под Одинцовом. "
         "Здесь сосредоточен полный цикл: от конструкторского бюро и металлообработки "
         "до сборки, светотехники и контроля качества.",
         MX, y, SANS, 11.5, W-2*MX, 19, MUTED)
y -= 18
blocks = [
    ("Конструкторское бюро", "3D-проект и инженерный расчёт нагрузок до старта работ."),
    ("Металл и отделка", "Латунь, нержавеющая сталь, ковка; покрытия под золото, бронзу, хром."),
    ("Светотехника", "Современные LED-модули, диммирование, тёплый архитектурный свет."),
    ("Логистика рядом", "Близость к Москве — быстрая доставка и монтаж по всей России."),
]
for t, d in blocks:
    c.setFillColor(GOLD); c.setStrokeColor(GOLD)
    c.saveState(); c.translate(MX+4, y-3); c.rotate(45); c.rect(0, 0, 6, 6, stroke=0, fill=1); c.restoreState()
    ctext(t, MX+22, y, SANSB, 12, TEXT)
    para(d, MX+22, y-17, SANS, 10.5, W-2*MX-22, 15, MUTED)
    y -= 52
# цифры
y_stat = 150
rule(MX, y_stat+44, W-MX, LINE)
stats = [("12", "лет на рынке"), ("300+", "объектов"), ("6 м", "макс. диаметр"), ("60+", "городов")]
cw = (W-2*MX)/4
for i, (n, l) in enumerate(stats):
    x = MX + cw*i + cw/2
    ctext(n, x, y_stat, SERIF, 40, GOLD, center=True)
    ctext(l, x, y_stat-24, SANS, 9.5, MUTED, center=True)
footer_dark(BRAND, "Каталог 2026")
page_num(2)
c.showPage()

# ======================= СТР. 3 — ОБЪЕКТЫ =======================
bg(BG)
eyebrow("Применение", MX, H-90)
yh = para("Для каких пространств", MX, H-150, SERIF, 38, W-2*MX, 42, TEXT)
yi = para("Мы специализируемся на крупных люстрах для залов с высокими потолками — "
     "там, где светильник становится архитектурной доминантой.",
     MX, yh-8, SANS, 11.5, W-2*MX, 18, MUTED)
objs = [
    ("Дома культуры", "Парадные люстры для зрительных залов и фойе"),
    ("Театры и филармонии", "Многоярусные люстры с системой опускания"),
    ("Консерватории", "Свет для концертных и репетиционных залов"),
    ("Торговые центры", "Световые инсталляции для атриумов и галерей"),
    ("Храмы и соборы", "Паникадила и хоросы любой сложности"),
    ("Отели и рестораны", "Лобби, банкетные и ресторанные залы"),
    ("Музеи и БЦ", "Атриумы, лестницы, представительские зоны"),
    ("Частные объекты", "Резиденции, особняки, родовые поместья"),
]
colw = (W-2*MX-30)/2
y0 = yi - 34
for i, (t, d) in enumerate(objs):
    col = i % 2; row = i // 2
    x = MX + col*(colw+30); y = y0 - row*92
    rule(x, y+18, x+colw, LINE, 0.6)
    ctext(f"{i+1:02d}", x, y-6, SERIF, 22, GOLD)
    ctext(t, x+44, y, SANSB, 13, TEXT)
    para(d, x+44, y-17, SANS, 10, colw-44, 14, MUTED)
footer_dark(BRAND, "Применение")
page_num(3)
c.showPage()

# ======================= СТР. 4 и 5 — МОДЕЛИ =======================
def models_page(items, idx_offset, pnum):
    bg(BG)
    eyebrow("Коллекция", MX, H-90)
    para("Избранные модели", MX, H-150, SERIF, 38, 460, 42, TEXT)
    para("Каждая люстра проектируется индивидуально под зал. Размеры, материалы "
         "и комплектация — ориентировочные; финальный проект готовим под ваш объект.",
         MX, H-185, SANS, 11.5, W-2*MX, 18, MUTED)
    cardw = (W-2*MX-2*24)/3
    cardh = 300
    y_top = H-230
    for i, (name, specs) in enumerate(items):
        x = MX + i*(cardw+24)
        c.setFillColor(CARD); c.setStrokeColor(LINE); c.setLineWidth(0.8)
        c.rect(x, y_top-cardh, cardw, cardh, stroke=1, fill=1)
        chandelier(x+cardw/2, y_top-26, s=0.46, glow=True, alpha_dots=.9)
        c.setFillColor(MUT2); c.setFont(SANS, 7)
        c.drawRightString(x+cardw-12, y_top-16, "ФОТО НА САЙТЕ")
        yy = y_top-cardh+108
        ctext(name, x+16, yy, SERIF, 19, TEXT)
        rule(x+16, yy-12, x+cardw-16, LINE, 0.6)
        yy -= 30
        for sp in specs:
            c.setFillColor(GOLD); c.circle(x+19, yy+3, 1.6, stroke=0, fill=1)
            yy = para(sp, x+28, yy, SANS, 9.5, cardw-40, 13, MUTED) - 9
    footer_dark(BRAND, "Коллекция")
    page_num(pnum)
    c.showPage()

models_page(MODELS[:3], 0, 4)
models_page(MODELS[3:], 3, 5)

# ======================= СТР. 6 — ЭТАПЫ =======================
bg(BG)
eyebrow("Как мы работаем", MX, H-90)
para("От эскиза до монтажа", MX, H-150, SERIF, 38, 460, 42, TEXT)
steps = [
    ("Заявка и бриф", "Обсуждаем объект, стиль и бюджет. Отправляем каталог.", "1–2 дня"),
    ("Замер и 3D-проект", "Выезд на объект или работа по чертежам. Визуализация.", "5–10 дней"),
    ("Расчёт и договор", "Инженерный расчёт, спецификация, смета. Фиксируем сроки.", "3–5 дней"),
    ("Производство", "Изготовление на своей фабрике, контроль и тестовая сборка.", "от 30 дней"),
    ("Доставка и монтаж", "Бережная логистика, монтаж нашей бригадой, настройка света.", "по графику"),
    ("Гарантия и сервис", "Гарантия на изделие, обслуживание и поставка деталей.", "до 5 лет"),
]
y = H-220
for i, (t, d, dur) in enumerate(steps):
    rule(MX, y+24, W-MX, LINE, 0.6)
    ctext(f"{i+1:02d}", MX, y, SERIF, 34, GOLD if i == 0 else MUT2)
    ctext(t, MX+70, y, SANSB, 14, TEXT)
    para(d, MX+70, y-18, SANS, 10.5, 360, 14, MUTED)
    tracked(dur.upper(), W-MX, y, SANSB, 8.5, GOLD, 'right', 1.5)
    y -= 80
footer_dark(BRAND, "Процесс")
page_num(6)
c.showPage()

# ======================= СТР. 7 — ПРЕИМУЩЕСТВА + ПАРТНЁРАМ =======================
bg(BG)
eyebrow("Почему LUX", MX, H-90)
para("Четыре причины доверия", MX, H-150, SERIF, 38, 460, 42, TEXT)
adv = [
    ("Собственное производство", "Своя фабрика под Одинцовом — без посредников и наценок."),
    ("Индивидуальный проект", "Любая форма и размер: диаметр от 1,5 до 6+ метров."),
    ("Полный цикл под ключ", "Дизайн, расчёт, изготовление, доставка, монтаж, гарантия."),
    ("Опыт крупных объектов", "Знаем пожарные нормы, нагрузки и системы опускания."),
]
cw = (W-2*MX-30)/2
y0 = H-220
for i, (t, d) in enumerate(adv):
    col = i % 2; row = i // 2
    x = MX + col*(cw+30); y = y0 - row*110
    ctext(f"0{i+1}", x, y, SERIF, 26, GOLD)
    ctext(t, x, y-30, SANSB, 13, TEXT)
    para(d, x, y-48, SANS, 10.5, cw, 15, MUTED)
# партнёрам
yb = 250
rule(MX, yb+30, W-MX, LINE)
eyebrow("Сотрудничество", MX, yb)
para("Архитекторам, дизайнерам и подрядчикам", MX, yb-26, SERIF, 22, W-2*MX, 26, TEXT)
partners = [
    ("Архитекторам", "Воплотим авторскую концепцию. 3D-модели и документация."),
    ("Дизайнерам", "Решение под стиль и бюджет. Авторское вознаграждение."),
    ("Подрядчикам", "Субподряд по светотехнике. Работаем по 44-ФЗ и 223-ФЗ."),
]
cw3 = (W-2*MX-2*24)/3
for i, (t, d) in enumerate(partners):
    x = MX + i*(cw3+24); y = yb-70
    ctext(t, x, y, SANSB, 12, GOLD)
    para(d, x, y-18, SANS, 9.5, cw3, 13, MUTED)
footer_dark(BRAND, "Преимущества")
page_num(7)
c.showPage()

# ======================= СТР. 8 — КОНТАКТЫ =======================
bg(BG)
chandelier(W/2, H-120, s=0.95, glow=True)
ctext("КОНТАКТЫ", W/2, 430, SANSB, 8.5, GOLD, center=True, track=3)
ctext("Обсудим ваш проект", W/2, 388, SERIF, 40, TEXT, center=True)
para("Ответим на вопросы, посчитаем стоимость и пришлём примеры. "
     "Оставьте заявку на сайте — каталог и расчёт пришлём в течение дня.",
     W/2, 350, SANS, 11.5, 440, 18, MUTED, center=True)
rule(W/2-40, 318, W/2+40, GOLD, 1)
contacts = [("Телефон", PHONE), ("E-mail", EMAIL), ("Telegram", TG),
            ("Сайт", SITE), ("Производство", ADDRESS)]
y = 280
for k, v in contacts:
    tracked(k.upper(), W/2, y, SANSB, 8, MUT2, 'center', 2)
    ctext(v, W/2, y-18, SERIF, 16, TEXT, center=True)
    y -= 46
footer_dark("Собственное производство · Одинцово, МО", BRAND)
c.showPage()

c.save()
print("OK ->", os.path.abspath(OUT))
