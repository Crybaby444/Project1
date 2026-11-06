# Yoyo — W02 International & Language Architecture

- **Дата / версия:** 2026-11-06, v1.0
- **Вход:** [P00-brief.md](P00-brief.md) (passed), [W01-research.md](W01-research.md) (passed с ограничениями)
- **Статус:** passed (технический гейт); подтверждение владельца по §M ниже.

Статусы: CONFIRMED, OBSERVED, RECOMMENDED, INFERRED / NEEDS CHECK, BLOCKER.

## A. Executive Decision Summary

- **Модель: один домен yoyo.rent с подпапками по языку.** EN — по умолчанию, без префикса (`/`). LV — `/lv`, RU — `/ru`. **CONFIRMED** (владелец 2026-11-06: английский остаётся основным, потому что дальше выход на всю Балтию; совпадает с текущим кодом).
- **Версии только по языку, без региона:** `en`, `lv`, `ru`. Предложение, валюта (EUR) и правила сейчас одинаковые для всех. Страна будущих рынков (EE, LT) — это фильтр каталога и юридический раздел, а не отдельная локаль. **RECOMMENDED**.
- **Будущее расширение:** добавить `et` (`/et`) и `lt` (`/lt`) как новые языковые подпапки того же домена. Никаких ccTLD (yoyo.lv, yoyo.ee): авторитет домена остаётся один. **RECOMMENDED**.
- **Обоснование английского по умолчанию при латышском спросе (W01 §6.1).** Это осознанный компромисс: бренд и запас на Балтию. Риск снимается тем, что LV-версия полноценная и индексируемая (`/lv`, с hreflang), а оригинальные SEO-тексты для Латвии пишутся по латышской семантике, а не переводом с EN (§D).
- **Найдены три технические проблемы для исправления:** принудительный редирект по языку браузера; объявления в трёх языковых версиях с одинаковым телом; hreflang задан двумя способами. Подробнее §E–G и §N.

## B. Market × Language × Locale Matrix (Locale Matrix)

| Market | Language | Locale / hreflang | Audience | Business status | Search priority (W01) | Launch phase |
| --- | --- | --- | --- | --- | --- | --- |
| Латвия | Latvian | `lv` | Основные жители, главный язык поиска | Primary market | **Высокий**: самые частые запросы (100–1k) | Launch |
| Латвия | Russian | `ru` | Русскоязычные жители Риги | Primary market, второй язык | Средний (10–100 по запросам) | Launch |
| Латвия + Балтия | English | `en` (x-default) | Экспаты, туристы, международные пользователи, будущие рынки | Бренд, по умолчанию | Низкий измеримый спрос в Латвии; AI Overview по EN | Launch |
| Эстония | Estonian | `et` | — | Future | Не исследовано | Phase 2+ |
| Литва | Lithuanian | `lt` | — | Future | Не исследовано | Phase 2+ |

## C. Recommended Domain / URL Model (URL Architecture Decision)

| Model | Rationale | Risks | Decision |
| --- | --- | --- | --- |
| **Subdirectory** (`yoyo.rent/lv/…`) | Один бренд и одна платформа; один авторитет домена; уже реализовано (next-intl, `localePrefix: 'as-needed'`); легко добавить `et`/`lt` | Дисциплина ссылок внутри локали | **Selected** (OBSERVED + RECOMMENDED) |
| ccTLD (yoyo.lv, yoyo.ee) | Сильная привязка к стране | Несколько доменов, раздельный авторитет, стоимость; yoyorent.lv занят прокатом колясок | Rejected |
| Subdomain (lv.yoyo.rent) | — | Непонятно, язык это или страна; лишняя сложность | Rejected |
| URL parameter (`?lang=`) | — | Не подходит для индексации | Rejected |

Префикс для EN: **без префикса**, как сейчас. Перевод EN на `/en` не делаем: сайт ещё не проиндексирован, но и пользы нет, а риск лишних редиректов появится. **RECOMMENDED**.

## D. Primary Authoring & Localization Model (Content Ownership Matrix)

| Content | Source locale | Author | Localizer | Reviewer | Approval |
| --- | --- | --- | --- | --- | --- |
| Интерфейс (кнопки, формы, ошибки) | EN | Claude | Claude (LV, RU) | Владелец; LV — носитель (NEEDS CHECK, вопрос P00 B2) | Владелец |
| SEO-страницы: главная, «Как это работает», «Сдать вещь», категории | **EN — структура и факты; LV и RU — отдельная семантика по W01**, тексты не переводятся дословно | Claude | Claude | Владелец + носитель LV | Владелец |
| FAQ | Вопросы — по реальным формулировкам каждого языка | Claude | Claude | Владелец | Владелец |
| Юридические страницы | EN + обязательная LV-версия | Claude (черновик) | Claude | Юрист — NEEDS CHECK | Владелец |
| Письма | EN | Claude | Claude | Владелец | Владелец |
| Объявления, чат, отзывы (UGC) | Язык автора | Пользователь | Не переводятся | Модерация | — |

Источник истины для фактов (сбор 0 %/10 %, сроки 24/48 ч, правила залога): настройки и спецификация. На всех языках формулировки одинаковые по смыслу.

## E. URL & Slug Policy (для W03)

1. Префикс: EN — нет, LV — `/lv`, RU — `/ru`; будущие `/et`, `/lt`. **CONFIRMED / RECOMMENDED**.
2. Один и тот же контент — один URL на язык. Никаких `/lv/page` и `/page` с одинаковым LV-текстом.
3. **Slugs: гибрид.** RECOMMENDED; точное сопоставление — в W03.
   - Индексируемые **категории** — локализованные slugs из переводов категорий, связанных стабильным ID (например, EN `/c/tools`, LV `/lv/c/instrumenti`, RU `/ru/c/instrumenty`). Причина: в W01 спрос идёт по названиям категорий на LV и RU.
   - **Статические страницы** (how-it-works, faq, terms, privacy, cookies) — оставить единые английские slugs: стабильно, а SEO-эффект небольшой.
   - **Объявления** — `/listings/[id]-[slug из заголовка]` на языке автора. ID — источник истины, slug необязателен для маршрутизации: старый slug → 301 на актуальный.
4. Внутренние ссылки внутри локали ведут в ту же локаль.
5. Переключатель языка открывает **эквивалентную страницу** с сохранением параметров запроса (фильтры каталога). Если эквивалента нет (например, профиль без переводов), остаётся на той же странице с переведённым интерфейсом. OBSERVED: компактное меню языка из PR #9 уже ведёт на эквивалент — проверить в W08.
6. Сайт ещё не проиндексирован (W01), поэтому любые изменения slugs сейчас ничего не стоят. Делать их **до** подключения Search Console.

## F. Hreflang Architecture (Hreflang Matrix)

| Page group | en | lv | ru | x-default | Method |
| --- | --- | --- | --- | --- | --- |
| Главная, статические, «Сдать вещь» | `https://yoyo.rent/…` | `https://yoyo.rent/lv/…` | `https://yoyo.rent/ru/…` | EN-URL | **Один метод** (см. ниже) |
| Категории | EN-slug | LV-slug | RU-slug | EN-URL | Тот же |
| Карточки объявлений | — | — | — | — | **Без hreflang** (§G) |
| Профили пользователей | — | — | — | — | Без hreflang; canonical на EN-URL (UGC) |
| Аккаунт, сделки, кошелёк, админ | — | — | — | — | noindex, без hreflang |

- Коды: `en`, `lv`, `ru` (ISO 639-1), без региона. Позже `et`, `lt`.
- x-default → EN: EN выступает международной версией и выбором по умолчанию. **RECOMMENDED** (Google: x-default для страниц без подходящего языка).
- **OBSERVED, проблема:** hreflang сейчас задан и HTTP-заголовком `Link` (next-intl), и в `sitemap.xml`. W02 требует один управляемый источник истины. **RECOMMENDED:** оставить HTTP `Link` / HTML от next-intl, он автоматичен для всех страниц. В sitemap оставить только `<loc>`. Либо наоборот, но не оба.
- Не включать в hreflang URL с редиректом, 404 или noindex.

## G. Canonical & Duplicate Policy

- Страницы с полным переводом: **self-canonical** на каждом языке. OBSERVED: `/lv` → canonical `https://yoyo.rent/lv`, `/` → `https://yoyo.rent`. Корректно.
- **Объявления — особый случай (OBSERVED в архитектуре).** Тело объявления на языке автора не переводится, а маршруты существуют в трёх локалях: `/listings/x`, `/lv/listings/x`, `/ru/listings/x`. Получаются три почти одинаковые страницы со смешанным языком: интерфейс один, основной текст другой. **RECOMMENDED:**
  1. Хранить язык объявления (`contentLocale`): автор выбирает при создании, по умолчанию — язык интерфейса.
  2. Canonical всех трёх версий → URL локали `contentLocale`; индексируется только он. Остальные версии открываются для удобства пользователя, но без hreflang.
  3. В sitemap — только canonical-URL объявления.
  4. `<html lang>` и schema.org на canonical-странице — язык объявления.
- Профили пользователей: то же правило, canonical → язык интерфейса профиля автора или EN.
- Пустые категории (нет активных объявлений): `noindex, follow`, пока не наберётся порог (W03 задаст N). Это защита от тонких страниц (W01 §9).
- Фильтры каталога (`?price=…&dates=…`): canonical → URL категории без параметров; индексация фильтров — решение C03/C08.

## H. Language Selector UX Rules

- Названия языков текстом: English, Latviešu, Русский. Без флагов как единственного обозначения. OBSERVED: компактное меню с кодом (EN ▾) и названиями внутри (PR #9).
- Пункты меню — обычные ссылки `<a href>` на эквивалентные URL, доступные роботам.
- **OBSERVED, проблема (forbidden approach §23):** `yoyo.rent/` при `Accept-Language: lv` сразу отвечает **307 → /lv**, если нет cookie выбора. Это принудительный редирект по языку браузера. **RECOMMENDED:** выключить автоматический редирект (`localeDetection: false` в next-intl). Вместо него при первом визите показывать ненавязчивую плашку: «Šķiet, jūs runājat latviski — pāriet uz latviešu versiju?» с кнопками «Pāriet» и «Palikt». Выбор сохранять в cookie и в профиле.
- Смена языка сохраняет страницу, фильтры и состояние аккаунта (уже так, View Transition из PR #9).
- Клавиатура, screen reader, тач — проверено WebKit e2e (PR #9). Повторить в W08.

## I. Market-specific Content Matrix (Market Difference Matrix)

| Element | Shared? | Language-specific | Market-specific | Source / owner |
| --- | --- | --- | --- | --- |
| Позиционирование бренда | Да | Да (формулировки) | Позже по странам | Владелец |
| Категории | Да (ID) | Названия и slugs | Нет | Админ-панель |
| Цена, валюта | EUR везде | Формат чисел по локали | Нет (одна валюта в Балтии) | Объявления |
| Сервисный сбор | Да | Тексты | Нет | Настройки: 0 % / 10 % |
| Передача вещи | Личная встреча | Тексты | Города / районы — фильтр | Спецификация |
| Правила залога и споров | Да | Тексты | При выходе в EE/LT — проверка законов | Спецификация, юрист |
| Юридические документы | Нет | LV обязательно, EN, RU | Да: Латвия сейчас, EE/LT позже | Владелец + юрист |
| Контакты оператора | Да | — | Позже по странам | Владелец |
| SEO-метаданные, заголовки | Нет | Да, по семантике языка | — | Claude / W04 |
| Отзывы | UGC, язык автора | Не переводятся | — | Пользователи |

## J. CMS / Content Model Requirements

Контент сайта хранится в коде (`apps/web/messages/*.json`) и в базе (категории, объявления). Требования:

1. Категории: стабильный ID + переводы name/slug/описание/SEO-поля по каждой локали; пустой перевод не подменяется молча EN-текстом на индексируемой странице (лучше noindex этой локали категории).
2. Объявления: поле `contentLocale` (§G).
3. Сообщения интерфейса: проверка в CI, что у каждого ключа есть EN/LV/RU (fallback на EN допустим только для интерфейса, не для SEO-текстов).
4. hreflang и canonical генерируются автоматически из маршрута и группы переводов, а не вручную.
5. ALT фото: из заголовка объявления на языке автора.
6. При добавлении `et`/`lt` — тот же механизм; локаль не включается в hreflang и sitemap, пока тексты не готовы полностью.

## K. Analytics Requirements

- GA4 с Consent Mode (P00): параметры `locale` (en/lv/ru), `page_type` (home, category, listing, static, account), `category_id`.
- Search Console: одна **Domain property** `yoyo.rent` (DNS-проверка в GoDaddy) — покрывает все подпапки. Отдельные отчёты по `/lv/` и `/ru/` через фильтры страниц. **Срочно** (W01: сайт не в индексе).
- Bing Webmaster Tools: импорт из Search Console — по желанию.

## L. Migration Constraints

- Сайт не проиндексирован, внешних ссылок нет (W01). Ограничений миграции нет. Все изменения slugs и canonical внести **до** отправки sitemap в Search Console.
- Старый хост `yoyo-rent.vercel.app` → 308 на `yoyo.rent`. OBSERVED, корректно.

## M. Risks & Blockers (Risk / Blocker Register)

| Issue | Impact | Status | Owner | Required decision |
| --- | --- | --- | --- | --- |
| EN по умолчанию при латышском спросе | LV-страницы могут уступать в приоритете ссылок и внимания | Принято владельцем 2026-11-06 | Владелец | — (снято правилами §D) |
| Принудительный редирект по языку браузера | Нарушает правило Google; Googlebot обычно без `Accept-Language`, но пользователи не могут остаться на EN | Open | Claude (разработка) | Подтвердить замену на плашку-подсказку |
| Объявления в трёх локалях с одним телом | Дубли и смешанный язык | Open | Claude (план 7) | Подтвердить правило `contentLocale` + canonical |
| Двойной hreflang (Link + sitemap) | Риск рассинхронизации | Open | Claude | — (техническое) |
| Вычитка LV | Качество и доверие | NEEDS CHECK | Владелец | Кто вычитывает (P00 B2) |
| Товарные знаки «Yoyo» в LV/EU | Бренд | NEEDS CHECK | Владелец | Проверка до вложений в бренд |

Архитектурных BLOCKER нет.

## N. Approved Inputs for W03

1. Локали: `en` (default, без префикса, x-default), `lv` (`/lv`), `ru` (`/ru`); позже `et`, `lt`.
2. Одна подпапочная модель на `yoyo.rent`.
3. Slugs: локализованные для категорий, английские для статических страниц, `id-slug` для объявлений.
4. Self-canonical для переведённых страниц; canonical объявлений и профилей → язык контента; пустые категории noindex.
5. hreflang — один метод (HTTP/HTML от next-intl); sitemap — только loc.
6. Без принудительного редиректа по языку; плашка-подсказка.
7. Индексируемые типы страниц: главная, «Как это работает», «Сдать вещь», FAQ, правила, конфиденциальность, cookies, категории (если не пустые), объявления (canonical), профили (canonical). Не индексируются: аккаунт, сделки, кошелёк, чат, админ, фильтры с параметрами.

## Quality Gate W02

| Criterion | Result |
| --- | --- |
| Все рынки и языки со статусом | PASS (§B) |
| Language-only или language+region | PASS: language-only |
| Выбрана модель домена с обоснованием | PASS (§C) |
| Primary authoring language и workflow | PASS (§D) |
| URL prefix и slug principles | PASS (§E) |
| Hreflang matrix и x-default | PASS (§F) |
| Canonical не конфликтует с hreflang | PASS (§G: объявления без hreflang, canonical на язык контента) |
| Selector UX rules | PASS (§H) |
| Market-specific элементы | PASS (§I) |
| CMS requirements и content parity | PASS (§J) |
| Migration risks | PASS (§L) |
| Нет неподтверждённых решений под видом фактов | PASS: RECOMMENDED отмечены явно |
| BLOCKER-вопросы вынесены | PASS: блокеров нет (§M) |

**Итог:** W02 — **passed** 2026-11-06. Следующий этап: **W03** (Sitemap & URL Architecture), совместно с C02/C03 для каталога.

Источники: [Google — localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [Google — locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages), [Google — managing multi-regional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) (доступ 2026-11-06); наблюдения yoyo.rent через curl 2026-11-06.
