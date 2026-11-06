# Yoyo — W03 Sitemap & URL Architecture

- **Дата / версия:** 2026-11-06, v1.0
- **Вход:** P00 (passed), W01 (passed с ограничениями), W02 (passed); текущий сайт и код (`apps/web/src/app/[locale]`, `apps/api/src/categories/catalog-data.ts`)
- **Статус:** passed (технический гейт). Каталог одновременно строится в плане 7, поэтому правила §D и §H переданы туда.

## A. Executive Architecture Summary

1. **Трафик из поиска придёт через категории и объявления** (W01 §6.1: люди ищут «[вещь] noma»). Поэтому каталог — главный индексируемый раздел: 9 корневых категорий и ~35 подкатегорий с адресами на языке страницы.
2. **Главная** не гонится за широкими запросами. Её задачи — объяснить Yoyo за 5 секунд, направить в каталог и к «Сдать вещь», а также держать бренд («Yoyo — lietu noma starp cilvēkiem»).
3. **Новые страницы для доверия и холодного старта:** «Сдать вещь и заработать» (`/lend`) и «Безопасность и залог» (`/safety`). Обе закрывают пробелы, найденные в W01 §9.
4. **Не создаём:** страницы городов и районов, страницы «аренда [вещь] в [город]», блог (позже, P3), страницы под каждое сочетание фильтров.
5. **Адреса:** латиница в нижнем регистре, дефисы, без завершающего `/`, без диакритики и кириллицы. Категории — плоский путь `/c/{slug}` с локализованным slug. Объявления — `/listings/{id}-{slug}`.
6. **Индексация:** только канонические публичные страницы. Аккаунт, сделки, кошелёк, чат, админка, поиск и сочетания фильтров не индексируются.

## B. Final Master Sitemap

Локали по W02: EN без префикса, `/lv`, `/ru`. Ниже EN-путь; LV и RU — тот же шаблон с префиксом и, для категорий, своим slug (§D).

| Page ID | Page name | Type | Parent | URL pattern | Primary intent | Primary entity | Priority | Index | Navigation | Action | W04? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HOME | Главная | Homepage | — | `/` | Brand + понимание + маршрутизация | Yoyo, P2P-аренда с залогом | P1 | Index | — | KEEP (есть) | Да |
| HOW | Как это работает | Service / process | HOME | `/how-it-works` | Informational | Сделка: шаги, договор, залог | P1 | Index | Header, footer | KEEP (есть) | Да |
| LEND | Сдать вещь и заработать | Landing (владельцы) | HOME | `/lend` | Commercial («сдать в аренду вещи») | Доход владельца, сбор 0 % → 10 % | P1 | Index | Header CTA «Сдать вещь» | **CREATE** | Да |
| SAFE | Безопасность и залог | Trust | HOW | `/safety` | Informational («безопасно ли», «залог при аренде») | Залог, проверка, споры, тестовый режим оплаты | P2 | Index | Footer, контекстно | **CREATE** | Да |
| FAQ | Вопросы и ответы | FAQ | HOME | `/faq` | Informational | Частые вопросы по языкам | P2 | Index | Footer | KEEP (есть) | Да |
| CATS | Все категории | Category index | HOME | `/c` | Navigational / commercial | Каталог | P1 | Index | Header «Каталог» | **CREATE** (план 7) | Да |
| CAT-* | Корневая категория (9 шт.) | Category | CATS | `/c/{slug}` | Transactional / commercial | Категория | P1 | Index при ≥ 3 активных объявлениях, иначе noindex,follow | Header (мега-меню), CATS | **CREATE** (план 7) | Шаблон |
| SUB-* | Подкатегория (~35 шт.) | Category | CAT-* | `/c/{slug}` | Transactional («instrumentu noma») | Подкатегория | P1 | То же правило ≥ 3 | Страница родителя, хлебные крошки | **CREATE** (план 7) | Шаблон |
| LST | Карточка объявления | Product / offer | SUB-* | `/listings/{id}-{slug}` | Transactional («PS5 noma Rīgā») | Вещь + цена/день + залог | P1 | Index только версия на языке объявления (W02 §G); скрыта/удалена → 404/410 | Категория, профиль, похожие | KEEP маршрут `/listings/[id]`, добавить slug | Шаблон |
| USR | Публичный профиль | Profile | — | `/u/{id}` | Navigational / trust | Владелец: вещи, отзывы | P3 | Index, canonical EN-URL (W02 §G); пустой профиль — noindex | Карточка, отзывы | **CREATE** (план 7/10) | Шаблон |
| SRCH | Поиск | Utility | — | `/search?q=` | Utility | — | — | **Noindex**, follow | Поле поиска в шапке | **CREATE** (план 7) | Нет |
| TERMS | Условия использования | Legal | — | `/terms` | Legal | Правила платформы | P2 | Index | Footer | KEEP | Да (юр. тексты, LV обязательно) |
| PRIV | Конфиденциальность | Legal | — | `/privacy` | Legal | GDPR, контролёр данных | P2 | Index | Footer | KEEP | Да |
| COOK | Cookies | Legal | — | `/cookies` | Legal | Cookie-политика, GA4 Consent | P3 | Index | Footer, баннер | KEEP | Да |
| AUTH | Вход, регистрация, сброс | Account | — | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Navigational | — | — | **Noindex** | Header | KEEP | Нет |
| ACC | Аккаунт: настройки, «Мои вещи», конструктор, сделки, кошелёк, чат | Account | — | `/settings…`, `/dashboard…`, `/listings/new`, `/listings/{id}/edit`, `/deals…`, `/wallet`, `/messages` | Private | — | — | **Noindex**, robots Disallow где возможно | Меню пользователя | KEEP / CREATE (планы 8b, 9) | Нет |
| ADM | Админ-панель | Internal | — | `/admin…` | Internal | — | — | **Noindex**, Disallow | Меню администратора | KEEP | Нет |
| STY | Стайлгайд | Internal | — | `/styleguide` | Internal | — | — | Noindex, Disallow (уже) | — | KEEP | Нет |
| 404 | Не найдено | System | — | любой | — | — | — | Статус 404 | Ссылки на каталог | KEEP | Да (тексты) |
| GUIDE | Гайды («аренда или покупка» и др.) | Article | HOME | `/guides/{slug}` | Informational | — | P3 | Index | Footer | **LATER** (после первых сделок) | Позже |

## C. Page Opportunity Matrix

| Page candidate | Primary intent | Business value | SEO evidence (W01) | Unique value | Decision |
| --- | --- | --- | --- | --- | --- |
| Главная | Brand / routing | Высокая (требование владельца) | Бренд «yoyo rent» занят колясками — нужна сильная главная | Объяснение P2P-аренды с залогом | KEEP |
| «Сдать вещь и заработать» | Commercial | Высокая: без объявлений нет каталога | «сдать в аренду вещи» 10–100 RU; конкуренты не объясняют доход | Калькулятор дохода, правила | CREATE |
| «Безопасность и залог» | Informational | Средняя: доверие | «безопасно ли», залог; Nomat не объясняет защиту | Реальная механика продукта | CREATE (не сливать с HOW: HOW — шаги, SAFE — гарантии и споры) |
| Категории и подкатегории | Transactional | Высокая | instrumentu / projektora / telts / ratu noma 100–1k | Реальные вещи рядом, цена и залог | CREATE |
| Страницы городов («noma Rīgā») | Local | Низкая сейчас | «noma rīgā» — нет данных; один город | Нет уникального содержания | **NOT CREATE** (doorway) |
| Страницы районов | Local | Низкая | — | Нет | NOT CREATE; район — фильтр |
| «аренда [вещь] [город]» для каждой вещи | Transactional | — | — | Дубли категорий | NOT CREATE; покрывают категории и карточки |
| Сочетания фильтров (цена, даты) | Utility | — | — | Нет | NOINDEX (§H) |
| Страница «Nomat vs Yoyo» | Commercial | Низкая | Бренд Nomat 10–100 | Риск нападок | NOT CREATE сейчас; различия — на HOW и SAFE |
| Блог / гайды | Informational | Низкая сейчас | Нет данных | — | LATER (P3) |
| О нас / контакты | Trust | Средняя | E-E-A-T (W01 §10) | Кто оператор, контакт | MERGE в footer + блок на SAFE; отдельная `/about` — когда будет что рассказать |

## D. URL Rules

1. **Формат:** нижний регистр, латиница a–z, цифры, дефис `-`. Без завершающего `/` (поведение Next.js по умолчанию). `/Page` и `/page/` → 308 на канонический вид.
2. **Локали (W02):** EN без префикса, `/lv/…`, `/ru/…`. Позже `/et/…`, `/lt/…`.
3. **Slugs статических страниц** — английские во всех локалях: `/lv/how-it-works`, `/ru/safety`.
4. **Slugs категорий** — локализованные, ASCII-транслитерация: LV без диакритики (ā→a, č→c, ē→e, ģ→g, ī→i, ķ→k, ļ→l, ņ→n, š→s, ū→u, ž→z), RU — латинская транслитерация. Путь плоский `/c/{slug}`, родитель — в хлебных крошках, а не в URL: подкатегорию можно перенести без смены адреса.
5. **Объявления:** `/listings/{id}-{slug}`. Slug — из заголовка на языке объявления, ASCII, до 60 символов. Маршрутизация по `id`; неверный или устаревший slug → 301 на актуальный.
6. **Профили:** `/u/{id}`.
7. **Параметры** — только из списка §H; всё прочее (utm, fbclid, gclid) не попадает в canonical.
8. **Фрагменты `#`** — не для отдельного содержания.
9. **Неизменность:** после того как Google проиндексирует страницу, slug категории не меняется. Если всё-таки меняется — 301 и обновление ссылок.

**Таблица slugs категорий** (EN = текущий slug в `catalog-data.ts`; LV и RU — RECOMMENDED, LV на вычитку владельцу):

| EN (`/c/…`) | LV (`/lv/c/…`) | RU (`/ru/c/…`) | Спрос (W01 §6.1) |
| --- | --- | --- | --- |
| electronics | elektronika | elektronika | — |
| game-consoles | spelu-konsoles | igrovye-pristavki | ps5 noma 10–100, растёт |
| photo-video | foto-video | foto-video | kameras noma 10–100 |
| audio | audio | audio | — |
| laptops-tablets | klepjdatori-plansetes | noutbuki-planshety | — |
| projectors | projektori | proektory | **projektora noma 100–1k** |
| drones | droni | drony | — |
| tools | instrumenti | instrumenty | **instrumentu noma 100–1k** |
| power-tools | elektroinstrumenti | elektroinstrument | прокат инструмента 10–100 |
| hand-tools | rokas-instrumenti | ruchnoy-instrument | — |
| garden-tools | darza-tehnika | sadovyy-instrument | — |
| measuring-tools | merinstrumenti | izmeritelnyy-instrument | — |
| ladders-scaffolding | kapnes-sastatnes | lestnitsy-lesa | — |
| cleaning-machines | tirisanas-tehnika | uborochnaya-tehnika | — |
| sports-outdoors | sports-daba | sport-otdyh | — |
| bikes-scooters | velosipedi-skrejriteni | velosipedy-samokaty | прокат велосипедов 10–100 |
| camping | kempings | kemping | прокат палаток 10–100 |
| winter-sports | ziemas-sports | zimniy-sport | — |
| water-sports | udens-sports | vodnyy-sport | sup dēļa noma 10–100 (лето) |
| fitness | fitness | fitnes | — |
| home-kitchen | maja-virtuve | dom-kuhnya | — |
| kitchen-appliances | virtuves-tehnika | kuhonnaya-tehnika | — |
| home-cleaning | majas-uzkopsana | uborka-doma | — |
| furniture | mebeles | mebel | — |
| events-party | pasakumi-svetki | prazdniki-meropriyatiya | — |
| party-equipment | svetku-inventars | inventar-dlya-prazdnika | — |
| sound-light | skana-gaisma | zvuk-svet | — |
| event-tents-furniture | teltis-nojumes | shatry-mebel | **telts noma 100–1k** (шатры) |
| costumes | kostimi | kostyumy | — |
| kids | berniem | detyam | — |
| strollers-car-seats | rati-autokresli | kolyaski-avtokresla | **ratu noma 100–1k** |
| toys-games | rotallietas-speles | igrushki-igry | — |
| kids-furniture | bernu-mebeles | detskaya-mebel | — |
| music | muzika | muzyka | — |
| instruments | muzikas-instrumenti | muzykalnye-instrumenty | — |
| dj-equipment | dj-aprikojums | dj-oborudovanie | — |
| car-travel | auto-celojumi | avto-puteshestviya | — |
| roof-boxes-racks | jumta-kastes-bagaznieki | avtoboksy-bagazhniki | — |
| travel-gear | celojumu-piederumi | dorozhnoe-snaryazhenie | — |
| car-tools | auto-instrumenti | avtoinstrument | — |

Список берётся из `catalog-data.ts`; при добавлении категорий slugs задаются там же для всех трёх языков.

## E. Navigation Model

- **Header (desktop):** логотип → HOME; «Каталог» (мега-меню: 9 корневых категорий с иконками-стикерами + 2–3 популярные подкатегории в каждой, обычные ссылки `<a>`); поиск; «Как это работает»; кнопка «Сдать вещь» → LEND (или конструктор, если пользователь вошёл и уже сдаёт); меню языка; вход / меню пользователя.
- **Header (mobile):** логотип, поиск-иконка, меню языка, «☰». В «☰»: каталог (аккордеон категорий), «Как это работает», «Сдать вещь», «Безопасность и залог», вход. CTA «Сдать вещь» виден без прокрутки меню.
- **Footer:** колонки «Каталог» (9 корневых), «Yoyo» (как это работает, сдать вещь, безопасность и залог, FAQ), «Правила» (условия, конфиденциальность, cookies), контакт оператора, языки текстом.
- **Хлебные крошки:** HOME › Каталог › Корневая › Подкатегория › Объявление. Отражают иерархию категорий, а не историю переходов. Разметка BreadcrumbList — W08.

## F. Internal Linking Model

| From | To | Anchor / why |
| --- | --- | --- |
| HOME | CATS, 6–8 приоритетных категорий (инструменты, проекторы, шатры, коляски, консоли, фото, кемпинг, велосипеды) | Названия категорий на языке страницы |
| HOME | HOW, LEND, SAFE | «Как это работает», «Сдать вещь и заработать», «Как защищён залог» |
| CAT | SUB (все), популярные объявления | Названия подкатегорий |
| SUB | LST (пагинация обычными ссылками), соседние SUB, SAFE (блок «залог») | — |
| LST | SUB (крошки), USR, SAFE («как работает залог»), похожие LST (4–8) | — |
| HOW ↔ SAFE ↔ FAQ | Взаимные контекстные ссылки | По теме блока |
| LEND | Конструктор (`/listings/new`), SAFE, HOW | «Разместить вещь» |
| FAQ | Ответы ведут на HOW, SAFE, LEND, юр. страницы | — |

Ни одна индексируемая страница не orphan: категории — из header/footer/CATS; объявления — из категорий и sitemap.

## G. Indexation Intent Matrix

| Template | Index? | Follow? | Canonical | XML sitemap? | Причина |
| --- | --- | --- | --- | --- | --- |
| HOME, HOW, LEND, SAFE, FAQ | Yes | Yes | Self (по локали) | Yes | Основные страницы |
| TERMS, PRIV, COOK | Yes | Yes | Self | Yes | Доверие, юр. требования |
| CATS | Yes | Yes | Self | Yes | Вход в каталог |
| CAT / SUB с ≥ 3 активными объявлениями | Yes | Yes | Self (без параметров) | Yes | Транзакционный спрос |
| CAT / SUB с < 3 объявлениями | **No** | Yes | Self | No | Тонкая страница (W01 §9) |
| CAT / SUB, страница пагинации `?page=N` | Yes | Yes | Self (с `page`) | No | Доступ к объявлениям |
| CAT / SUB с фильтрами, сортировкой, видом карты | No | Yes | → категория без параметров | No | Бесконечное пространство URL |
| LST (активное, язык объявления) | Yes | Yes | Self = URL языка объявления | Yes | Главный SEO-актив |
| LST в другой локали | — | Yes | → URL языка объявления | No | W02 §G |
| LST снято / удалено | — | — | — | No | 410 (удалено) или 404; временно скрытое — noindex + «Вещь недоступна» со ссылками на похожие |
| USR с ≥ 1 объявлением или отзывом | Yes | Yes | → EN-URL профиля | Yes | Доверие |
| USR пустой | No | Yes | → EN-URL | No | Тонкая страница |
| SRCH | No | Yes | Self | No | Поиск |
| AUTH, ACC, ADM, STY | No | No / Disallow | — | No | Закрытые и служебные |

## H. Faceted Navigation / Parameters Policy

| Parameter | Значение | Где | Index | Canonical |
| --- | --- | --- | --- | --- |
| `q` | Строка поиска | SRCH, категории | No | SRCH self / категория без q |
| `page` | 2…N | Категории, SRCH | Да для категорий | Self с page |
| `price_min`, `price_max` | Целые € | Категории | No | Без параметров |
| `from`, `to` | Даты `YYYY-MM-DD` | Категории, LST | No | Без параметров |
| `district` | slug района | Категории | No | Без параметров |
| `sort` | `new`, `price_asc`, `price_desc`, `near` | Категории | No | Без параметров |
| `view` | `map` | Категории | No | Без параметров |
| атрибуты категории (`brand`, `model`, …) | значения из `catalog-data.ts` | Категории | No | Без параметров |
| `utm_*`, `gclid`, `fbclid` | Трекинг | Любые | — | Удаляются из canonical |

Правила:
- Фильтры остаются в URL, чтобы ими можно было делиться и переключать язык с сохранением выбора (W02 §E5), но страницы с фильтрами не индексируются.
- Пустая выдача фильтров — 200 с понятным пустым состоянием и ссылками на соседние категории, без `soft-404` сообщения как основного контента.
- Пагинация — обычные ссылки «1 2 3 … Далее», без бесконечной прокрутки как единственного способа (бесконечная подгрузка допустима поверх ссылок).
- Будущее: если у сочетания «подкатегория + бренд» (например, «PS5») появится стабильный спрос и достаточно объявлений, оно становится кураторской страницей `/c/{slug}/{brand}` с уникальным текстом, а не индексируемым параметром. Решение — после первых данных Search Console.

## I. Legacy Redirect Map

Сайт не проиндексирован (W01), внешних ссылок нет. Старые адреса, которые нужно сохранить:

| Old URL | New URL | Action | Reason |
| --- | --- | --- | --- |
| `https://yoyo-rent.vercel.app/*` | `https://yoyo.rent/*` | 308 (есть) | Старый хост |
| `/listings/{id}` (без slug) | `/listings/{id}-{slug}` | 301 | Новый шаблон (план 7) |
| `/{locale}/listings/{id}` в чужой локали | Остаётся доступным, canonical на язык объявления | Canonical | W02 §G |

## J. XML Sitemap / Discovery Logic

- Индекс `sitemap.xml` → `sitemap-pages.xml` (статические × 3 локали), `sitemap-categories.xml` (только индексируемые категории × 3 локали со своими slugs), `sitemap-listings.xml` (только canonical-URL активных объявлений, `lastmod` = время изменения).
- В sitemap — только `<loc>` и `<lastmod>`; hreflang — в HTTP `Link` (W02 §F). `changefreq` и `priority` Google игнорирует, их можно убрать.
- Отправлен в Search Console 2026-11-06 (текущий одиночный `sitemap.xml`). После плана 7 заменить на индекс без смены адреса `sitemap.xml`.
- Search Console подключён 2026-11-06 (Domain property, подтверждение через регистратора). Запрошена индексация `/`, `/lv`, `/ru`.

## K. Open Questions / Blockers

Блокеров для W04 нет. Нужны:
1. Вычитка LV-slugs категорий (§D) владельцем — до запуска индексации категорий.
2. Порог индексации категории (3 активных объявления) — RECOMMENDED; владелец может поменять.

## L. Handoff to W04

Page Blueprint нужен для: **HOME, HOW, LEND (новая), SAFE (новая), FAQ, шаблон категории (CAT/SUB), шаблон объявления (LST), CATS, USR, юридические (TERMS, PRIV, COOK), 404.**

Передано в разработку (план 7, отправлено 2026-11-06): `contentLocale` объявлений, canonical и hreflang по W02 §G, noindex пустых категорий, canonical фильтров, механизм локализованных slugs. В план 7 нужно дополнительно отправить таблицу slugs §D, шаблон `/listings/{id}-{slug}`, поиск `/search` и список параметров §H.

## Quality Gate W03

| Criterion | Result |
| --- | --- |
| У каждой индексируемой страницы своя роль, intent и ценность | PASS (§B, §C) |
| Нет каннибализации | PASS: HOW и SAFE разделены по задачам; города не создаются; фильтры не индексируются |
| Приоритетные страницы доступны обычными ссылками | PASS (§E, §F) |
| URL согласованы с W02 | PASS (§D) |
| Политика для поиска, параметров, фильтров, пагинации | PASS (§H) |
| Legacy URL оценены | PASS (§I) |
| Главное меню отражает приоритеты пользователя | PASS (§E) |
| Масштабируется на языки и рынки | PASS: новые локали — префикс + slugs категорий |
| Нет страниц только ради объёма SEO/AI | PASS |
| Достаточно данных для W04 | PASS (§L) |

**Итог:** W03 — **passed** 2026-11-06. Следующий этап: **W04** (Page Blueprint). Для каталога — C02/C03, их решения уже частично отражены в §D и §H.
