# Yoyo — W01 Market / Competitor / SEO / AI Research (черновик 1)

- **Дата исследования:** 2026-11-06
- **Вход:** [P00-brief.md](P00-brief.md) (passed 2026-11-06)
- **Рынок / языки:** Латвия (Рига) × EN / LV / RU
- **Статус:** **passed с ограничениями** — см. Quality Gate (§17).

Статусы: **CONFIRMED** (владелец / P00), **OBSERVED** (найдено в источнике на дату), **INFERRED / NEEDS CHECK**, **MISSING**.

## Ограничения исследования (читать первым)

1. §5 собран через Google с `gl=lv` из браузера владельца в Риге 2026-11-06 (первые 8 результатов, без персонализации не гарантировано). Ранние наблюдения из США заменены.
2. Keyword Planner получен 2026-11-06 через аккаунт владельца, но без активной кампании даёт только диапазоны (§6.1). CPC не получен. Search Console пока нет: сайт не проиндексирован. Ни одна цифра не выдумана.
3. AI-поиск (ChatGPT Search, Google AI Overviews, Copilot) вживую не тестировался. §11 содержит набор вопросов и требования, а не наблюдения цитирования.
4. Конкуренты изучены по их публичным страницам; трафик и число объявлений неизвестны.

## 1. Executive Summary

- **Рынок существует, но P2P-аренды вещей в Латвии почти нет.** 42 % жителей Латвии за два года арендовали или брали вещи взаймы (Zero Waste Latvija, январь 2026, по данным jauns.lv). Предложение раздроблено: прокатные магазины (K Senukai, Arkada Serviss, Nedek, Outfish), каталоги компаний (zl.lv), сервис-маркетплейсы (GetaPro), доски объявлений (ss.com) и одна общая платформа аренды **Nomat.lv** («крупнейшая платформа аренды в Латвии», EN/LV/RU). **OBSERVED**.
- **Главный прямой конкурент — Nomat.lv.** Сделка там идёт в обход платформы («связаться с владельцем и договориться»), на главной не видно оплаты, залога, отзывов и проверки. **OBSERVED**. Это ровно то, что Yoyo делает внутри платформы: договор, залог в кошельке, передача и возврат кнопками, спор у администратора. Это главное отличие и главный аргумент главной страницы.
- **Образец из соседней страны — Rentable.lt (Литва):** удержание платежа до подтверждения возврата (Stripe Connect), гарантия до 1 000 €, отзывы, проверенные объявления. Только литовский язык. **OBSERVED**.
- **Язык категории:** в LV для вещей — **«noma»** (nomāt / iznomāt); «īre» — в основном жильё (OBSERVED, форум vgk.lv и закон; NEEDS CHECK у носителя). В RU — **«аренда»** и **«прокат»**. В EN — «rent» / «rental».
- **Русскоязычная выдача по Риге слабая:** запросы «прокат палатки Рига» и «аренда проектора Рига» вернули российские, казахстанские и украинские сайты, а не рижские (OBSERVED из США; NEEDS CHECK из Риги). Это возможная SEO-возможность для RU-версии.
- **Сайт yoyo.rent ещё не в индексе Google** (`site:yoyo.rent` — 0 результатов). Нужно подключить Search Console и отправить sitemap (W08).
- **Конфликт бренда:** запрос «yoyo rent» в Латвии полностью занят прокатом детских колясок Babyzen YOYO (yoyorent.lv и др.). Брендовый поиск будет путаться — нужно решение владельца (§16).
- **Nomat.lv забирает коммерческие запросы** отдельными страницами под конкретную вещь и срок («PS5 noma Rīgā uz 24 h»). Значит, индексируемые карточки объявлений — главный SEO-актив и для Yoyo.
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

## 5. SERP Findings — Google Латвия (gl=lv), браузер владельца в Риге, 2026-11-06

Метод: google.com/search с `gl=lv` и `hl` по языку запроса, первые 8 органических результатов. Блок «люди также спрашивают» не появился ни разу. AI Overview был у EN-запросов «rent PS5 / tools / things Riga», у LV и RU — нет. Источники в AI Overview не извлекались. **OBSERVED**.

| Query | Lang | Top results (домен) | Доминирующий тип страницы | Вывод |
| --- | --- | --- | --- | --- |
| PS5 noma Rīgā | LV | zuvubi.lv ×2, **nomat.lv ×3**, gameplay.lv, vrroom.lv, pixelplay.lv, instagram (gamerent.lv); есть local pack | Лендинги «PS5 noma Rīgā» у нишевых прокатов; у Nomat — отдельные страницы под каждый вариант («на 6 ч за 50 €», «на 24 ч за 85 €») | Спрос есть, коммерческий. Nomat берёт выдачу страницами под конкретную вещь и срок |
| instrumentu noma Rīgā | LV | ksenukai, arkadaserviss, isc, baumsrent, instrumentu-noma.lv, abcnoma, arsenalnoma, ctnoma | Страницы категорий прокатных компаний | Плотная конкуренция B2C-прокатов; P2P не видно |
| lietu noma | LV | mobilaatputa, rentdeko, **lietovelreiz.lv**, facebook, **zerowastelatvija.lv**, nomavalmiera, dudu.lv | Смешанная: праздничный инвентарь + темы совместного пользования | Общий запрос неоднозначный; нужна объясняющая страница |
| telts noma Rīgā | LV | sublevel, teltsuznomu, gandrs, iznomatelti, elegantsauto (палатка на крышу), teltispasakumiem | Почти всё про шатры для мероприятий | Слово «telts» в выдаче = шатёр для праздника, а не туристическая палатка (уточнить в W05) |
| projektora noma Rīgā | LV | projektoru-noma.lv ×2, skanagaisma, sublevel ×2, rolling, datortehnikasnoma, ritmainstituts | Прокаты для мероприятий | Нишевые точные домены |
| аренда вещей Рига | RU | galdu-noma, eventrent, **склады** (parcelsanas24, selfstorage, ambar, cargoriga), viss.lv, xsport | Смешанная: склады для хранения вещей + инвентарь | В RU «аренда вещей» читается как «хранение вещей». Не годится как основной термин |
| прокат инструмента Рига | RU | ksenukai, arkadaserviss, abcnoma, baumsrent, abc.lv, getapro, viss.lv | Категории прокатов | Как LV-аналог; русские версии сайтов прокатов |
| аренда PS5 Рига | RU | gameplay, **nomat ×2**, gamerent.lv (instagram, facebook), euronics Smart Rent, afk.lv, 1a.lv | Прокаты + магазины + аренда электроники у ритейлера | Euronics Smart Rent — ритейлер, сдающий электронику в аренду (NEEDS CHECK) |
| аренда проектора Рига | RU | skanagaisma ×3, ktserviss ×2, sikumi, viss.lv, eventrent | Прокаты для мероприятий | — |
| rent tools Riga | EN | tulz.lv, licgotus, viss.lv, allrent.lv, bruget, storent, baumsrent, statsrent; **AI Overview** | Прокаты | EN-выдача есть, местные сайты с EN-версиями |
| rent PS5 Riga | EN | zuvubi, gameplay, **nomat ×2**, booking.com, lvplayersclub; **AI Overview** | Как LV | Nomat ранжируется LV-страницами и по EN-запросу |
| rent things Riga | EN | eventmore, teltis.lv, tulz.lv, **tripadvisor (Gear Rentals)**, **rentaldirectory.eu**, viss.lv, **babonbo.com (детские вещи для туристов)**; **AI Overview** | Каталоги и агрегаторы | Туристы — отдельная EN-аудитория (детские коляски, снаряжение) |
| site:yoyo.rent | — | **0 результатов** | — | **yoyo.rent пока не проиндексирован** |
| yoyo rent | LV | **yoyorent.lv** (аренда детских колясок YOYO), ratunoma.lv, klnoma.lv, nomama.lv — все про коляски Babyzen YOYO | Брендовая выдача занята | **Конфликт бренда**: «yoyo rent» в Латвии = прокат колясок Babyzen YOYO; домен yoyorent.lv занят прокатом колясок |

Агрегаторы-каталоги, которые встречаются в нескольких выдачах: **viss.lv**, zl.lv, rentaldirectory.eu, tripadvisor. Через них можно получить ссылки и упоминания.

## 6. Search Demand & Intent (кластеры)

Demand metric — см. §6.1 (Keyword Planner, диапазоны).

| Cluster | EN | LV | RU | Intent | Funnel | Page type hypothesis | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Аренда конкретной вещи в Риге | rent [item] Riga | [lieta] noma Rīgā | аренда / прокат [вещь] Рига | Transactional + Local | Decision | Карточка вещи + категория | **P1** |
| Аренда категории | tool rental Riga | instrumentu noma Rīgā | прокат инструмента Рига | Transactional / Commercial | Consideration | Страница категории с реальными вещами | **P1** |
| Сдать свою вещь, заработать | rent out my stuff | iznomāt savas lietas, nopelnīt | сдать вещь в аренду, заработать | Commercial | Awareness → Decision | «Сдать вещь» (лендинг владельца) | **P1** |
| Как работает P2P-аренда, безопасно ли | is it safe to rent from strangers | — | безопасно ли брать вещи в аренду | Informational | Awareness | «Как это работает», FAQ, залог | **P2** |
| Залог при аренде | rental deposit | nomas depozīts / drošības nauda | залог при аренде | Informational | Consideration | Раздел о залоге и спорах | **P2** |
| Аренда vs покупка | rent or buy | nomāt vai pirkt | арендовать или купить | Informational | Awareness | Гайд (позже) | P3 |
| Бренд | yoyo rent | — | — | Navigational | Retention | Главная | P2 |

### 6.1 Объёмы Google Keyword Planner (Латвия, все языки, окт. 2025 – сент. 2026)

Источник: Google Ads Keyword Planner владельца, 2026-11-06. Аккаунт без активных кампаний, поэтому Google показывает только **диапазоны** среднемесячного числа запросов. «—» значит, что данных мало или нет. **OBSERVED**.

| Query | Lang | Avg. monthly | 3-month change | Competition | Вывод |
| --- | --- | --- | --- | --- | --- |
| instrumentu noma | LV | 100–1k | −90 % (сезон, к ноябрю) | Medium | Главный LV-кластер «инструменты»; летний пик |
| projektora noma | LV | 100–1k | 0 % | Medium | Стабильный спрос круглый год |
| telts noma | LV | 100–1k | −90 % (сезон) | High | Шатры для мероприятий, летний пик |
| ratu noma | LV | 100–1k | 0 % | Low | Коляски — та же ниша, что у Babyzen YOYO; возможная категория «детские вещи» |
| noma (семя) | LV | 100–1k | 0 % | — | — |
| ps5 noma | LV | 10–100 | 0 %, YoY +∞ (новый спрос) | Low | Растёт, конкуренция низкая |
| kameras noma | LV | 10–100 | 0 % | Low | — |
| iznomāt | LV | 10–100 | 0 % | Low | — |
| teltis noma | LV | 10–100 | 0 % | High | — |
| sup dēļa noma | LV | 10–100 | −100 % (сезон) | — | Летняя категория |
| nomat (бренд конкурента) | LV | 10–100 | 0 % | Low | Бренд Nomat ищут мало — рынок не захвачен |
| аренда (семя) | RU | 1k–10k | +900 % | — | Широкий, в основном жильё и авто |
| аренда ps5 | RU | 10–100 | +∞ | Low | Новый спрос |
| аренда вещей | RU | 10–100 | 0 % | — | Но выдача — склады (§5) |
| аренда инструмента рига | RU | 10–100 | 0 % | Medium | — |
| аренда проектора | RU | 10–100 | −100 % | — | — |
| аренда фотоаппарата | RU | 10–100 | 0 % | Low | — |
| прокат велосипедов / инструмента / палаток | RU | 10–100 каждый | 0 % | Medium | — |
| сдать в аренду вещи | RU | 10–100 | — | — | Спрос со стороны владельцев есть |
| rent ps5 riga, tool rental riga, rent things riga, equipment rental riga, baby stroller rental riga | EN | — | — | — | Объёмы EN по Латвии слишком малы для Planner, хотя Google показывает по ним AI Overview |
| lietu noma, noma rīgā, aprīkojuma noma, velosipēda noma, foto aparāta noma, kempinga inventāra noma | LV | — | — | — | Мало данных: люди ищут конкретную вещь, а не «аренду вещей» вообще |

**Выводы для W02/W03:**
1. Спрос **по конкретным вещам** («[вещь] noma»), а не по «аренде вещей вообще». Значит, SEO-трафик придёт через **страницы категорий и карточки объявлений** на LV и RU. Главная нужна для понятности, бренда и конверсии, а не для широких запросов.
2. **LV — основной язык спроса**: самые частые запросы на латышском. RU — второй, с меньшими объёмами. EN почти без измеримого спроса (туристы и экспаты; AI Overview). Для SEO EN по умолчанию — компромисс: проверить в W02, не сделать ли LV-версию основной индексируемой для Латвии.
3. **Сезонность подтверждается**: инструменты, шатры и SUP проседают к ноябрю на 90–100 %. Запуск зимой — подходящее время собирать объявления к весне.
4. **Первые категории по спросу**: инструменты, проекторы и техника для мероприятий, шатры и туризм, детские вещи (коляски), консоли (растут), фото.

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
| Латвийская выдача Google | DONE 2026-11-06 (§5) | Повторить через 3 месяца |
| Конфликт бренда «yoyo rent» с прокатом колясок | Решено 2026-11-06: имя **Yoyo остаётся** | Везде писать «Yoyo — lietu noma starp cilvēkiem»; Organization schema, единые профили; проверка товарных знаков — NEEDS CHECK |
| yoyo.rent не в индексе | OBSERVED | Search Console + sitemap.xml (W08, срочно) |
| Объёмы запросов | DONE 2026-11-06, диапазоны (§6.1) | Точные числа — только с активной кампанией; не обязательно |
| Сезонность | Частично (Keyword Planner, 3-month change, §6.1) | Google Trends для деталей |
| AI-цитирование | MISSING | Тест в ChatGPT / Google по §11 (владелец или Claude через браузер) |
| Термины LV | NEEDS CHECK | Носитель языка |
| Холодный старт: пустой каталог вредит SEO | Risk | noindex пустых категорий; первые объявления до индексации |

## 17. Quality Gate W01

| Criterion | Result |
| --- | --- |
| Понятно, что предлагает бизнес и приоритеты | PASS |
| Рынки и языки не смешаны | PASS (отдельно в §5, §6, §13) |
| Конкуренты найдены независимо | PASS: direct, organic, агрегаторы по латвийской выдаче; Local pack и AI-источники отмечены, но не разобраны; Paid — не наблюдался |
| Запросы сгруппированы по intent | PASS (§6), но без латвийской выдачи |
| Нет вымышленных volume, CPC, позиций, AI-цитирований | PASS |
| Есть entity map и terminology evidence | PASS (§7–8) |
| Есть content gaps / information gain | PASS (§9) |
| Есть список доказательств от клиента | PASS (§10) |
| AI-раздел без псевдо-GEO | PASS |
| Выводы с источником, датой и контекстом | PASS (§18) |
| Приоритеты = value + intent + evidence | PASS (§15) |
| Достаточно данных для W02/W03/W04 | PASS для W02 и W03 (типы страниц и кластеры по выдаче); объёмы спроса нет — приоритеты по intent и выдаче, не по volume |

**Итог:** W01 — **passed с ограничениями** (2026-11-06): объёмы Keyword Planner и Trends отсутствуют и отмечены как MISSING. Открытое решение владельца: конфликт бренда (§16). Следующий этап: **W02**.

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
