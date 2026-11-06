# Yoyo — План 7: Каталог и карточка вещи. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Любой посетитель может:
- искать вещи строкой с подсказками (категории и названия, с опечатками и без диакритики: «velosipeds» находит «Velosipēds»);
- сужать выдачу фильтрами: категория и подкатегория, цена в день (от и до), максимальный залог, состояние, свободные даты, город и район; сортировать (новые, дешевле, дороже, подходящие);
- делиться выдачей ссылкой: все фильтры, сортировка, страница и вид живут в URL;
- переключаться между списком и картой (`?view=map`); карта показывает только примерное место, не точку;
- открыть карточку вещи: галерея с полноэкранным просмотром, характеристики, правила, район, календарь занятости, калькулятор суммы за выбранные дни, блок владельца, похожие вещи, «Запросить бронь»;
- открыть публичный профиль владельца: имя, город, «на сайте с…», подтверждения, число сделок, рейтинг (пока «нет отзывов»), его вещи.

Поисковики видят у каждой вещи один адрес — на языке, на котором она написана, а страницы категорий получают адреса на языке посетителя (`/c/tools`, `/lv/c/instrumenti`, `/ru/c/instrumenty`). Адреса и правила индексации — по карте сайта W03 (`docs/hitexis/W03-sitemap-urls.md`, §D, §G, §H, §J; ветка `docs/hitexis-w03`).

Вошедший человек добавляет вещи в избранное сердечком (сразу, без ожидания ответа API) и видит их на `/dashboard/favorites`.

Всё по `DESIGN.md`, на EN/LV/RU, в светлой и тёмной теме, на 320 и 390 px и на компьютере.

**Architecture:**
- **API: модули `catalog`, `favorites`, `profiles`.** Только чтение опубликованного. Вещь видна в каталоге, если она `PUBLISHED`, у неё есть цена и владелец не заблокирован и не удалён — то же правило, что у `bookableListing` (план 8), вынесенное в общее условие `CATALOG_VISIBLE`.
- **Поиск — PostgreSQL без внешних сервисов** (спецификация §5): расширения `pg_trgm` и `unaccent` (есть в Neon и в образе `postgres:17`). Миграция `catalog` добавляет неизменяемую обёртку `yoyo_fold(text)` = `lower(unaccent(text))` и GIN-индексы по триграммам на `yoyo_fold(title)` и `yoyo_fold(title || ' ' || description)`. Совпадение: подстрока или триграммное сходство (`%`, порог `word_similarity` 0.35) по сложенному тексту, плюс вещи из категорий, чьё имя на любом из трёх языков совпало с запросом. Ранг — `word_similarity` по названию, затем по описанию. Запросы строятся `Prisma.sql` с параметрами, никакой склейки строк.
- **Свободные даты.** Вещь подходит, если ни бронь (`Booking.reserved && daterange(start, end + 1)`), ни закрытый владельцем период не задевают ни одного выбранного дня, а число дней укладывается в её `minDays…maxDays`. Тот же смысл, что у `blockedPeriods` плана 8, одним SQL-условием `NOT EXISTS`.
- **Примерное место на карте.** Точка (`lat`, `lng`) остаётся у владельца и администратора (план 6). Карта получает центр ячейки сетки 0,01° (~1,1 × 0,6 км в Риге), посчитанный в SQL (`floor(lat * 100) / 100 + 0.005`): точнее района не выдать никак, и вещи одной ячейки собираются в одну метку с числом.
- **Избранное** — таблица `Favorite (userId, listingId)` с составным ключом; `PUT` и `DELETE` идемпотентны (204), поэтому повтор после обрыва сети ничего не ломает.
- **Сайт: страницы каталога, вещи и профиля рисует сервер** (Server Components, `fetch` к API с `cache: 'no-store'` и тайм-аутом 10 с): поисковики видят содержимое, при первом показе нет скачка вёрстки, а переход между каталогом и вещью анимируется уже на готовой странице. Фильтры меняют URL через `router.replace` внутри `startTransition`; пока сервер отвечает, выдача приглушается (`aria-busy`), а не исчезает.
- **Личное — в браузере.** Сердечки, «Запросить бронь» и избранное зависят от сессии, поэтому идут через TanStack Query по своему домену (`/api/v1/...`), как в планах 5 и 6b. Список id избранного (`GET /me/favorites/ids`) — один запрос на всю страницу; гость запросов не делает.
- **Калькулятор — из ядра.** Карточка вещи получает с сервера цены, занятые дни, процент сбора и `maxAdvanceDays`; калькулятор считает сумму `quote` из `@yoyo/domain` и проверяет даты `validateRentalPeriod` и `firstConflict` прямо в браузере, без запроса на каждый клик. Окончательно цену и даты проверяет API при запросе брони (`POST /bookings`).
- **Переходы.** `ViewTransition` из React 19.3 (`experimental.viewTransition` в `next.config.ts`): обложка карточки каталога и главное фото страницы вещи носят одно имя `listing-photo-<id>`, поэтому фото «перелетает» на своё место. При `prefers-reduced-motion` анимации выключены глобальным правилом из плана 1.
- **Адреса (W03 §B, §D).** `/c` — все категории; `/c/{slug}` — категория или подкатегория (плоский путь, slug на языке страницы из таблицы W03 §D, EN = ключ `slug`); `/search?q=` — поиск по всему каталогу (`noindex, follow`); `/listings/{id}-{slug}` — вещь (slug из названия на языке объявления, ASCII, до 60 символов; неверный или пустой slug → 301 на правильный); `/u/{id}` — профиль. Конструктор остаётся на `/listings/new` и `/listings/{id}/edit`.
- **Параметры (W03 §H)** — только `q`, `page`, `price_min`, `price_max` (целые евро), `from`, `to`, `district` (slug района), `sort` (`new`, `price_asc`, `price_desc`), `view=map`; прочие (`utm_*`, `gclid`…) не читаются и не попадают в canonical. Поэтому фильтров залога, состояния и города в этом плане нет (город один, страницы городов W03 не создаёт).
- **Недоступная вещь (W03 §G):** удалена (`ARCHIVED`, владелец удалён) → `410`; никогда не публиковалась → `404`; временно скрыта (скрыта, на повторной модерации, владелец заблокирован) → `200`, `noindex` и «Вещь сейчас недоступна» с похожими вещами. Статус и slug решает proxy сайта одним лёгким запросом `GET /catalog/listings/:id/address`, потому что страница Next не умеет отвечать 301 и 410.
- **Дерево категорий C02** (`docs/hitexis/C02-categories.md`, утверждено владельцем 2026-11-06) заменяет дерево плана 6 и таблицу slug W03 §D: 11 корней, 62 подкатегории, названия и slug на трёх языках в `catalog-data.ts`. Наборы характеристик переходят к ближайшей новой подкатегории. Объявления старых категорий переезжают один раз (`LEGACY_CATEGORIES`, версия `CATALOG_VERSION` в `Setting`): `power-tools` → `drills-drivers`, `strollers-car-seats` → `strollers`, `event-tents-furniture` → `event-tents`, `home-cleaning` → `vacuum-cleaners`, `travel-gear` → `backpacks`, `car-tools` → `battery-chargers` и т. д.; остаются только значения характеристик, которые знает новая категория; объявление никогда не остаётся без категории.
- **Навигация (W03 §E):** хлебные крошки «Главная › Каталог › Категория › Подкатегория › Вещь» по иерархии категорий; в шапке «Каталог» — мега-меню с обычными ссылками `<a>` на 9 корневых категорий и 2–3 подкатегории каждой (на телефоне — аккордеон).
- **SEO** (решение владельца от 2026-11-06 и W03 §G, §J, Task 10):
  - у объявления есть язык текста `contentLocale` (`en | lv | ru`): автор выбирает его в конструкторе, по умолчанию — язык сайта, на котором создан черновик;
  - страница вещи есть на всех трёх языках сайта, но `<link rel="canonical">` у каждой ведёт на адрес на `contentLocale`; `hreflang`-вариантов у страниц вещей нет; в sitemap — только канонические адреса вещей; `<html lang>` и JSON-LD `Product`/`Offer` — на `contentLocale` (интерфейсные блоки страницы помечены `lang` языка сайта);
  - публичный профиль — то же правило, канонический адрес английский, без `hreflang`;
  - страница категории — `noindex, follow`, пока в ней меньше 3 вещей в каталоге;
  - адрес каталога с фильтрами (`?priceMax`, `?start`…) канонически указывает на «голую» страницу категории (или `/catalog`);
  - у категории стабильный `id` и `slug` (ключ) плюс свой slug на каждом языке (`slugs: { en, lv, ru }`); страница категории — `/c/<slug языка>`, чужой slug перенаправляет (308) на свой. Сейчас slug строится из названия (латиница, русский транслитом); точный список придёт из карты сайта W03 и ляжет в `catalog-data.ts` без смены механизма.
  - **`hreflang` — в HTTP-заголовке `Link` (W02 §F).** next-intl ставит его сам с тем же путём на всех языках. Proxy сайта убирает его у вещей и профилей и подменяет у категорий на варианты с их slug (дерево категорий кэшируется в proxy на 5 минут); у остальных страниц он остаётся как есть.
  - адреса с фильтрами, сортировкой и картой — `noindex, follow`, canonical на категорию без параметров; `?page=N` — индексируется, canonical на себя с `page`; поиск — `noindex, follow`; пустой профиль (нет вещей) — `noindex`;
  - `sitemap.xml` — индекс из `sitemap-pages.xml` (главная, `/c` × 3 языка), `sitemap-categories.xml` (только категории с ≥ 3 вещами, × 3 языка со своими slug) и `sitemap-listings.xml` (канонические адреса вещей); только `<loc>` и `<lastmod>`.
- **Анимации.** Ветка `feat/motion` с общими примитивами в `apps/web/src/components/motion/` на момент плана не влита, поэтому анимации остаются локальными: CSS и токены `ease-yoyo`, `--dur-*` из `tokens.css`. Когда примитивы появятся, сердечко и раскрытие фильтров переводятся на них отдельным PR.

**Tech Stack:**
- уже есть: NestJS 11, Prisma 7, zod, `@yoyo/domain`, Next.js 16, next-intl 4, Tailwind 4, TanStack Query, Leaflet 1.9 (план 6b), Vitest, Playwright с axe;
- новое: расширения PostgreSQL `pg_trgm` и `unaccent`. Новых npm-пакетов нет.
- **Карта — Leaflet, а не MapLibre.** Leaflet уже стоит (план 6b), весит около 40 КБ gzip против ~220 КБ у MapLibre, и бесплатные растровые плитки OSM ему подходят. Грузится динамически, только когда открыт вид «Карта».

**Spec:** [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](../specs/2026-11-03-yoyo-design.md):
- §4.1 «Каталог», «Карточка вещи», «Публичный профиль пользователя»;
- §4.2 «Избранное»;
- §4.9 (состояния, темы, телефон, доступность);
- §5 (поиск: полнотекстовый PostgreSQL и `pg_trgm`);
- §6 (`Favorite`);
- §7 (маршруты `/catalog` и `?view=map`, `/listings/[id]` (`/listings/{id}-{slug}`), `/u/[id]`, `/dashboard/favorites`);
- §8 (карточки наклоняются, фото приближается, сердечко лопается искрами, фильтры переключаются с откликом).

API объявлений — [план 6](./2026-11-04-yoyo-06-listings-api.md), экраны — [план 6b](./2026-11-05-yoyo-06b-listings-ui.md), сделки — [план 8](./2026-11-05-yoyo-08-deals-api.md). Все слиты.

## Global Constraints

**Общие**
- Действуют правила планов 1, 5, 6, 6b и 8: TypeScript strict, формат ошибок `{ error: { code, message, fields? } }`, `Clock`, три языка с одинаковым набором ключей, политика pnpm, бюджет ноль.
- **Публичное — только публичное.** Ответы каталога, карточки и профиля строятся по полям поштучно, как `serializeListing(..., 'public')`: нет `lat`, `lng`, `rejectionReason`, `version`, почты и телефона владельца. Проверка — тестом сериализатора и e2e по сырому JSON.
- **Невидимое не существует.** Черновик, скрытая, удалённая, отклонённая вещь и вещь заблокированного владельца отвечают `404 NOT_FOUND` в карточке и не попадают в поиск, подсказки, карту, профиль и чужое избранное. В своём избранном такая вещь показывается как «Больше недоступна» с кнопкой убрать.

**Параметры каталога**
- **API** (`CatalogQuerySchema` в `@yoyo/shared`): `q` — до 100 символов после очистки; `category` — ключ `slug`, включает подкатегории; `priceMin`, `priceMax` — центы в день; `start`, `end` — `YYYY-MM-DD`, только вместе, `start` не раньше сегодня по Риге, не дальше `maxAdvanceDays`, не длиннее 365 дней; `district` — slug района (`slugify`); `sort` — `new` (по умолчанию), `price_asc`, `price_desc`, `relevance` (по умолчанию при `q`); `page` — с 1, по 24 вещи. Неверный параметр — `400 VALIDATION_FAILED` с `fields`.
- **Адрес сайта** — только параметры W03 §H (`q`, `page`, `price_min`, `price_max` в целых евро, `from`, `to`, `district`, `sort`, `view`); `parseCatalogParams` / `catalogSearch` — единственные функции, которые читают и пишут адрес и переводят его в запрос API. Неверные параметры молча отбрасываются (старая или испорченная ссылка не должна давать ошибку), неизвестные не читаются.

**SEO**
- Абсолютные адреса строятся от `SITE_ORIGIN` (как перенаправления плана 5), без него — от `http://localhost:3000` (`metadataBase`). Одна функция `seo.ts` считает canonical, `hreflang` и `robots` для каждого типа страницы, страницы её только вызывают.
- `contentLocale` — поле условий, а не содержания: его смена не отправляет опубликованную вещь на модерацию.
- Закрытые экраны (вход, конструктор, кабинет, избранное, админка) остаются `noindex` и в sitemap не попадают.

**Ограничения частоты**
- Подсказки `GET /catalog/suggest` — 120 в минуту на адрес (ходит браузер через прокси сайта с `PROXY_SECRET`, адрес настоящий).
- Каталог, карточку и профиль запрашивает сервер сайта напрямую (адрес Vercel), поэтому лимита по адресу у них нет: это чтение по индексам. Избранное — 120 изменений в минуту на пользователя.

**Дизайн** (`DESIGN.md` §1, §3, §4, §7)
- Рабочие экраны спокойнее главной: холст `canvas`, карточки `surface` с контуром 1px, пилюли, дисплейный шрифт только в заголовке экрана через `text-display-fit` и `displayFit`. Наклейка — только в пустых состояниях («Ничего не нашли»).
- Фото всегда в рамке 1px с радиусом от 14px, с заранее заданным соотношением 4:3 (`aspect-[4/3]`), чтобы загрузка картинки ничего не сдвигала. Скелетоны повторяют размеры настоящих карточек.
- **Микровзаимодействия:** карточка наклоняется, как наклейка, фото приближается; сердечко «лопается» (масштаб 1 → 1.35 → 1 и шесть искр из палитры наклеек, 450 мс); фильтр-пилюли отвечают подъёмом и нажатием; панель фильтров на телефоне выезжает снизу; метка карты подпрыгивает при наведении; переход каталог → вещь — общий элемент фото. Длительности 150–450 мс, кривая `ease-yoyo`, при `prefers-reduced-motion` всё выключено.
- Длинные слова LV и RU (`Elektroinstrumenti`, `Электроинструменты`, `Pieejamība`) переносятся (`[overflow-wrap:anywhere]`, `hyphens: auto`) и не раздвигают пилюли, карточки и кнопки на 320 px.

**Доступность (WCAG 2.2 AA в обеих темах)**
- **Поиск** — комбобокс WAI-ARIA 1.2 (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, список `listbox` с группами «Категории» и «Вещи»): стрелки, Enter, Esc (закрыть, второй Esc — очистить), Home/End в поле не перехватываются. Число подсказок объявляется в `aria-live="polite"`. Enter без выбранной подсказки ищет введённый текст.
- **Календари** (фильтр дат и календарь вещи) — таблица-сетка, как в плане 6b: стрелки, Home/End, PageUp/PageDown, Enter и пробел; занятые дни зачёркнуты, отмечены «занято» в имени и `aria-disabled`; выбранный период — `aria-pressed` и не только цветом (заливка + контур + надпись «начало» / «конец» для читалок).
- **Карта** не единственный путь: в виде «Карта» под картой (на компьютере — рядом) тот же список карточек; метки — фокусируемые кнопки Leaflet с названием и ценой.
- Сердечко — `button` с `aria-pressed` и именем «Добавить в избранное: <название>».
- Фокус после смены фильтра остаётся на элементе фильтра; число найденного объявляется в `aria-live`. Цели нажатия не меньше 40px (44px у основных на телефоне).

**Ошибки**
- Тексты из `errors.<CODE>`. API каталога недоступен (сервер сайта не дождался ответа) — экран ошибки Yoyo с «Попробовать снова», не пустая выдача.
- Ошибка сердечка возвращает прежнее состояние и показывает тост.
- Запрос брони: `401` — переход на вход с `next` обратно на вещь; ошибки дат (`DATES_UNAVAILABLE`, `PERIOD_TOO_SHORT`…) — текст у календаря.

## Review Focus

1. **Утечка точки и скрытого.** Сырые ответы каталога, карты, карточки, профиля и избранного не содержат `lat`, `lng` (в карте — только центр ячейки 0,01°), почты и телефона владельца. Черновик, скрытая вещь и вещь заблокированного владельца — 404 в карточке и нет в поиске, подсказках и профиле. Тест в Task 2, 3, 4 и e2e Task 11.
2. **SQL.** Поисковый запрос, фильтры и сортировка — только параметры (`Prisma.sql`); строка `q` вида `'; DROP TABLE` или `%_` находит то, что написано, а не всё. Тест в Task 2.
3. **Свободные даты.** Вещь с бронью на 10–12-е не находится для 11–13-го, находится для 13–15-го; закрытый владельцем день действует так же; отменённая бронь (`reserved IS NULL`) дни не держит; период короче `minDays` вещи её не находит. Тест в Task 2.
4. **Калькулятор совпадает с API.** Сумма в калькуляторе для 7 дней со скидкой 10 % и сбором 10 % — ровно та, что даёт `GET /listings/:id/quote`; дни поперёк брони не дают «Запросить бронь». Тест в Task 7 и e2e Task 11.
5. **Оптимистичное сердечко.** Нажатие сразу меняет вид; ошибка API возвращает прежний; два быстрых нажатия кончаются тем, что нажато последним; гость попадает на вход и после него возвращается на ту же страницу. Тест в Task 8.
6. **SEO-вывод.** Страница вещи на `contentLocale = lv`, открытая по `/listings/:id-:slug` и `/ru/listings/:id-:slug`: canonical `…/lv/listings/:id-:slug` в обоих случаях, нет `<link rel="alternate" hreflang>` и нет заголовка `Link` с `rel="alternate"`, `<html lang="lv">`, JSON-LD с тем же адресом. Категория с 2 вещами — `noindex, follow`, с 3 — без `noindex`; `?priceMax=…` — canonical на `/c/<slug>`; `/lv/c/tools` → 308 на `/lv/c/instrumenti`; sitemap содержит один адрес на вещь. Тест в Task 10 (модули и e2e).
7. **Комбобокс и календарь с клавиатуры, телефон, языки.** Весь путь «каталог → фильтр → вещь → калькулятор» проходится без мыши; на 320 и 390 px нет горизонтальной прокрутки на всех трёх языках; axe без serious и critical в обеих темах. Тест в Task 11.

---

## Структура файлов (итог плана)

```
packages/shared/src/catalog.ts                         CatalogQuerySchema, CatalogItem, CatalogPage, MapPin, Suggestion, ItemDetail, PublicProfile, favorites (+ test)
apps/api/prisma/schema.prisma (+ migration catalog)    Favorite; pg_trgm, unaccent, yoyo_fold, индексы
apps/api/src/catalog/{catalog.module,catalog.controller,catalog.service,catalog-query.ts,catalog.serializer}.ts (+ tests)
apps/api/src/catalog/visibility.ts                     CATALOG_VISIBLE (общее с bookableListing)
apps/api/src/favorites/{favorites.module,favorites.controller,favorites.service}.ts
apps/api/src/profiles/{profiles.module,profiles.controller,profiles.service}.ts
apps/api/test/{catalog.search,catalog.item,favorites,profiles}.e2e.test.ts
apps/web/src/lib/catalog/{params.ts,server-api.ts,queries.ts,use-favorites.ts,suggest.ts,calculator.ts,range.ts} (+ tests)
apps/web/src/components/catalog/{CatalogPage,SearchBox,Filters,FilterSheet,ActiveFilters,SortSelect,ResultsGrid,ListingCard,CardSkeleton,Pagination,ViewSwitch,CatalogMap,EmptyResults}.tsx
apps/web/src/components/catalog/{HeartButton,RangeCalendar,PriceRange}.tsx
apps/web/src/components/item/{ItemPage,Gallery,GalleryDialog,AttributesList,RulesList,BookingPanel,PriceBreakdown,OwnerCard,SimilarItems}.tsx
apps/web/src/components/profile/ProfilePage.tsx · apps/web/src/components/favorites/FavoritesList.tsx
apps/web/src/app/[locale]/{catalog/page.tsx,catalog/loading.tsx,items/[id]/page.tsx,items/[id]/not-found.tsx,users/[id]/page.tsx,dashboard/favorites/page.tsx}
apps/web/messages/{en,lv,ru}.json                      catalog, item, profile, favorites, calendar (общий)
apps/web/src/lib/seo.ts · apps/web/src/app/{sitemap.ts,robots.ts} · apps/web/src/app/[locale]/c/[slug]/page.tsx
apps/web/e2e/{catalog.spec.ts,catalog-a11y.spec.ts,seo.spec.ts} · fit-on-phones.spec.ts (новые экраны)
```

---

### Task 1: Общие схемы каталога и избранное в базе

**Files:**
- Create: `packages/shared/src/catalog.ts`, `apps/api/prisma/migrations/<ts>_catalog/migration.sql`.
- Modify: `packages/shared/src/index.ts`, `apps/api/prisma/schema.prisma` (`Favorite`, связи у `User` и `Listing`).
- Test: `packages/shared/src/catalog.test.ts`.

**Interfaces:**
- **`CatalogQuerySchema`** (Global Constraints; после W03 без `depositMax`, `condition` и `city`, `district` — slug) — `z.object` с `z.coerce` для чисел, `condition` из строки через запятую в массив, `superRefine`: `start` и `end` вместе, `end ≥ start`, `priceMin ≤ priceMax`, не больше 365 дней. Даты против «сегодня» проверяет API (нужен `Clock`).
- **`CatalogItem`**: `id, title, dailyCents, weeklyDiscountPercent, depositCents, condition, city, district, categoryId, cover: PhotoUrls | null, ownerId, publishedAt`.
- **`CatalogPage`**: `{ items: CatalogItem[], total, page, pageSize: 24 }`.
- **`MapPin`**: `{ lat, lng, count, items: { id, title, dailyCents, cover }[] }` — центр ячейки, до 5 вещей в подсказке метки; `MapResponse`: `{ pins: MapPin[], total, truncated }` (не больше 500 вещей).
- **`Suggestion`**: `{ kind: 'category', slug, names, sticker } | { kind: 'listing', id, title, cover }`; `SuggestResponse`: `{ categories: …[] (≤3), listings: …[] (≤5) }`.
- **`ItemDetail`**: `{ listing: PublicListing, owner: OwnerSummary, blocked: DatePeriod[], booking: { servicePercent, maxAdvanceDays, today } }`; `OwnerSummary`: `{ id, name, city, memberSince, emailVerified, phoneVerified, completedDeals, rating: null, listingCount }`.
- **`PublicProfile`**: `{ user: OwnerSummary & { about }, listings: CatalogItem[] }`.
- **`FavoriteIdsResponse`**: `{ ids: string[] }`; `FavoritesResponse`: `{ items: (CatalogItem & { available: boolean })[] }`.
- **Модель:** `Favorite { userId, listingId, createdAt, @@id([userId, listingId]), @@index([listingId]) }`, каскадное удаление от обоих.
- **Миграция `catalog`:** `CREATE EXTENSION IF NOT EXISTS pg_trgm; … unaccent;`, функция `yoyo_fold(text) RETURNS text IMMUTABLE PARALLEL SAFE STRICT` (`lower(public.unaccent('public.unaccent'::regdictionary, $1))`), индексы `Listing_title_trgm` и `Listing_text_trgm` (GIN, `gin_trgm_ops`) и `Listing_catalog_idx (status, publishedAt DESC)`. Индексы по выражениям Prisma не описывает, поэтому они только в SQL; `prisma migrate diff` после миграции пуст (проверяется в Step 4).

- [ ] **Step 1: Write the failing tests**

```ts
// catalog.test.ts
parse({ priceMin: '500', condition: 'NEW,GOOD' }) → { priceMin: 500, condition: ['NEW','GOOD'], page: 1 }
parse({ start: '2026-12-01' }) → ошибка поля end;   parse({ start: '2026-12-05', end: '2026-12-01' }) → ошибка end
parse({ priceMin: '900', priceMax: '100' }) → ошибка priceMax;   parse({ q: '<b>drill</b>' }).q → 'drill'
parse({ sort: 'cheapest' }) → ошибка sort;   сам период длиннее 365 дней → ошибка end
```

- [ ] **Step 2–4:** RED → реализация → GREEN; `prisma migrate deploy` на тестовой базе и `prisma migrate diff --from-migrations --to-schema-datamodel` без расхождений.
- [ ] **Step 5: Commit.** `feat(shared,api): catalog query schema, favourites table and trigram search indexes`.

---

### Task 2: Поиск и фильтры в API

**Files:**
- Create: `apps/api/src/catalog/{catalog.module,catalog.controller,catalog.service,catalog-query.ts,catalog.serializer,visibility}.ts`.
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/bookings/listing-access.ts` (общее условие видимости), `apps/api/src/common/rate-limits.ts`.
- Test: `apps/api/test/catalog.search.e2e.test.ts`, `apps/api/src/catalog/catalog-query.test.ts`.

**Interfaces:**
- **`GET /catalog/listings?…`** (публично) → `CatalogPage`. `catalog-query.ts` собирает `WHERE` и `ORDER BY` из разобранного запроса (`Prisma.Sql`), сервис делает два запроса: страница и `count(*)`. Порядок с `id` последним ключом, чтобы страницы не перемешивались.
- **`GET /catalog/map?…`** — те же фильтры → `MapResponse`: группировка по ячейке 0,01° в SQL, точка не выходит из базы.
- **`GET /catalog/suggest?q=&lang=`** — от 2 символов; категории по `yoyo_fold(names->>lang)` и по всем трём языкам, вещи по названию; `RATE_LIMITS.suggest(ip)` 120/мин.
- **`GET /catalog/places`** → `{ districts: { district, slug, count }[] }` по видимым вещам, для выбора района; фильтр `district` — slug, сервис переводит его в названия районов с тем же `slugify`.
- `CATALOG_VISIBLE` = `status = 'PUBLISHED' AND dailyCents IS NOT NULL AND owner не заблокирован и не удалён`; `bookableListing` пользуется тем же определением (одно место правды).
- Ответы `Cache-Control: no-store` (как всё API): выдача меняется с каждой бронью.

- [ ] **Step 1: Write the failing tests**

```ts
// catalog.search.e2e.test.ts (seedListing из test/support/listings.ts)
// видимость: DRAFT, HIDDEN, REJECTED и вещь заблокированного владельца не находятся (Review Focus 1)
// q: 'drill' находит «Bosch cordless drill»; 'dril' (опечатка) тоже; 'velosipeds' находит «Velosipēds pilsētai»;
//    'Электроинструмент' находит вещь из power-tools по имени категории; '%_' и "'; DROP TABLE" — ничего и без ошибки (Review Focus 2)
// category=tools находит вещь из подкатегории power-tools; priceMin/priceMax/depositMax/condition сужают
// даты: бронь 10–12 → 11–13 нет, 13–15 есть; закрытые дни так же; отменённая бронь не мешает; 2 дня при minDays 3 — нет (Review Focus 3)
// start в прошлом → 400 fields.start; city=Rīga&district=Centrs; sort=price_asc и price_desc; page=2 по 24; total
// ответ без lat, lng, version, rejectionReason; map: центр ячейки, две вещи одной ячейки — одна метка count 2
// suggest: 'ele' → категория Electronics и вещи; 121-й запрос с одного адреса за минуту → 429
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): catalog search with typo-tolerant text, filters, free dates and an approximate map`.

---

### Task 3: Карточка вещи и публичный профиль в API

**Files:**
- Create: `apps/api/src/profiles/*`.
- Modify: `catalog.controller.ts`, `catalog.service.ts`, `app.module.ts`.
- Test: `apps/api/test/catalog.item.e2e.test.ts`, `apps/api/test/profiles.e2e.test.ts`.

**Interfaces:**
- **`GET /catalog/listings/:id/address`** → `{ slug, contentLocale }` (видимая и временно скрытая вещь) или `404 NOT_FOUND` (не публиковалась) / `410 LISTING_GONE` (удалена, владелец удалён) — для proxy сайта (W03 §G).
- **`GET /catalog/listings/:id`** → `ItemDetail` с `available: true`, или для временно скрытой — `available: false` и только название, категория и язык (без цены, фото, дат и владельца). `blocked` — `blockedPeriods()` плана 8 без прошедших; `booking.today` — сегодня в часовом поясе вещи по `Clock`; `servicePercent` и `maxAdvanceDays` из `BookingRulesService`. Невидимая вещь → 404.
- **`GET /users/:id`** → `PublicProfile`: вещи владельца из каталога, новые первыми, до 48. Заблокированный или удалённый — 404. `completedDeals` — сделки `COMPLETED`, где он владелец или арендатор; `memberSince` — месяц регистрации.

- [ ] **Step 1: Write the failing tests**

```ts
// catalog.item: опубликованная → listing без lat/lng, owner без email/телефона, blocked = бронь + закрытые дни, booking.servicePercent 10
//   черновик, скрытая, вещь заблокированного → 404 (Review Focus 1); прошедший закрытый период не в blocked
// profiles: имя, город, about, completedDeals 1 после завершённой сделки (support/deals.ts), только видимые вещи;
//   заблокированный → 404; ответ без email
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): public item page data with taken days and fee, and public profiles`.

---

### Task 4: Избранное в API

**Files:**
- Create: `apps/api/src/favorites/*`.
- Modify: `app.module.ts`, `rate-limits.ts`.
- Test: `apps/api/test/favorites.e2e.test.ts`.

**Interfaces** (всё под `AuthGuard`):
- `PUT /me/favorites/:listingId` → 204; вещь не видна в каталоге → 404; своя вещь — можно (ничего не ломает).
- `DELETE /me/favorites/:listingId` → 204, даже если её не было.
- `GET /me/favorites/ids` → `{ ids }` — только видимые.
- `GET /me/favorites` → `{ items }` новые первыми, невидимые с `available: false` и без цены и фото владельца.
- `RATE_LIMITS.favorite(userId)` 120/мин.

- [ ] **Step 1: Write the failing tests**

```ts
// дважды PUT → одна запись, 204 оба раза; DELETE несуществующей → 204; гость → 401
// PUT черновика чужого → 404 (вещь не существует для него); после скрытия вещи ids её не содержит, а список — available: false
// B не видит избранное A; 121-е изменение за минуту → 429
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(api): favourites with idempotent add and remove`.

---

### Task 5: Клиент, параметры адреса, серверные запросы

**Files:**
- Modify: `apps/api/openapi.json`, `packages/api-client/src/schema.d.ts`, `apps/web/next.config.ts` (`experimental.viewTransition`).
- Create: `apps/web/src/lib/catalog/{params.ts,server-api.ts,queries.ts}`.
- Test: `params.test.ts`, `server-api.test.ts`.

**Interfaces:**
- **`parseCatalogParams(searchParams): CatalogParams`** — через `CatalogQuerySchema` по одному полю: неверное поле отбрасывается, остальные остаются; `view: 'list' | 'map'`.
- **`catalogSearch(params, patch): string`** — новый `?…` с изменёнными полями; любое изменение фильтра сбрасывает `page`; значения по умолчанию (`sort` без `q` = `new`, `view=list`, `page=1`) в адрес не пишутся, поэтому у одной выдачи один адрес.
- **`serverApi`** — `createApiClient(API origin)` с `fetch`, у которого `cache: 'no-store'` и `AbortSignal.timeout(10_000)`; `serverGet(path, params)` возвращает `{ data } | { notFound } | { error }`.
- **`queries.ts`:** `useSuggestions(q)` (только в браузере), ключи `['catalog', …]`.

- [ ] **Step 1: Write the failing tests**

```ts
// params.test.ts: '?priceMin=abc&category=tools' → { category: 'tools' } без priceMin; '?start=2026-12-01' без end → без дат
//   catalogSearch({ category:'tools', page:3 }, { priceMax: 2000 }) → '?category=tools&priceMax=2000' (page сброшена)
//   sort=new и view=list не пишутся; condition — 'NEW,GOOD'
// server-api.test.ts: 404 → { notFound: true }; тайм-аут → { error } (фальшивый fetch)
```

- [ ] **Step 2–4:** RED → реализация → GREEN; `openapi:emit` и `generate`, в CI проверка расхождения зелёная.
- [ ] **Step 5: Commit.** `feat(web): catalog URL params, server-side API calls and the regenerated client`.

---

### Task 6: Страница каталога: поиск, фильтры, выдача, карта

**Files:**
- Create: `apps/web/src/app/[locale]/catalog/{page.tsx,loading.tsx}`, `apps/web/src/components/catalog/*` (кроме `HeartButton`), `apps/web/src/lib/catalog/{suggest.ts,range.ts}`.
- Modify: `SiteHeader.tsx` (ссылка «Каталог»), `messages/*.json`.
- Test: рядом с компонентами.

**Interfaces:**
- **`/c`, `/c/[slug]` и `/search`** (сервер): `/c` — плитки корневых категорий с подкатегориями; `/c/[slug]` и `/search` — один компонент выдачи; категория берётся из пути (slug языка страницы, Task 10), остальные фильтры — из адреса (W03 §H); выбор категории в фильтрах ведёт на `/c/<slug>` с сохранением остальных фильтров. Разбирает адрес, запрашивает `GET /catalog/listings` (или `/catalog/map` для `view=map`), категории и места; ошибка API — `ErrorView` с повтором. `generateMetadata`: заголовок по запросу и категории.
- **`SearchBox`** — комбобокс (Global Constraints) поверх `GET /catalog/suggest`: 200 мс после ввода от 2 символов, `AbortController` отменяет прежний запрос, кэш ответов на сессию. Категория — переход с `category`, вещь — на `/listings/:id-:slug`, Enter — поиск текста. Кнопка «Найти» и очистка.
- **`Filters`** — на компьютере колонка слева, на телефоне кнопка «Фильтры (N)» открывает `FilterSheet` (диалог снизу, фокус заперт, «Показать N вещей»). Состав: категории (пилюли-наклейки верхнего уровня, затем подкатегории), `PriceRange` (два поля «от / до» в евро через `parseEuros`), максимальный залог, состояние (флажки-пилюли), даты (`RangeCalendar` в раскрывающемся блоке), город и район (`<select>` по `/catalog/places`). Изменение — `router.replace(catalogSearch(...), { scroll: false })` в `startTransition`; текстовые поля — по `blur` и Enter.
- **`ActiveFilters`** — пилюли выбранного с крестиком и «Сбросить всё».
- **`SortSelect`** — `<select>`; «Подходящие» есть только при `q`.
- **`ResultsGrid`** — сетка 1/2/3/4 колонки; `aria-busy` и приглушение во время перехода; «Найдено N» в `aria-live`; `Pagination` — ссылки «Назад / Дальше» и «Страница 2 из 5».
- **`ListingCard`** — обложка 4:3 в `ViewTransition name="listing-photo-<id>"`, название (две строки, перенос), цена в день, скидка-наклейка, залог, район; ссылка на всю карточку, `Card interactive`; место для `HeartButton` (Task 8).
- **`ViewSwitch`** — «Список / Карта» (`aria-pressed`), меняет `view`.
- **`CatalogMap`** — динамический импорт Leaflet; метки-наклейки с ценой или числом (`divIcon`), по клику — всплывающая мини-карточка со ссылками; рамка карты по меткам; подпись OSM; `truncated` — «Показаны первые 500, уточните поиск».
- **`EmptyResults`** — наклейка, «Ничего не нашли», подсказки (убрать даты, расширить цену) и «Сбросить фильтры».
- **`loading.tsx`** — скелетоны тех же размеров (первый заход по ссылке).

- [ ] **Step 1: Write the failing tests**

```ts
// SearchBox.test.tsx: «dri» → один запрос через 200 мс (фальшивые таймеры); стрелка вниз → aria-activedescendant первой подсказки;
//   Enter на категории → router.replace('?category=power-tools'); Enter без выбора → '?q=dri'; Esc закрывает, второй Esc очищает;
//   быстрый ввод «d», «dr», «dri» → прежние запросы отменены, показан ответ последнего
// Filters.test.tsx: выбор категории → replace с category и без page; «от 5» «до 2» → ошибка поля, адрес не меняется;
//   N выбранных фильтров на кнопке «Фильтры (N)»
// ActiveFilters.test.tsx: крестик у цены убирает priceMin и priceMax; «Сбросить всё» оставляет только q
// ListingCard.test.tsx: длинное латышское название переносится (класс), нет lat/lng в разметке, ссылка /listings/:id-:slug
// EmptyResults.test.tsx: с датами — совет «уберите даты»
// range.test.ts: выбор начала, затем конца; конец раньше начала — становится новым началом; диапазон через занятый день — нельзя
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): catalog with suggestions, filters in the URL, list and map views`.

---

### Task 7: Страница вещи: галерея, календарь, калькулятор, владелец, похожие

**Files:**
- Create: `apps/web/src/app/[locale]/listings/[id]/{page.tsx,not-found.tsx}`, `apps/web/src/components/item/*`, `apps/web/src/components/catalog/RangeCalendar.tsx`, `apps/web/src/lib/catalog/calculator.ts`.
- Test: рядом.

**Interfaces:**
- **`/listings/[id]` (`/listings/{id}-{slug}`)** (сервер): `GET /catalog/listings/:id` и `GET /catalog/listings?category=<её>&…` для похожих (4, без неё самой); 404 → «Вещь не найдена или больше не сдаётся» со ссылкой в каталог. `generateMetadata`: название, описание, обложка для Open Graph.
- **`Gallery`** — главное фото 4:3 в `ViewTransition` с тем же именем, миниатюры-кнопки (`aria-current`), «Открыть на весь экран» → `GalleryDialog` (стрелки, Esc, счётчик «3 из 5», свайп на телефоне).
- **`calculator.ts`** — `priceFor({ listing, booking, start, end }): { ok: true, quote } | { ok: false, reason }`: `validateRentalPeriod` (сегодня из ответа, `maxAdvanceDays`, `minDays`, `maxDays`), `firstConflict` по `blocked`, `quote` с `servicePercent` — всё из `@yoyo/domain`; причины — коды ядра (`PERIOD_TOO_SHORT`, `PERIOD_TOO_LONG`, `START_IN_PAST`, `TOO_FAR_AHEAD`, `DATES_UNAVAILABLE`).
- **`RangeCalendar`** (общий с фильтром) — сетка плана 6b в режиме выбора периода: первый клик — начало, второй — конец; занятые дни зачёркнуты и выключены; период через занятый день не выбирается; наведение подсвечивает будущий период; два месяца на `md`, один на телефоне.
- **`BookingPanel`** — цена в день, скидка от 7 дней, залог; `RangeCalendar`; `PriceBreakdown` («15 € × 7 дней», «скидка −10 %», «аренда», «сбор Yoyo», «залог (вернётся)», «итого»; суммы `formatMoney` ядра); причина, почему нельзя; «Запросить бронь» → `POST /bookings` (гость — вход с `next`), успех — «Запрос отправлен владельцу, ответ придёт письмом». На телефоне панель — нижняя полоса «от 15 € в день · Выбрать даты», раскрывающая блок.
- **`AttributesList`**, **`RulesList`**, район с иконкой («Точный адрес владелец пришлёт после брони»), **`OwnerCard`** (инициалы, имя, город, «на сайте с», почта и телефон подтверждены — пилюли с иконкой, сделок N, «Отзывов пока нет», ссылка на профиль), **`SimilarItems`**.

- [ ] **Step 1: Write the failing tests**

```ts
// calculator.test.ts: 7 дней по 15 € со скидкой 10 % и сбором 10 % → rent 9450, fee 945, deposit 5000, total 15395 (как quote API, Review Focus 4)
//   2 дня при minDays 3 → PERIOD_TOO_SHORT; через занятый день → DATES_UNAVAILABLE; начало вчера → START_IN_PAST
// RangeCalendar.test.tsx: занятый день aria-disabled и «занято» в имени; Enter на начале и на конце → onChange({start,end});
//   PageDown — следующий месяц; конец раньше начала становится началом
// BookingPanel.test.tsx: без дат — «Выберите даты»; с датами — разбивка и итог; гость нажимает «Запросить бронь» → /login?next=/listings/:id-:slug
//   ответ 409 DATES_UNAVAILABLE → текст у календаря
// Gallery.test.tsx: миниатюра меняет главное фото; диалог: стрелка вправо — следующее, «2 из 3», Esc закрывает и возвращает фокус
// OwnerCard.test.tsx: нет почты и телефона владельца в разметке, «Отзывов пока нет», ссылка /users/:id
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): item page with a gallery, availability calendar and a price calculator from the domain rules`.

---

### Task 8: Сердечко и «Избранное»

**Files:**
- Create: `apps/web/src/components/catalog/HeartButton.tsx`, `apps/web/src/lib/catalog/use-favorites.ts`, `apps/web/src/components/favorites/FavoritesList.tsx`, `apps/web/src/app/[locale]/dashboard/favorites/page.tsx`.
- Modify: `ListingCard.tsx`, `ItemPage.tsx`, `UserMenu.tsx` («Избранное»), `SessionProvider` (ключи `['favorites', …]` очищаются при выходе, как остальные).
- Test: рядом.

**Interfaces:**
- **`useFavoriteIds()`** — `GET /me/favorites/ids` только для вошедшего, `staleTime` 60 с. **`useToggleFavorite()`** — `useMutation` с `onMutate`: отмена текущего запроса ids, снимок, новое множество в кэш; `onError` — снимок обратно и тост `errors.<CODE>`; `onSettled` — пересчитать ids и список. Мутации одного id выстраиваются по очереди (`scope: { id: 'favorite-<id>' }`), поэтому последнее нажатие побеждает.
- **`HeartButton({ listingId, title })`** — `aria-pressed`, имя «Добавить в избранное» / «Убрать из избранного» с названием; анимация «лопается» на включение (Global Constraints); гость → `/login?next=<текущий адрес>`.
- **`/dashboard/favorites`** (`RequireSession`): сетка `ListingCard`, недоступные — приглушённые с «Больше недоступна» и «Убрать»; пусто — наклейка и «Загляните в каталог».

- [ ] **Step 1: Write the failing tests**

```ts
// use-favorites.test.tsx (fakeApi): нажатие → сразу pressed, PUT ушёл; ответ 500 → снова не pressed и тост (Review Focus 5);
//   два быстрых нажатия → итог «не в избранном», последним ушёл DELETE
// HeartButton.test.tsx: гость → router.push('/login?next=%2Fcatalog%3Fq%3Ddrill'); aria-pressed и имя с названием
// FavoritesList.test.tsx: available: false → «Больше недоступна» и «Убрать»; пусто → ссылка в каталог
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): optimistic favourites heart and the favourites page`.

---

### Task 9: Публичный профиль

**Files:**
- Create: `apps/web/src/app/[locale]/users/[id]/page.tsx`, `apps/web/src/components/profile/ProfilePage.tsx`.
- Test: `ProfilePage.test.tsx`.

**Interfaces:**
- **`/u/[id]`** (сервер, `GET /users/:id`): шапка-карточка (большие инициалы на наклейке цвета по id, имя дисплейным шрифтом через `displayFit`, город, «на сайте с ноября 2026», подтверждения, «N сделок», рейтинг «Отзывов пока нет»), «О себе», вкладки «Вещи (N)» и «Отзывы» (`role="tablist"`, стрелки между вкладками; во второй — «Отзывов пока нет: они появятся после первых сделок»). 404 — «Профиль не найден».

- [ ] **Step 1: Write the failing tests**

```ts
// ProfilePage.test.tsx: вкладки — стрелка вправо переключает и фокусирует «Отзывы»; без вещей — пустое состояние;
//   месяц регистрации по языку («novembris 2026» для lv)
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat(web): public owner profile with listings and a rating placeholder`.

---

### Task 10: SEO: язык объявления, canonical, hreflang, robots, sitemap, slug категорий

**Files:**
- Modify: `apps/api/prisma/schema.prisma` + миграция `listing_locale` (`Listing.contentLocale String @default("en")`, `Category.slugs Json`), `packages/shared/src/{listings,categories}.ts` (`contentLocale` в черновике и ответах, `slugs` в `CategoryNode`), `apps/api/src/listings/*` (по умолчанию — язык автора), `apps/api/src/categories/{catalog-data,ensure-categories}.ts` (`slugify`, slug на каждом языке, уникальность), `apps/web/src/components/listings/steps/BasicsStep.tsx` (поле «Язык объявления»), `apps/web/src/lib/listings/use-listing-draft.ts` (`contentLocale` языка сайта при первом `POST`), `apps/web/src/i18n/routing.ts` (`alternateLinks: false`), `apps/web/src/app/[locale]/layout.tsx` (`metadataBase`, `lang` страницы), страницы каталога, вещи, профиля и главной.
- Create: `apps/api/src/catalog/sitemap` (`GET /catalog/sitemap`), `apps/web/src/lib/seo.ts`, `apps/web/src/app/{sitemap.ts,robots.ts}`, `apps/web/src/app/[locale]/c/[slug]/page.tsx`, `apps/web/src/lib/catalog/category-slugs.ts`.
- Test: `seo.test.ts`, `category-slugs.test.ts`, `slugify.test.ts`, `catalog-data.test.ts`, `catalog.item.e2e.test.ts` (`contentLocale`), `apps/web/e2e/seo.spec.ts`.

**Interfaces:**
- **`contentLocale`:** `ListingDraftSchema.contentLocale: z.enum(LOCALES).optional()`; `POST /listings` без него берёт `user.locale`; поле есть в `PublicListing`, `CatalogItem` и в sitemap.
- **`slugify(text, locale)`** — латиница в нижнем регистре через дефис, диакритика снята (`Spēļu konsoles` → `spelu-konsoles`), кириллица — транслитерацией (`Инструменты` → `instrumenty`); `catalog-data` может задать свой slug поверх. `ensureCategories` пишет `slugs` и падает при старте, если на одном языке два одинаковых slug.
- **`seo.ts`:** `itemSeo(detail, pageLocale)` → `{ canonical, htmlLang, jsonLd }`; `profileSeo(id)` → canonical на EN; `catalogSeo({ category, count, locale })` → canonical «голой» страницы, `languages` (slug каждого языка + `x-default`), `robots: { index: count >= 3, follow: true }` для категорий; `localizedPath(locale, path)`.
- **`lang` страницы:** proxy сайта кладёт путь в заголовок `x-yoyo-path`; `layout.tsx` для `/listings/:id-:slug` берёт `contentLocale` из того же (через `React.cache`) запроса, что и страница, и ставит его в `<html lang>`; шапка и интерфейсные блоки страницы вещи получают `lang` языка сайта.
- **`GET /catalog/sitemap`** → `{ listings: { id, contentLocale, updatedAt }[], users: { id, updatedAt }[], categories: { slugs, count }[] }` — только видимое; `app/sitemap.ts`: главная и каталог на трёх языках, категории на трёх языках, вещи по одному адресу, профили владельцев с вещами — английский адрес. `robots.ts`: `Disallow: /api/`, ссылка на sitemap.

- [ ] **Step 1: Write the failing tests**

```ts
// slugify.test.ts: 'Spēļu konsoles','lv' → 'spelu-konsoles'; 'Инструменты','ru' → 'instrumenty'; 'Car & travel','en' → 'car-travel'
// catalog-data.test.ts: у каждой категории три slug, на каждом языке все разные
// listings e2e: POST без contentLocale у пользователя с locale 'lv' → 'lv'; PATCH contentLocale опубликованной — статус прежний
// seo.test.ts: itemSeo(lv, страница ru) → canonical '/lv/listings/x', htmlLang 'lv', jsonLd.offers.url тот же, нет languages;
//   en → '/listings/x'; profileSeo → '/users/u'; catalogSeo(категория, 2 вещи) → robots { index: false, follow: true };
//   3 вещи → index true; canonical без параметров; languages { en: '/c/tools', lv: '/lv/c/instrumenti', ru: '/ru/c/instrumenty', 'x-default': '/c/tools' }
// category-slugs.test.ts: '/lv/c/tools' → redirect '/lv/c/instrumenti'; неизвестный slug → notFound
// e2e seo.spec.ts: Review Focus 6 по живому HTML и заголовкам; sitemap.xml — по одному адресу на вещь
```

- [ ] **Step 2–4:** RED → реализация → GREEN.
- [ ] **Step 5: Commit.** `feat: SEO for the catalog: content language, canonical and hreflang rules, robots, sitemap, localized category slugs`.

---

### Task 11: Сквозной сценарий, доступность, телефон, переводы, документация

**Files:**
- Create: `apps/web/e2e/catalog.spec.ts`, `apps/web/e2e/catalog-a11y.spec.ts`, `apps/web/e2e/support/catalog.ts` (`publishedListingByApi`: готовое объявление → модерация → одобрено).
- Modify: `apps/web/e2e/fit-on-phones.spec.ts`, `README.md` (раздел «Каталог»), `docs/superpowers/plans/2026-11-03-yoyo-roadmap.md` (статус 7).
- Test: e2e.

- [ ] **Step 1: Write the failing tests:**
  - **сценарий** (Review Focus 4, 6): две опубликованные вещи → `/catalog` → поиск с подсказкой (клавиатурой) → фильтр цены → в адресе `priceMax`, перезагрузка сохраняет выдачу → открыть вещь (фото с тем же `view-transition-name`) → выбрать 7 дней в календаре клавиатурой → итог равен `GET /listings/:id/quote` → «Запросить бронь» → «Запрос отправлен»;
  - **избранное:** гость нажимает сердечко → вход → снова в каталоге → сердечко → `/dashboard/favorites` показывает вещь;
  - **карта:** `?view=map` → метки есть, в ответе `/catalog/map` нет точной точки (Review Focus 1);
  - **профиль:** ссылка из карточки вещи → имя и вещи владельца;
  - **axe** без serious и critical: каталог (список, карта, открытый лист фильтров на 390 px, открытые подсказки), вещь (с выбранными датами, открытая галерея), профиль, избранное — светлая и тёмная тема;
  - **ширина:** все новые экраны на 320 и 390 px на EN/LV/RU без горизонтальной прокрутки (`fit-on-phones.spec.ts`);
  - **`prefers-reduced-motion`:** у карточки и сердечка нет анимаций (`getAnimations()` пуст после нажатия).
- [ ] **Step 2–4:** RED → правки → GREEN. Полный прогон `pnpm turbo run lint typecheck test build` и `pnpm --filter @yoyo/web e2e`.
- [ ] **Step 5: Commit.** `chore(web): catalog screens pass axe in both themes and fit phones in three languages; docs`.

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:**
  - §4.1 «Каталог»: строка с подсказками (Task 2, 6); категория и подкатегория, цена, залог, свободные даты, город и район, состояние (Task 2, 6); сортировка «дешевле» и «новые» (Task 2), «дороже» и «подходящие» — [моё решение]; «Список / Карта» (Task 6); пагинация страницами (Task 6); фильтры в URL (Task 5, 6). **Не входит:** фильтр по рейтингу и сортировка по рейтингу — рейтингов нет до плана 10; сортировка «ближе» — вместе с «Популярное рядом» в плане 12 (нужна геолокация посетителя); фильтр по характеристикам категории — следующим PR, когда наберётся каталог (GIN-индекс по `attributes` запланирован ещё в плане 6).
  - §4.1 «Карточка вещи»: галерея с полноэкранным просмотром, характеристики, описание, правила, цена, скидка, залог, календарь занятости, калькулятор, район без адреса, владелец, похожие, «Забронировать» (Task 7). **Не входит:** «Написать владельцу» — чат в плане 9; отзывы о вещи — план 10 (место под них в профиле уже есть); скорость ответа владельца — нужен чат.
  - §4.1 «Публичный профиль»: Task 9; аватар — инициалы, пока нет загрузки аватара (план 5 её не делал).
  - §4.2 «Избранное»: Task 4, 8.
  - §8 микровзаимодействия каталога: Task 6–8; «магнитная» кнопка поиска — на главной (план 12).
  - SEO (решение владельца 2026-11-06): Task 10. Окончательные slug категорий — из карты сайта W03, механизм готов.
- **Связь с планами 6 и 8:** `serializeListing(..., 'public')` и `PublicListingSchema`; `blockedPeriods`, `bookableListing` (общее условие видимости), `BookingRulesService` для сбора и `maxAdvanceDays`; `POST /bookings` и `GET /listings/:id/quote` без изменений.
- **Согласованность имён:** `CatalogQuerySchema`, `CATALOG_VISIBLE`, `yoyo_fold`, `parseCatalogParams`, `catalogSearch`, `serverApi`, `priceFor`, `RangeCalendar`, `HeartButton`, `useToggleFavorite`, `contentLocale`, `slugify`, `itemSeo`, `catalogSeo` одинаковы во всех задачах.
