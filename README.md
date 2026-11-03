# Yoyo

Сервис аренды вещей у людей поблизости. Спецификация — [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](docs/superpowers/specs/2026-11-03-yoyo-design.md), дизайн — [`DESIGN.md`](DESIGN.md), план работ — [`docs/superpowers/plans/2026-11-03-yoyo-roadmap.md`](docs/superpowers/plans/2026-11-03-yoyo-roadmap.md).

Repository: https://github.com/Crybaby444/Project1

## Структура

| Путь                  | Пакет              | Что это                                                         |
| --------------------- | ------------------ | --------------------------------------------------------------- |
| `apps/api`            | `@yoyo/api`        | API на NestJS + Prisma (PostgreSQL), все маршруты под `/api/v1` |
| `apps/web`            | `@yoyo/web`        | Сайт на Next.js (App Router), EN / LV / RU                      |
| `packages/shared`     | `@yoyo/shared`     | Константы и схемы, общие для веба и API                         |
| `packages/api-client` | `@yoyo/api-client` | Типизированный клиент API, генерируется из OpenAPI              |

## Локальный запуск

### Что нужно

- Node.js ≥ 24 (версия для CI — в `.nvmrc`);
- pnpm 12 (`corepack enable`, версия зафиксирована в `package.json`);
- PostgreSQL 17 (подойдёт и 16);
- Mailpit — понадобится с плана 3 (письма), для фундамента не нужен.

На macOS (только с согласия владельца компьютера):

```sh
brew install postgresql@17 mailpit
brew services start postgresql@17
brew services start mailpit
```

### Базы данных

```sh
createdb yoyo_dev
createdb yoyo_test
```

### Переменные окружения

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

| Переменная                    | Где | Пример                                 | Назначение                                                                                     |
| ----------------------------- | --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                | API | `postgresql://localhost:5432/yoyo_dev` | База разработки. Тесты сами заменяют `yoyo_dev` на `yoyo_test` (или берут `TEST_DATABASE_URL`) |
| `WEB_ORIGIN`                  | API | `http://localhost:3000`                | Адрес сайта для CORS                                                                           |
| `PORT`                        | API | `4000`                                 | Порт API                                                                                       |
| `NEXT_PUBLIC_API_URL`         | веб | `http://localhost:4000/api/v1`         | Адрес API для сайта                                                                            |
| `NEXT_PUBLIC_SHOW_STYLEGUIDE` | веб | `true`                                 | Показывать `/styleguide` (в production — `false`)                                              |

### Команды

```sh
pnpm install
pnpm --filter @yoyo/api db:deploy   # применить миграции
pnpm --filter @yoyo/api db:seed     # записать настройки по умолчанию
pnpm dev                            # API на :4000, сайт на :3000
```

Проверки:

```sh
pnpm turbo run lint typecheck test build
pnpm --filter @yoyo/web e2e         # Playwright, сам запускает API и сайт
curl -s localhost:4000/api/v1/health
```

Если база недоступна, `GET /api/v1/health` отвечает `503 {"status":"degraded","db":"down",…}`, а API продолжает работать.
