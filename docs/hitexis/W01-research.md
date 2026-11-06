# Yoyo — W01 Market / Competitor / SEO / AI Research (черновик 1)

- **Дата исследования:** 2026-11-06
- **Вход:** [P00-brief.md](P00-brief.md) (passed 2026-11-06)
- **Рынок / языки:** Латвия (Рига) × EN / LV / RU
- **Статус:** **in progress** — см. Quality Gate (§17): не хватает латвийской выдачи Google и данных о спросе.

Статусы: **CONFIRMED** (владелец / P00), **OBSERVED** (найдено в источнике на дату), **INFERRED / NEEDS CHECK**, **MISSING**.

## Ограничения исследования (читать первым)

1. Поисковый инструмент Claude работает из США. Наблюдения §5 — это **не** латвийская выдача Google. Порядок сайтов и SERP features для Риги не установлены (**MISSING**).
2. Нет доступа к Google Keyword Planner, Search Console, Trends. Объёмы запросов, CPC и сезонность — **not available**. Ни одна цифра спроса в отчёте не выдумана.
3. AI-поиск (ChatGPT Search, Google AI Overviews, Copilot) вживую не тестировался. §11 содержит набор вопросов и требования, а не наблюдения цитирования.
4. Конкуренты изучены по их публичным страницам; трафик и число объявлений неизвестны.

## 1. Executive Summary

- **Рынок существует, но P2P-аренды вещей в Латвии почти нет.** 42 % жителей Латвии за два года арендовали или брали вещи взаймы (Zero Waste Latvija, январь 2026, по данным jauns.lv). Предложение раздроблено: прокатные магазины (K Senukai, Arkada Serviss, Nedek, Outfish), каталоги компаний (zl.lv), сервис-маркетплейсы (GetaPro), доски объявлений (ss.com) и одна общая платформа аренды **Nomat.lv** («крупнейшая платформа аренды в Латвии», EN/LV/RU). **OBSERVED**.
- **Главный прямой конкурент — Nomat.lv.** Сделка там идёт в обход платформы («связаться с владельцем и договориться»), на главной не видно оплаты, залога, отзывов и проверки. **OBSERVED**. Это ровно то, что Yoyo делает внутри платформы: договор, залог в кошельке, передача и возврат кнопками, спор у администратора. Это главное отличие и главный аргумент главной страницы.
- **Образец из соседней страны — Rentable.lt (Литва):** удержание платежа до подтверждения возврата (Stripe Connect), гарантия до 1 000 €, отзывы, проверенные объявления. Только литовский язык. **OBSERVED**.
- **Язык категории:** в LV для вещей — **«noma»** (nomāt / iznomāt); «īre» — в основном жильё (OBSERVED, форум vgk.lv и закон; NEEDS CHECK у носителя). В RU — **«аренда»** и **«прокат»**. В EN — «rent» / «rental».
- **Русскоязычная выдача по Риге слабая:** запросы «прокат палатки Рига» и «аренда проектора Рига» вернули российские, казахстанские и украинские сайты, а не рижские (OBSERVED из США; NEEDS CHECK из Риги). Это возможная SEO-возможность для RU-версии.
- **Риски:** холодный старт (нет объявлений — нечего индексировать), тонкие страницы категорий без вещей, коммодити-тексты.

## 2. Project & Market Scope

| Параметр | Значение | Статус |
| --- | --- | --- |
| Бизнес-модель | P2P-маркетплейс аренды по дням с залогом и спорами; сбор 0 % первые 3 месяца, затем 10 % | CONFIRMED (P00) |
| Рынок | Латвия, старт — Рига | CONFIRMED |
| Языки | EN (по умолчанию), LV, RU — отдельные исследования спроса | CONFIRMED |
| Ограничения | Только личная встреча, без доставки; без страховки; тестовые платежи | CONFIRMED |
| Требование владельца | Главная всегда объясняет, что это за платформа; сильное SEO | CONFIRMED |

## 3. Market / Category Findings

| Находка | Доказательство | Статус |
| --- | --- | --- |
| Спрос на аренду и совместное пользование растёт; интерес выше реального поведения | jauns.lv 2026-08-03: 42 % арендовали/брали взаймы за 2 года; статья отмечает, что модель ещё не доминирует | OBSERVED |
| Категории, которые люди берут в аренду в Латвии | Инструменты и ремонт, электроника и техника, спорт, книги и игрушки, посуда и декор для праздников, одежда | OBSERVED (jauns.lv) |
| Профессиональный прокат — магазины и компании, условия: документ, договор, залог, предоплата, скидки за длинный срок | K Senukai (скидки 20/30/50 % за 3–7/8–14/15+ дней), Nedek (100 % предоплата), Outfish (палатка 20 €/день, залог 50 €; проектор 50 €/день, залог 200 €) | OBSERVED |
| Нишевый P2P по транспорту | Gorendi (кемперы, Балтия) | OBSERVED |
| Факторы выбора | Цена за день, залог, близость, доверие к владельцу, понятные правила возврата и повреждений | INFERRED из условий прокатов и Rentable |
| Сезонность | Палатки и кемпинг — лето; праздники — декабрь; инструменты — весна и лето | INFERRED, NEEDS CHECK (Google Trends) |

## 4. Competitor Landscape

| Domain | Type | Market | Strength | Positioning / proof | Notes |
| --- | --- | --- | --- | --- | --- |
| nomat.lv | Direct (общая аренда) | LV, EN/LV/RU | Высокая: «крупнейшая платформа», 11 категорий | Сделка вне платформы; на главной нет отзывов, залога, проверки | Главный прямой конкурент |
| ss.com / ss.lv | Organic, доска объявлений | LV, LV/RU | Очень высокая авторитетность | Объявления, в том числе «noma»; без сделки и защиты | NEEDS CHECK: раздел «noma» для вещей |
| getapro.lv | Organic, сервис-маркетплейс | LV, RU/LV | Средняя; 352 исполнителя в «аренде электроинструмента» | Рейтинги, отзывы, фильтр городов, H1 по категории | Сильный пример категорийной страницы |
| ksenukai.lv | Direct (магазинный прокат инструментов) | LV | Высокая (бренд сети) | Скидки за срок, договор, залог | Бизнес, не P2P |
| arkadaserviss.lv, nedek.lv | Direct (прокат инструмента) | Рига | Средняя | Прокат на короткий и долгий срок | — |
| outfish.lv | Direct (туризм, проекторы) | Рига | Нишевая | Прозрачные цены и залоги | — |
| zl.lv | Directory / local | LV | Высокая для локальных запросов | Каталог компаний аренды по категориям и районам | Конкурент в выдаче по «noma + Rīga» |
| lietovelreiz.lv | Authority (Zero Waste Latvija) | LV | Средняя, ~35 000 посетителей за 2 года | Карта мест аренды, ремонта, обмена | Партнёрская возможность: попасть на карту |
| rentable.lt | Direct-аналог (Литва) | LT | — | Удержание платежа, гарантия 1 000 €, отзывы | Образец доверия, не конкурент в LV |
| gorendi.com | Нишевый P2P | Балтия | — | Кемперы и снаряжение | Конкурирует в категории «транспорт» |

Local/Maps, paid search и AI-cited слои — **MISSING** (нужна латвийская выдача и AI-тесты).

## 5. SERP Findings (из США, не латвийская выдача)

| Query | Lang | Observed result types | Вывод |
| --- | --- | --- | --- |
| noma Rīga lietas īre starp cilvēkiem platforma | LV | Статья о совместном пользовании, nomat.lv, нишевые прокаты, форум о «noma» vs «īre» | Смешанный intent; есть место для объясняющей страницы |
| PS5 noma Rīgā | LV | Только магазины, продающие PS5; аренды нет | Предложения в выдаче нет — возможность (NEEDS CHECK из Риги) |
| telts noma Rīga | LV | Outfish (страницы товаров для аренды), каталоги zl.lv, кемпинги | Выдача — страницы конкретных вещей; нужны индексируемые карточки |
| аренда вещей Рига прокат | RU | getapro.lv, ksenukai.lv, arkadaserviss.lv, nedek.lv + российские сайты | Категорийные страницы прокатов |
| прокат палатки / проектора Рига | RU | Только KZ/RU/UA сайты | Слабая RU-выдача по Риге — возможность |
| rent camera / projector / tent Riga | EN | Каталоги zl.lv, профессиональный прокат камер, Outfish | Каталоги компаний и профессиональный прокат |
| peer to peer rental Latvia | EN | nomat.lv, rentable.lt, gorendi, мировые P2P | Мало латвийских P2P |

## 6. Search Demand & Intent (кластеры)

Demand metric для всех: **not available** (нет Keyword Planner).

| Cluster | EN | LV | RU | Intent | Funnel | Page type hypothesis | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Аренда конкретной вещи в Риге | rent [item] Riga | [lieta] noma Rīgā | аренда / прокат [вещь] Рига | Transactional + Local | Decision | Карточка вещи + категория | **P1** |
| Аренда категории | tool rental Riga | instrumentu noma Rīgā | прокат инструмента Рига | Transactional / Commercial | Consideration | Страница категории с реальными вещами | **P1** |
| Сдать свою вещь, заработать | rent out my stuff | iznomāt savas lietas, nopelnīt | сдать вещь в аренду, заработать | Commercial | Awareness → Decision | «Сдать вещь» (лендинг владельца) | **P1** |
| Как работает P2P-аренда, безопасно ли | is it safe to rent from strangers | — | безопасно ли брать вещи в аренду | Informational | Awareness | «Как это работает», FAQ, залог | **P2** |
| Залог при аренде | rental deposit | nomas depozīts / drošības nauda | залог при аренде | Informational | Consideration | Раздел о залоге и спорах | **P2** |
| Аренда vs покупка | rent or buy | nomāt vai pirkt | арендовать или купить | Informational | Awareness | Гайд (позже) | P3 |
| Бренд | yoyo rent | — | — | Navigational | Retention | Главная | P2 |

Термины в LV и RU требуют проверки носителем и данных Keyword Planner перед W03 (**NEEDS CHECK**).

## 7. Entity / Topical Map

| Entity | Type | Canonical EN / LV / RU | Связь с бизнесом | Role |
| --- | --- | --- | --- | --- |
| Аренда вещей между людьми | Service | peer-to-peer rental / lietu noma starp cilvēkiem / аренда вещей у людей | Ядро | Главная, «Как это работает» |
| Залог | Concept | deposit / depozīts (drošības nauda?) / залог | Ключевое отличие | Главная, карточка, FAQ |
| Договор аренды | Document | rental agreement / nomas līgums / договор аренды | Доверие | Сделка, FAQ |
| Владелец / арендатор | Role | owner, renter / iznomātājs, nomnieks / владелец, арендатор | Оба в одном аккаунте | Везде |
| Категории | Product groups | Инструменты, электроника и консоли, фото и видео, туризм и спорт, праздники, детские вещи, транспорт | Каталог | Страницы категорий |
| Районы Риги | Geo | Centrs, Purvciems, Imanta, Ķengarags, Teika… | Встреча лично | Фильтр, не отдельные страницы |
| Отзывы и рейтинг | Trust | reviews / atsauksmes / отзывы | Доверие | Профили, карточки |
| Спор | Process | dispute / strīds / спор | Защита залога | «Как это работает», правила |

## 8. Terminology Observations (для W05)

| Term | Market usage | Alternatives | Evidence | Unresolved |
| --- | --- | --- | --- | --- |
| noma vs īre (LV) | «noma» — вещи, техника, помещения; «īre» — жильё; по закону оба — договор найма, разное НДС | iznomāt, nomāt | vgk.lv forum; закон (OBSERVED) | Проверка носителем |
| аренда vs прокат (RU) | «прокат» — магазинный прокат инструментов и снаряжения; «аренда» — шире | — | getapro.lv, ksenukai.lv | Какой термин в H1 — нужен спрос |
| depozīts vs drošības nauda (LV) | Магазины пишут «depozīts» | drošības nauda | outfish.lv (OBSERVED) | Проверка носителем |
| rent vs hire (EN) | «rent» в латвийских EN-страницах | hire (британский) | zl.lv EN (OBSERVED) | — |

## 9. Content Gaps / Information Gain

| User need | Competitor weakness | Yoyo evidence opportunity | Role |
| --- | --- | --- | --- |
| «Что будет, если вещь сломают или не вернут?» | Nomat не объясняет на главной; ss.com — никак | Правило залога, шаги проверки 48 ч, спор у администратора — реальная механика продукта | Главная, «Как это работает», FAQ |
| «Сколько можно заработать на своей вещи?» | Ни у кого нет | Калькулятор дохода по цене за день (без выдуманных средних) | Лендинг «Сдать вещь» |
| Найти вещь рядом сегодня | Прокаты — только свои точки | Карта и районы, фильтр дат | Каталог |
| Прозрачная цена с залогом заранее | Прокаты — разные условия | Итог «аренда + залог (вернётся)» на карточке | Карточка вещи |
| Аренда PS5, проекторов, камер у людей | В выдаче только магазины | Настоящие объявления | Карточки (нужны вещи) |

Не создавать: страницы «аренда в [город]» без реальных объявлений, тонкие пустые категории (noindex, пока < N объявлений), массовые синонимичные лендинги.

## 10. E-E-A-T / Trust Evidence Requirements

| Required proof | Available now | Missing | Owner |
| --- | --- | --- | --- |
| Кто стоит за сервисом, контакты | Почта домена | Имя оператора, контакт, адрес для юр. страниц | Владелец |
| Как защищён залог | Механика в продукте | Короткое понятное объяснение со схемой | Claude (W04/W06) |
| Реальные отзывы | Система отзывов (план 10) | Первые отзывы после первых сделок | Пользователи |
| Тестовый режим оплаты | Решение P00 | Плашка и FAQ | План 8b |
| Правила и разрешение споров | Спецификация §4.4 | Публичная страница правил на LV/EN/RU | W06 |
| Фото реальных вещей и людей | — | Первые объявления (не стоковые фото) | Владелец |

## 11. AI Search Query Set (не тестировалось)

| Natural-language query | Lang | Intent | Что сайт должен ясно отвечать |
| --- | --- | --- | --- |
| Where can I rent a PS5 for a weekend in Riga? | EN | Transactional/Local | Что такое Yoyo, где, цена за день, залог |
| Kur Rīgā var nomāt teltis uz nedēļas nogali? | LV | Local | То же на LV |
| Где в Риге взять в аренду проектор на день? | RU | Local | То же на RU |
| Is renting from strangers safe in Latvia? | EN | Informational | Залог, договор, споры, отзывы |
| How can I earn money renting out my things in Riga? | EN | Commercial | Как сдать, сбор 0 %/10 %, правила |
| Nomat vs Yoyo — what's the difference? | EN | Commercial | Чёткое сравнение механики без нападок |

Условия для понятности AI: одинаковые факты на всех страницах и профилях, короткий прямой ответ в начале разделов, структурированные данные Organization / Product + Offer, без выдуманных фактов. llms.txt — необязательно и не заменяет основы.

## 12. Local Search

- Встреча лично → релевантны районы Риги, но **отдельные страницы районов не нужны**: нет уникального содержания. Районы — фильтр каталога и показ на карте.
- Google Business Profile для онлайн-платформы без точки обслуживания — NEEDS CHECK, по правилам Google, скорее не подходит.
- Попасть на карту lietovelreiz.lv (Zero Waste Latvija) — возможность для ссылок и доверия.

## 13. International & Multilingual Findings (для W02)

- Один рынок, три языка; спрос и SERP по каждому языку разные (§5): LV — локальные прокаты и каталоги; RU — слабая местная выдача; EN — каталоги и профессиональный прокат.
- Механический перевод ключей запрещён: «noma» ≠ буквальная «rent»; «прокат» и «аренда» различаются.
- Google: отдельный URL для каждой языковой версии, взаимные hreflang-ссылки, x-default; не подстраивать контент по IP ([Google Search Central: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages)). OBSERVED. Текущая схема `localePrefix: as-needed` (EN без префикса) этому соответствует — проверка в W02/W08.

## 14. Seasonality / Trends

MISSING: нужен Google Trends для Латвии. Гипотезы: лето — туризм и кемпинг, весна — сад и инструменты, декабрь — праздники.

## 15. Commercial Priority Matrix

| Opportunity | Business value | Intent | Evidence | Priority | Rationale |
| --- | --- | --- | --- | --- | --- |
| Главная, ясно объясняющая P2P-аренду с залогом | Высокая (требование владельца) | Mixed | Nomat не объясняет защиту | **P1** | Отличие от главного конкурента |
| Категории: инструменты, консоли и электроника, фото и видео, туризм | Высокая | Transactional | Выдача: прокаты и магазины, мало P2P | **P1** | Частые разовые нужды |
| Лендинг «Сдать вещь и заработать» | Высокая (холодный старт) | Commercial | Конкуренты не объясняют доход | **P1** | Без объявлений нет каталога |
| «Как это работает» + правила залога и споров | Средняя | Informational | Вопросы доверия | **P2** | Доверие и AI-понятность |
| Гайды «аренда или покупка» | Низкая сейчас | Informational | — | P3 | После первых сделок |

## 16. Risks, Assumptions & Missing Data

| Item | Status | Next action |
| --- | --- | --- |
| Латвийская выдача Google по ~15 ключевым запросам | MISSING | Владелец делает скриншоты из Риги (инкогнито), или подключаем Search Console после запуска |
| Объёмы запросов EN/LV/RU | MISSING | Google Keyword Planner (бесплатно с аккаунтом Google Ads), владелец |
| Сезонность | MISSING | Google Trends, Латвия |
| AI-цитирование | MISSING | Тест в ChatGPT / Google по §11 (владелец или Claude через браузер) |
| Термины LV | NEEDS CHECK | Носитель языка |
| Холодный старт: пустой каталог вредит SEO | Risk | noindex пустых категорий; первые объявления до индексации |

## 17. Quality Gate W01

| Criterion | Result |
| --- | --- |
| Понятно, что предлагает бизнес и приоритеты | PASS |
| Рынки и языки не смешаны | PASS (отдельно в §5, §6, §13) |
| Конкуренты найдены независимо | PASS для direct и organic; Local/AI/Paid — **FAIL (MISSING)** |
| Запросы сгруппированы по intent | PASS (§6), но без латвийской выдачи |
| Нет вымышленных volume, CPC, позиций, AI-цитирований | PASS |
| Есть entity map и terminology evidence | PASS (§7–8) |
| Есть content gaps / information gain | PASS (§9) |
| Есть список доказательств от клиента | PASS (§10) |
| AI-раздел без псевдо-GEO | PASS |
| Выводы с источником, датой и контекстом | PASS (§18) |
| Приоритеты = value + intent + evidence | PASS (§15) |
| Достаточно данных для W02/W03/W04 | **FAIL**: нужны латвийская выдача и объёмы спроса |

**Итог:** W01 — **in progress**. Достаточно для W02 (языковая архитектура). Для W03 (sitemap и URL категорий) нужны недостающие данные из §16.

## 18. Sources (доступ 2026-11-06)

- [nomat.lv](https://nomat.lv/en) — главная платформы аренды
- [rentable.lt](https://rentable.lt/?lang=en) — литовский P2P-аналог
- [gorendi.com](https://gorendi.com/) — P2P кемперы, Балтия
- [getapro.lv — аренда электроинструмента](https://getapro.lv/ru/category/arenda-elektroinstrumenta)
- [ksenukai.lv — аренда инструментов](https://www.ksenukai.lv/ru/kp/arenda-instrumentov/n)
- [arkadaserviss.lv](https://arkadaserviss.lv/ru/noma), [nedek.lv](http://www.nedek.lv/ru/equipment_rent)
- [outfish.lv — палатки и проекторы в аренду](https://outfish.lv/en/products/tent-rental-naturehike-cape-easy-setup)
- [zl.lv — holiday equipment rental](https://www.zl.lv/en/category/holiday-equipment-rental/)
- [jauns.lv — тренд совместного пользования, 2026-08-03](https://jauns.lv/raksts/maja-un-darzs/721634-nopirkt-ne-vienmer-ir-izdevigak-latvija-uzplaukst-koplietosanas-trends)
- [vgk.lv — «īre» vs «noma»](https://www.vgk.lv/forum/thread/65195-kada-atskiriba-starp-iri-un-nomu)
- [lietovelreiz.lv](https://www.lietovelreiz.lv/) — карта Zero Waste Latvija
- [Google Search Central — localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Search Central — locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages)

Workbook (Excel, 13 листов) — **outstanding**: таблицы этого отчёта выгрузятся в xlsx после того, как появятся латвийские данные.
