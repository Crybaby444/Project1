# Yoyo — План 12: Главная и служебные страницы. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Посетитель yoyo.rent с первого экрана понимает, что такое Yoyo, как здесь арендуют и сдают вещи и почему это безопасно, и может:
- прочитать «Как это работает», FAQ, условия, политику конфиденциальности и cookies на EN, LV и RU;
- увидеть настоящие категории из API (без выдуманных вещей и цифр);
- зарегистрироваться или перейти к сдаче вещи одной кнопкой;
- переключить язык и тему в подвале любой страницы.

Главная — витрина стиля `DESIGN.md` в полной подаче: огромный сжатый дисплейный шрифт, пастельная бумага, контуры 1px, лента и наклейки коллажем, бегущая строка. В покое коллаж неподвижен, под курсором оживает.

**Architecture:**
- **Страницы — серверные компоненты** (`app/[locale]/{page,how-it-works,faq,terms,privacy,cookies}`): весь текст приходит в HTML, клиентского JavaScript минимум (наклейки, бегущая строка, переходы, аккордеон FAQ работает на `<details>` без JS).
- **Тексты.** Короткие интерфейсные строки и тексты главной, «Как это работает» и FAQ — в отдельных файлах сообщений `messages/site/{en,lv,ru}.json`. `i18n/request.ts` склеивает их с основными. Так параллельные ветки, которые дописывают `messages/{en,lv,ru}.json`, не конфликтуют с этой.
- **Юридические тексты** — типизированные модули `src/content/legal/{terms,privacy,cookies}.ts` с версиями EN/LV/RU одинаковой структуры (разделы с постоянными `id`, абзацы, списки, таблицы). Структуру и ключевые факты (контакты, список обработчиков, список cookie) сверяют модульные тесты.
- **Категории** на главной: серверный `fetch` к `GET /api/v1/categories` с таймаутом 2,5 с и кэшем 5 минут, внутри `Suspense` с заглушкой того же размера. Бесплатный Render может спать до минуты: главная не ждёт его, а при ошибке показывает понятный текст и кнопку «Попробовать снова» (запрос из браузера).
- **Движение** только на `transform` и `opacity`:
  - появление секций при прокрутке — CSS scroll-driven animations (`animation-timeline: view()`), без JS и без скрытия текста: секция уже видна, она только «доезжает» на место и чуть поворачивается, как наклеиваемая; браузеры без поддержки показывают её сразу на месте;
  - переходы между страницами — View Transition с тем же «листом бумаги», что у смены языка (`switch-page.ts` обобщает `switch-language.ts`);
  - `prefers-reduced-motion` выключает всё (общее правило в `globals.css` плюс проверки в JS).
- **SEO:** `metadataBase` из `SITE_ORIGIN` (иначе `https://yoyo.rent`), `alternates` с `hreflang` для каждой страницы и языка, OG-картинки генерирует `next/og` по одному шаблону в стиле наклеек, `sitemap.ts`, `robots.ts`, JSON-LD.

**Tech Stack:** уже есть: Next.js 16, next-intl 4, Tailwind 4, Vitest и Testing Library, Playwright с axe. Новых зависимостей нет: OG-картинки рисует встроенный `next/og`, шрифт для них (Unbounded, OFL) лежит в репозитории файлом TTF.

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §0 (приоритет: настоящий сервис, юридические страницы, GDPR);
- §4.1 (главная, служебные страницы, «тексты осмысленные, без рыбы»);
- §4.9 (темы, языки, адаптивность, доступность, `prefers-reduced-motion`);
- §7 (маршруты `/`, `/how-it-works`, `/faq`, `/terms`, `/privacy`; `/cookies` добавлен этим планом);
- §8 (громкое оформление только на главной и в баннерах разделов, микровзаимодействия).

Дизайн — [`DESIGN.md`](../../../DESIGN.md), раздел «Project adaptations» главнее референса. Дорожная карта — строка 12.

## Global Constraints

**Общие правила**
- Действуют правила планов 1, 3 и 5: TypeScript strict, три языка с одинаковым набором ключей, `DESIGN.md`, политика pnpm, бюджет ноль.
- **Чужие зоны не трогаем.** Параллельно идут `feat/listings-ui` (конструктор, «Мои вещи», шапка) и `feat/deals-api`. Шапку (`SiteHeader`) этот план не меняет. В общих файлах (`layout.tsx`, `globals.css`, `Button.tsx`, `Sticker.tsx`) правки точечные и дописываются в конец.
- **Никакой рыбы и выдуманных данных.** Нет поддельных объявлений, отзывов, счётчиков «10 000 довольных клиентов», логотипов прессы. Категории и число подкатегорий — из API.
- **Нет мёртвых ссылок.** Каталога ещё нет (план 7), поэтому карточки категорий не ссылки. «Сдать вещь» ведёт на `/listings/new`, если этот маршрут уже есть в `main` к моменту PR, иначе на `/register`; адрес задан одной константой `LIST_ITEM_HREF` в `src/lib/site.ts`. Отдельный e2e-тест проходит по всем внутренним ссылкам новых страниц и ждёт не `404`.

**Дизайн (`DESIGN.md`)**
- Цвета только из токенов, никаких градиентов и теней. Контуры 1px `ink`. Кнопки и теги — пилюли, карточки 20–40px.
- Дисплейный шрифт (`font-display`, 800–900, межстрочный 0.78–0.85) — заголовок главной и заголовки секций и страниц, через `displayFit`, чтобы самое длинное слово помещалось в контейнер на 320px на любом языке.
- Полосы секций чередуются: `canvas` → `surface` → `band`, без разделителей.
- Каждый дисплейный заголовок главной стоит рядом с лентой или кластером наклеек (`DESIGN.md` Do's).
- Лента — SVG-трубка Electric Blue: тёмная нижняя кромка, основное тело, светлый блик — три плоских штриха и зернистость (`feTurbulence` один раз, как узор), без градиентов (Project adaptations §6). В обеих темах одна и та же.
- Синий не бывает кнопкой или ссылкой; главная кнопка — заливка `cta`, вторичная — контур.
- Тёмная тема продумана так же: контуры белые, у наклеек белая кромка, полосы `#0d0e16 / #171823 / #1f2030`, бегущая строка белая с чёрным текстом.

**Движение (Project adaptations §1)**
- В покое ничего не движется само, кроме бегущей строки (пауза при наведении и фокусе, кнопка паузы есть).
- Наведение и нажатие: кнопки приподнимаются и сжимаются, карточки наклоняются, как отклеиваемая наклейка (`Card interactive`), наклейки качаются при наведении и крутятся по клику.
- Длительности 150–450 мс, кривая `cubic-bezier(.2,.8,.2,1)`. Анимируются только `transform` и `opacity` (`filter: blur` разрешён лишь в уже существующем переходе языка, который идёт по снимку страницы).
- Появление секций никогда не прячет текст: начальное состояние видимо (`opacity` не опускается ниже 1), меняется только сдвиг и поворот. Скриншот, печать, поиск по странице и читалка видят всё.
- `prefers-reduced-motion: reduce`: ни одной анимации (`document.getAnimations()` пуст после загрузки), переходы между страницами мгновенные.
- Сдвиг макета (CLS) около 0: у ленты, наклеек, заглушки категорий заданы размеры, шрифты `display: swap` с уже настроенными запасными.

**Доступность**
- Ровно один `h1` на страницу, заголовки по порядку. Декоративные наклейки и лента `aria-hidden`.
- Контраст AA в обеих темах: текст на наклейках чёрный (белый только на Voltage Violet), как в `Chip`.
- FAQ на `<details>/<summary>`: работает с клавиатуры и без JS.
- Юридические страницы: оглавление ссылками на якоря разделов, `scroll-margin-top`, видимый фокус.
- Цели нажатия не меньше 40px.

**Производительность**
- Lighthouse на телефоне (эмуляция Moto G Power, throttling по умолчанию): Performance ≥ 95, Accessibility ≥ 95 для главной и одной служебной страницы. Проверяется вручную перед PR, результаты в описании PR. В CI Lighthouse не запускается: бесплатный раннер слишком шумный для порога 95.
- LCP — текст hero, без картинок. Никаких клиентских библиотек анимации.

**Юридические тексты**
- Это **добросовестная первая версия для оператора из Латвии, а не юридическое заключение.** Перед коммерческим запуском (настоящие платежи, комиссия) её обязательно вычитывает юрист. Это стоит в начале каждого юридического модуля комментарием и в README, но не на самих страницах (там обычный текст документа).
- Тексты честно описывают сервис как он есть: настоящих платежей пока нет, сделки и кошелёк вводятся по мере готовности, отслеживания и аналитики нет, cookie только необходимые.
- Реквизиты оператора (юридическое имя, регистрационный номер, адрес) владелец пока не дал. Они лежат в `src/content/legal/operator.ts` полями со значением `null`; пока поле пустое, текст обходится без него («оператор сервиса Yoyo, Латвия, admin@yoyo.rent»). Заполнить их — действие владельца.

## Review Focus

1. **Текст никогда не скрыт движением.** Секции с `reveal` видимы до прокрутки, при печати, без поддержки `animation-timeline` и при `prefers-reduced-motion`. Тест в Task 2 и Task 9.
2. **Главная не зависит от спящего API.** API не отвечает 10 с → главная отдаётся быстро, на месте категорий понятный текст и «Попробовать снова»; после пробуждения кнопка показывает категории. Тест в Task 4.
3. **JSON-LD не ломает страницу.** Строки с `</script>` или `<!--` в данных экранируются. Тест в Task 1.
4. **`hreflang` и canonical указывают на правильные адреса**, включая `x-default` и английский без префикса. Тест в Task 1 и Task 8.
5. **Юридические тексты на трёх языках совпадают по содержанию**: одинаковые разделы, один и тот же список обработчиков и cookie, контакты, сроки хранения. Тест в Task 7.
6. **Переход между страницами не теряет навигацию**: клик с модификатором открывает новую вкладку, кнопка «назад» работает, без View Transitions переход обычный. Тест в Task 2 и Task 9.

---

## Структура файлов (итог плана)

```
apps/web/messages/site/{en,lv,ru}.json         (landing, howItWorks, faq, footer, legal, pages)
apps/web/src/i18n/request.ts                  (склейка messages + messages/site)
apps/web/src/lib/site.ts                      (SITE_URL, PAGES, LIST_ITEM_HREF, CONTACT_EMAIL) (+ test)
apps/web/src/lib/seo.ts                       (alternates, pageMetadata) (+ test)
apps/web/src/components/seo/JsonLd.tsx        (+ test)
apps/web/src/components/motion/{switch-page.ts,TransitionLink.tsx} (+ tests)
apps/web/src/components/decor/{Ribbon.tsx,StickerCluster.tsx} (+ tests)
apps/web/src/components/layout/SiteFooter.tsx (+ test)
apps/web/src/components/landing/{Hero,WhatIsYoyo,HowRenting,Safety,Categories,CategoriesRetry,FaqTeaser,FinalCta,SectionTitle}.tsx
apps/web/src/lib/categories.ts                (loadCategories с таймаутом) (+ test)
apps/web/src/components/pages/{PageBanner,FaqList,LegalDocument}.tsx (+ tests)
apps/web/src/content/legal/{types.ts,operator.ts,terms.ts,privacy.ts,cookies.ts} (+ legal.test.ts)
apps/web/src/app/[locale]/{page,how-it-works/page,faq/page,terms/page,privacy/page,cookies/page}.tsx
apps/web/src/app/[locale]/**/opengraph-image.tsx, apps/web/src/lib/og.tsx, apps/web/src/assets/og/Unbounded-Black.ttf
apps/web/src/app/{sitemap.ts,robots.ts} (+ tests)
apps/web/e2e/{landing,service-pages,seo,site-quality}.spec.ts
README.md, docs/superpowers/plans/2026-11-03-yoyo-roadmap.md
```

---

### Task 1: Основа страниц: адреса, SEO-помощники, JSON-LD, отдельные сообщения

**Files:**
- Create: `apps/web/messages/site/{en,lv,ru}.json` (пока только `pages.*.title/description` и `footer`), `apps/web/src/lib/site.ts`, `apps/web/src/lib/seo.ts`, `apps/web/src/components/seo/JsonLd.tsx`.
- Modify: `apps/web/src/i18n/request.ts`, `apps/web/src/i18n/messages.test.ts` (ключи `site` сверяются так же, пространства имён не пересекаются с основными).
- Test: рядом с файлами.

**Interfaces:**
- `site.ts`:
  - `SITE_URL: string` — `process.env.SITE_ORIGIN` без завершающего `/`, иначе `https://yoyo.rent`;
  - `PAGES = ['/', '/how-it-works', '/faq', '/terms', '/privacy', '/cookies'] as const`, `type SitePage`;
  - `CONTACT_EMAIL = 'admin@yoyo.rent'`, `LIST_ITEM_HREF`.
- `seo.ts`:
  - `localizedPath(locale, path)`: `/` + en → `/`, `/faq` + lv → `/lv/faq`;
  - `alternates(path, locale)` → `{ canonical, languages: { en, lv, ru, 'x-default' } }` (абсолютные адреса);
  - `pageMetadata({ locale, path, title, description })` → `Metadata` с `alternates`, `openGraph` (`type: 'website'`, `locale: en_US / lv_LV / ru_RU`, `alternateLocale`, `siteName: 'Yoyo'`, `url`), `twitter: { card: 'summary_large_image' }`.
- `JsonLd({ data })`: `<script type="application/ld+json">` с `JSON.stringify`, где `<`, `>`, `&`, U+2028/2029 заменены на `\u…`.

- [ ] **Step 1: Write the failing tests**

```ts
// seo.test.ts
expect(localizedPath('en', '/')).toBe('/'); expect(localizedPath('lv', '/')).toBe('/lv'); expect(localizedPath('ru', '/faq')).toBe('/ru/faq');
expect(alternates('/faq', 'lv')).toEqual({ canonical: 'https://yoyo.rent/lv/faq', languages: { en: 'https://yoyo.rent/faq', lv: …, ru: …, 'x-default': 'https://yoyo.rent/faq' } });
// pageMetadata: og:locale lv_LV, alternateLocale [en_US, ru_RU], url = canonical
// JsonLd.test.tsx: { name: '</script><script>alert(1)</script>' } → в HTML нет второго <script>, JSON.parse(text) возвращает исходную строку
// messages.test.ts: site/lv и site/ru имеют те же ключи, что site/en; пространства имён site не совпадают с основными
```

- [ ] **Step 2: Run, verify FAIL.** `pnpm --filter @yoyo/web test`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: Commit.** `feat(web): page addresses, SEO helpers, safe JSON-LD and site message files`.

---

### Task 2: Движение: лента, кластеры наклеек, появление секций, переходы между страницами

**Files:**
- Create: `apps/web/src/components/decor/{Ribbon.tsx,StickerCluster.tsx}`, `apps/web/src/components/motion/{switch-page.ts,TransitionLink.tsx}`.
- Modify: `apps/web/src/app/globals.css` (утилита `reveal`, правила `html[data-page-switch]`, общие с `data-language-switch`), `apps/web/src/components/ui/Sticker.tsx` (новые виды `shield`, `tag`, `key`, `heart`), `apps/web/src/components/ui/Button.tsx` (ссылка-кнопка идёт через `TransitionLink`).
- Test: рядом с файлами.

**Interfaces:**
- `Ribbon({ variant: 'hero' | 'loop' | 'wave', className })`: SVG `aria-hidden`, `viewBox` фиксирован, ширина 100% и `aspect-ratio`, поэтому место занято до отрисовки. Три плоских штриха (`#2a78d6` тень, `--sticker-blue` тело, `#9ccbff` блик) и зерно через `<filter>` с `feTurbulence` + `feComposite` по альфе. Никаких `linearGradient`/`radialGradient`.
- `StickerCluster({ items: { kind, size, top, left, rotate }[] })`: абсолютные наклейки вокруг заголовка, повёрнуты, не по сетке; на телефоне крупные уменьшаются (`clamp`), ни одна не выходит за край вьюпорта.
- CSS `reveal`: `@supports (animation-timeline: view())` и `prefers-reduced-motion: no-preference` → `animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 70%`; `@keyframes reveal { from { transform: translateY(40px) rotate(var(--reveal-tilt, -1.5deg)) } }`. `opacity` не меняется. `@media print` — без анимации.
- `switch-page.ts`:
  - `shouldAnimatePageChange = shouldAnimateThemeChange`;
  - `whenPathIs(pathname, timeoutMs = 3000): Promise<void>` — ждёт `location.pathname`;
  - `switchPage({ pathname, navigate, animate })`: с `animate` ставит `data-page-switch`, запускает `document.startViewTransition`, в update вызывает `navigate()` и ждёт `whenPathIs`; без него — просто `navigate()`. Пропущенный переход всё равно переключает страницу.
- `TransitionLink`: обёртка над `Link` из `@/i18n/navigation`; обычный левый клик без модификаторов по ссылке на другую страницу этого сайта → `switchPage` (`router.push`); клик с Ctrl/Cmd/Shift/Alt, средней кнопкой, `target`, якорь на той же странице — обычное поведение ссылки.

- [ ] **Step 1: Write the failing tests**

```ts
// switch-page.test.ts (как switch-language.test.ts): animate=false → navigate вызван, startViewTransition не вызван;
// animate=true → data-page-switch стоит во время перехода и снят после finished; update ждёт смены pathname; таймаут 3 с не вешает переход
// TransitionLink.test.tsx: обычный клик → router.push('/faq'), preventDefault; Ctrl+клик и средняя кнопка → без push; prefers-reduced-motion → push без startViewTransition
// Ribbon.test.tsx: aria-hidden, в разметке нет "Gradient", у svg есть viewBox и aspect-ratio
// Sticker.test.tsx: новые виды рисуются, с label → role=img
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): ribbon, sticker clusters, scroll reveal that never hides text, page transitions`.

---

### Task 3: Подвал на каждой странице

**Files:**
- Create: `apps/web/src/components/layout/SiteFooter.tsx` (+ test).
- Modify: `apps/web/src/app/[locale]/layout.tsx` (одна строка: `<SiteFooter />` после содержимого), `messages/site/*.json` (`footer`).

**Interfaces:**
- Полоса `band` с контуром сверху, крупное слово YOYO дисплейным шрифтом и наклейка-йо-йо.
- Колонки: «Сервис» (Как это работает, FAQ), «Документы» (Условия, Конфиденциальность, Cookies), «Связь» (`mailto:admin@yoyo.rent`), «Настройки» (`LanguageSwitcher` и `ThemeSelect` — системная / светлая / тёмная).
- Строка внизу: «© 2026 Yoyo · Сделано в Риге» (год из даты сборки страницы), ссылки внутри через `TransitionLink`.
- На 320px колонки идут одна под другой, ничего не вылезает.

- [ ] **Step 1: Write the failing tests:** подвал содержит пять ссылок с правильными адресами для `lv` (`/lv/terms` и т. д.), ссылку `mailto:admin@yoyo.rent`, группу выбора темы и навигацию языков; у навигации подвала своё имя (`aria-label`), отличное от шапки.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): site footer with service and legal links, contact, language and theme`.

---

### Task 4: Главная

**Files:**
- Create: `apps/web/src/components/landing/*`, `apps/web/src/lib/categories.ts` (+ test), `apps/web/e2e/landing.spec.ts`.
- Modify: `apps/web/src/app/[locale]/page.tsx`, `messages/site/*.json` (`landing`).

**Interfaces:**
- **Hero** (`canvas`): `h1` — огромное YOYO (`displayFit`, до 40rem на широком экране), под ним лента-нитка, наклейки (монета, йо-йо, звезда, молния) коллажем, подзаголовок 24–64px и две кнопки: «Создать аккаунт» (заливка) и «Как это работает» (контур). Для вошедшего первая кнопка — «Сдать вещь» (`LIST_ITEM_HREF`).
- **Бегущая строка** сразу под hero: короткие фразы, в которых только правда о сервисе («Аренда у людей рядом», «Залог под защитой», «Договор до оплаты», «Сделано в Риге»). Никаких обещаний, которых сервис пока не выполняет.
- **Что такое Yoyo** (`surface`): дисплейный заголовок и три карточки-наклейки (арендуй, сдавай, всё возвращается).
- **Как проходит аренда** (`band`): две колонки — «Если берёте» и «Если сдаёте», по 4–5 шагов, номера на кружках-наклейках, ссылка на `/how-it-works`.
- **Безопасность** (`canvas`): четыре карточки: залог (правило владельца: всё в порядке — залог целиком назад; повреждение — арендатор согласен или решает администратор), договор до оплаты, модерация объявлений и жалобы, взаимные отзывы.
- **Категории** (`surface`): верхние категории из API — цвет наклейки из `sticker`, имя на языке страницы, число подкатегорий («8 подкатегорий» через ICU plural), список подкатегорий мелко. Карточки `Card interactive`, не ссылки. Пустой ответ — секция не показывается.
- **FAQ коротко** (`band`): 4 вопроса из FAQ на `<details>`, ссылка «Все вопросы».
- **Финал** (`canvas`): дисплейный призыв, кнопки «Создать аккаунт» / «Сдать вещь» и «Посмотреть FAQ».
- `loadCategories(fetchImpl = fetch, timeoutMs = 2500): Promise<{ ok: true; categories } | { ok: false }>` — `AbortSignal.timeout`, проверка ответа схемой `CategoriesResponseSchema`, `next: { revalidate: 300 }`.
- `CategoriesRetry` (клиент): «Не получилось загрузить категории. Попробовать снова» → `GET /api/v1/categories` из браузера, при успехе рисует тот же список.

**Тексты** пишутся заново на трёх языках, живым языком, без канцелярита и кальки; брендовые слова (Yoyo, YOYO) не переводятся. LV и RU — не перевод EN по словам, а тот же смысл так, как сказал бы носитель.

- [ ] **Step 1: Write the failing tests**

```ts
// categories.test.ts: 200 + валидное тело → ok; 500, неверное тело, таймаут (fetch не отвечает) → { ok: false } за ≤ timeoutMs
// landing e2e: на /, /lv, /ru один h1 «Yoyo», все секции видимы (по заголовкам h2 из сообщений), категории — имена из GET /api/v1/categories на языке страницы
// e2e (Review Focus 2): маршрут page.route на /api/v1/categories с задержкой невозможен для серверного fetch → отдельный запуск web с API_URL на «молчащий» порт
//   в unit: Categories c loadCategories → { ok:false } рисует текст ошибки и кнопку; клик по кнопке с фейковым fetch → список
// e2e: гость видит «Создать аккаунт» → /register; вошедший видит «Сдать вещь»
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): landing page in the full sticker style with real categories`.

---

### Task 5: «Как это работает»

**Files:**
- Create: `apps/web/src/app/[locale]/how-it-works/page.tsx`, `apps/web/src/components/pages/PageBanner.tsx`.
- Modify: `messages/site/*.json` (`howItWorks`).

**Interfaces:**
- `PageBanner({ title, lead, stickers })`: баннер раздела — дисплейный `h1` через `displayFit`, лента, 2–3 наклейки. Его же используют FAQ и юридические страницы (там спокойнее: одна наклейка, без ленты).
- Разделы: «Берёте вещь» (найти, запросить даты, подтверждение владельцем за 24 ч, договор, оплата аренды + сервисный сбор 10 % и залог, встреча и передача, возврат, залог назад), «Сдаёте вещь» (объявление в конструкторе, модерация, ответ на запрос, фото при выдаче, деньги после передачи, проверка вещи за 48 ч), «Залог и споры» (правило владельца проекта и тайм-ауты 48 ч), «Отмена» (до передачи любой стороной, возврат всего уплаченного), «Отзывы» (14 дней, 1–5 звёзд). Сроки и проценты берутся из `@yoyo/domain`/настроек, если они там экспортированы, иначе из одного места в `site.ts`.
- В конце — призыв и ссылка на FAQ.

- [ ] **Step 1: Write the failing tests:** e2e на трёх языках: `h1` из сообщений, разделы по `h2`, ссылки «FAQ» и «Создать аккаунт» ведут на существующие страницы.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): how it works page for renters and owners`.

---

### Task 6: FAQ

**Files:**
- Create: `apps/web/src/app/[locale]/faq/page.tsx`, `apps/web/src/components/pages/FaqList.tsx` (+ test).
- Modify: `messages/site/*.json` (`faq`: группы и вопросы с постоянными ключами).

**Interfaces:**
- Группы: «Аренда», «Сдача вещей», «Деньги и залог», «Безопасность и споры», «Аккаунт и данные». В каждой 3–5 вопросов; ответы короткие, честные (например, «Можно ли платить картой? — Онлайн-оплата появится вместе со сделками; пока…» по фактическому состоянию сервиса).
- `FaqList({ groups })`: `<details name="faq-…">` (одновременно открыт один вопрос группы), `summary` — кнопка с «+», который поворачивается на 45° (только `transform`); у каждого вопроса `id` для ссылки `#…`, ссылка на вопрос открывает его.
- JSON-LD `FAQPage` из тех же сообщений (только на `/faq`).

- [ ] **Step 1: Write the failing tests:** unit — вопросы по группам, открытие с клавиатуры (Enter/Space), открытие по `#id` в адресе; e2e — JSON-LD на `/faq` парсится, тип `FAQPage`, число `mainEntity` равно числу вопросов на странице, тексты на языке страницы.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): FAQ page with grouped questions and FAQPage data`.

---

### Task 7: Условия, конфиденциальность, cookies

**Files:**
- Create: `apps/web/src/content/legal/{types.ts,operator.ts,terms.ts,privacy.ts,cookies.ts,legal.test.ts}`, `apps/web/src/components/pages/LegalDocument.tsx` (+ test), `apps/web/src/app/[locale]/{terms,privacy,cookies}/page.tsx`.

**Interfaces:**
- `LegalDoc = { title; updated: '2026-11-05'; summary: string[]; sections: { id; heading; blocks: Block[] }[] }`, `Block = { p } | { list } | { table: { head; rows } }`; ссылки внутри текста — `[текст](/путь)` и `mailto:`, разбираются в `LegalDocument` без `dangerouslySetInnerHTML`.
- `LegalDocument`: баннер, «Действует с …», краткое изложение («Коротко») в карточке-наклейке, оглавление и разделы. Ширина текста ≤ 72ch, 16px.
- **Условия (terms):** кто мы и что такое Yoyo (посредник, стороной аренды не является); аккаунт (18+, одни настоящие данные, один аккаунт, безопасность пароля); объявления (только свои вещи или вещи, которые вправе сдавать; запрещённые вещи: оружие, наркотики, краденое, подделки, опасные вещества, живые животные, вещи, для которых нужна лицензия, и т. п.; модерация); сделка (запрос, подтверждение за 24 ч, договор до оплаты между арендатором и владельцем, передача и возврат отмечаются обеими сторонами); деньги (честно: онлайн-платежи пока не работают; когда появятся: аренда + сервисный сбор 10 % с арендатора, залог замораживается, правило залога, тайм-ауты 48 ч, выплаты; баланс кошелька — учёт внутри сервиса, не электронные деньги); отмена; отзывы (честные, без оплаты за отзыв); поведение и запреты; модерация, жалобы, блокировка; ответственность (в пределах закона Латвии, права потребителя не ограничиваются); изменения условий (уведомление за 14 дней, существенные — письмом); право Латвии и споры (суд Латвии; потребитель может обратиться в Центр защиты прав потребителей — PTAC); контакты.
- **Конфиденциальность (privacy):** оператор и контакт; какие данные (аккаунт: имя, почта, хэш пароля, язык, тема, город, «о себе»; вход через Google: идентификатор и почта; телефон — когда будет; объявления: фото без геометок, описание, район и точная точка, которая не публикуется; сессии: IP и браузер, 30 дней; технические журналы хостинга; письма; позже сделки, договоры, сообщения, отзывы — по мере запуска функций); цели и основания (договор — ст. 6(1)(b), законный интерес безопасности — ст. 6(1)(f), юридическая обязанность — ст. 6(1)(c) для бухгалтерии, когда появятся платежи; согласие не используется — нет рекламы и аналитики); сроки хранения таблицей; кому передаём — обработчики таблицей: **Vercel** (сайт и CDN), **Render** (API, регион Франкфурт), **Neon** (база данных, Франкфурт), **Resend** (письма), **Cloudinary** (фото объявлений), **ImprovMX** (пересылка почты admin@yoyo.rent), **GoDaddy** (домен и DNS); отдельно — **Google** (если вход через Google) и **OpenStreetMap Nominatim** (поиск адреса: уходит только текст запроса); передача за пределы ЕЭЗ (стандартные договорные условия / EU-US Data Privacy Framework, юрист сверяет); права (доступ, исправление, удаление, ограничение, переносимость, возражение) и как ими воспользоваться; **как удалить аккаунт** (Настройки → Безопасность → Удалить аккаунт; что удаляется сразу и что остаётся обезличенным; или письмом); жалоба в Datu valsts inspekcija (Elijas iela 17, Rīga, LV-1050, dvi.gov.lv); дети; безопасность; изменения.
- **Cookies:** только строго необходимые, поэтому баннера согласия нет; таблица: `yoyo_at` (вход, 15 мин), `yoyo_rt` (продление сессии, 30 дней, только `/api/v1/auth`), `yoyo_session` (подсказка, что сессия есть, 30 дней), `yoyo_dev` (устройство для защиты входа, 1 год), `yoyo_oauth` (одна попытка входа через Google, 10 мин), `yoyo-theme` (тема, 1 год), `NEXT_LOCALE` (язык, до закрытия браузера); плюс localStorage `yoyo-refreshed-at` (одно продление сессии на все вкладки); как удалить cookie в браузере; что изменится, если когда-нибудь появятся необязательные (сначала согласие).
- `operator.ts`: `{ brand: 'Yoyo', country: 'Latvia', email: 'admin@yoyo.rent', legalName: null, registrationNumber: null, address: null }`.

- [ ] **Step 1: Write the failing tests**

```ts
// legal.test.ts
// для каждого документа: lv и ru имеют те же id разделов в том же порядке и столько же блоков каждого вида, что en
// privacy (все языки): упомянуты Vercel, Render, Neon, Resend, Cloudinary, ImprovMX, GoDaddy, Google, Nominatim; admin@yoyo.rent; dvi.gov.lv; путь удаления аккаунта
// cookies (все языки): таблица содержит ровно yoyo_at, yoyo_rt, yoyo_session, yoyo_dev, yoyo_oauth, yoyo-theme (= THEME_COOKIE), NEXT_LOCALE (+ SESSION_HINT_COOKIE из @yoyo/shared)
// terms (все языки): 10 %, 24, 48, 14 совпадают с константами сервиса
// в текстах нет «lorem», «TODO», «TBD», «XXX»
// LegalDocument.test.tsx: оглавление ссылается на каждый раздел; [текст](/privacy) → ссылка на /lv/privacy; mailto работает; таблица с <th scope="col">
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): terms of service, privacy policy and cookie pages in three languages`.

---

### Task 8: SEO: метаданные, OG-картинки, sitemap, robots, JSON-LD

**Files:**
- Create: `apps/web/src/lib/og.tsx`, `apps/web/src/assets/og/Unbounded-Black.ttf` (подмножество латиницы, латышских букв и кириллицы; OFL), `opengraph-image.tsx` в `app/[locale]` и папке каждой страницы, `apps/web/src/app/{sitemap.ts,robots.ts}` (+ tests), `apps/web/e2e/seo.spec.ts`.
- Modify: `generateMetadata` каждой новой страницы через `pageMetadata`, `app/[locale]/layout.tsx` (`metadataBase`), главная (JSON-LD `Organization` + `WebSite`).

**Interfaces:**
- `ogImage({ title, kicker, locale })` → `ImageResponse` 1200×630: фон Sky Wash, огромный заголовок дисплейным шрифтом, лента и три наклейки, слово YOYO; всё плоское, без градиентов.
- `sitemap()`: каждая страница из `PAGES` × 3 языка, у каждой записи `alternates.languages`; `lastModified` — дата документов.
- `robots()`: `allow: /`, `disallow: ['/api/', '/settings', '/styleguide']` (+ языковые варианты), `sitemap: ${SITE_URL}/sitemap.xml`, `host`.
- Служебные страницы аккаунта (`/login`, `/register` и т. п.) в sitemap не входят.

- [ ] **Step 1: Write the failing tests:** unit — sitemap содержит 18 адресов с `hreflang` всех трёх языков, robots закрывает `/api/`; e2e — у каждой страницы × языка свой `<title>`, `<link rel=canonical>`, 4 `hreflang` (`en`, `lv`, `ru`, `x-default`), `og:image` отвечает `200 image/png`, `/sitemap.xml` и `/robots.txt` отвечают и не перехватываются локализацией; JSON-LD на главной: `Organization` (с `email`) и `WebSite`.
- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): per-page metadata, Open Graph images, hreflang, sitemap, robots and structured data`.

---

### Task 9: Качество: телефоны, темы, axe, движение, CLS

**Files:**
- Create: `apps/web/e2e/site-quality.spec.ts`.
- Modify: `apps/web/e2e/fit-on-phones.spec.ts` (новые страницы в общем проходе).

**Interfaces / проверки:**
- Каждая из 6 страниц × 3 языка × 2 темы × ширины 320 и 390: `overflows()` пуст, axe без нарушений уровня serious/critical, нет ошибок в консоли.
- Ширина 1440: то же для обеих тем (один язык).
- **Reduced motion** (`reducedMotion: 'reduce'`): после загрузки и прокрутки до конца `document.getAnimations()` пуст (бегущая строка тоже стоит), переход по ссылке подвала без `startViewTransition`; весь текст секций в пределах их коробок и видим.
- **Без scroll-driven animations** (`CSS.supports` подменён / старый движок не эмулируем — проверяется, что у `.reveal` вне видимой области вычисленная `opacity` равна 1).
- **Переход между страницами:** клик в подвале → один View Transition, новая страница и адрес, `data-page-switch` снят; «назад» возвращает на главную.
- **CLS:** `PerformanceObserver('layout-shift')` на главной за загрузку и прокрутку до конца — сумма < 0.02 (телефон 390 и 1440).
- **Ссылки:** все внутренние `href` на новых страницах отвечают не `404`.

- [ ] **Step 1: Write the failing tests** (часть уже проходит после Task 3–8 — тогда это фиксация, а не RED; это отмечается в коммите).
- [ ] **Step 2–4:** правки по найденному → GREEN. Полный прогон `pnpm turbo run lint typecheck test build` и `pnpm --filter @yoyo/web e2e`.
- [ ] **Step 5: Commit.** `test(web): every new page fits phones, passes axe in both themes and respects reduced motion`.

---

### Task 10: Документация

**Files:**
- Modify: `README.md` (раздел «Главная и служебные страницы»: адреса, где тексты, как обновить юридические документы, что требует юриста, реквизиты оператора), `docs/superpowers/plans/2026-11-03-yoyo-roadmap.md` (строка 12: ссылка на план и статус).

- [ ] **Step 1:** Ручная проверка Lighthouse (телефон) для `/` и `/privacy` в обеих темах, результаты в описание PR.
- [ ] **Step 2: Commit.** `docs: landing and service pages, legal texts and SEO`.

---

## Действия владельца (после слияния)

1. Дать юридические реквизиты оператора (имя или название, рег. номер, адрес) — вписать в `src/content/legal/operator.ts`.
2. **Перед коммерческим запуском** (настоящие платежи и комиссия) отдать условия, политику конфиденциальности и cookies юристу; отдельно проверить договоры обработки данных (DPA) с Vercel, Render, Neon, Resend, Cloudinary, ImprovMX и GoDaddy и механизм передачи данных за пределы ЕЭЗ.
3. Проверить, что `SITE_ORIGIN=https://yoyo.rent` задан в Vercel Production (от него зависят canonical, hreflang и sitemap).
4. Добавить сайт в Google Search Console и отправить `https://yoyo.rent/sitemap.xml`.

## Self-Review (выполнено при написании)

- **Покрытие задачи и спецификации:**
  - главная в полной подаче `DESIGN.md` (шрифт, бумага, контуры, лента, наклейки, бегущая строка; разделы «что это», «как проходит аренда» с двух сторон, безопасность, категории из API, FAQ, финальный призыв) — Task 2, 4;
  - «Как это работает», FAQ — Task 5, 6; условия, конфиденциальность (GDPR: данные, цели, сроки, права, удаление, обработчики), cookies — Task 7; подвал со ссылками, контактом, языком и темой — Task 3;
  - движение (покой, отклик под курсором, появление секций без скрытия текста, переходы как у смены языка, 150–450 мс, reduced motion, CLS, только transform/opacity) — Task 2, 9; Lighthouse — Task 10;
  - SEO (метаданные и OG по странице и языку, hreflang, sitemap, robots, JSON-LD Organization, WebSite, FAQPage) — Task 1, 6, 8;
  - обе темы, 320/390, axe — Task 9.
- **Отступления от спецификации:** §4.1 упоминает на главной «поиск», «популярное рядом» и отзывы. Каталога и отзывов ещё нет (планы 7 и 10), а выдуманные данные запрещены, поэтому этих блоков нет. Они добавляются в планах 7 и 10 на это же место.
- **Согласованность имён:** `SITE_URL`, `PAGES`, `LIST_ITEM_HREF`, `localizedPath`, `alternates`, `pageMetadata`, `JsonLd`, `switchPage`, `TransitionLink`, `Ribbon`, `StickerCluster`, `loadCategories`, `LegalDoc`, `LegalDocument`, `FaqList`, `PageBanner` одинаковы во всех задачах.
