# Yoyo

Сервис аренды вещей у людей поблизости. Репозиторий: https://github.com/Crybaby444/Project1

- Спецификация: [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](docs/superpowers/specs/2026-11-03-yoyo-design.md)
- Дизайн-система: [`DESIGN.md`](DESIGN.md)
- Дорожная карта: [`docs/superpowers/plans/2026-11-03-yoyo-roadmap.md`](docs/superpowers/plans/2026-11-03-yoyo-roadmap.md)

## Структура

| Пакет                                      | Что внутри                                               |
| ------------------------------------------ | -------------------------------------------------------- |
| `apps/api` (`@yoyo/api`)                   | NestJS + Prisma (PostgreSQL), все маршруты под `/api/v1` |
| `apps/web` (`@yoyo/web`)                   | Next.js (App Router), Tailwind v4, next-intl (EN/LV/RU)  |
| `packages/shared` (`@yoyo/shared`)         | Общие константы и zod-схемы                              |
| `packages/api-client` (`@yoyo/api-client`) | Типизированный клиент API из OpenAPI                     |

## Локальный запуск

Нужны Node ≥ 24 (см. `.nvmrc`), pnpm 12, PostgreSQL 17 и Mailpit.

### 1. PostgreSQL и Mailpit

macOS (Homebrew):

```sh
brew install postgresql@17 mailpit
brew services start postgresql@17
brew services start mailpit
createdb yoyo_dev
createdb yoyo_test
```

Либо через Docker:

```sh
docker run -d --name yoyo-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17
docker exec yoyo-pg createdb -U postgres yoyo_dev
docker exec yoyo-pg createdb -U postgres yoyo_test
docker run -d --name yoyo-mail -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Проверка: `psql -d yoyo_dev -c 'select 1'` возвращает `1`. Интерфейс Mailpit: http://localhost:8025.

### 2. Переменные окружения

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Если у PostgreSQL есть пароль, впишите его в `DATABASE_URL`, например
`postgresql://postgres:postgres@localhost:5432/yoyo_dev`.

Тесты API работают с базой `yoyo_test`. По умолчанию берётся
`postgresql://postgres:postgres@localhost:5432/yoyo_test`; другой адрес передаётся через `DATABASE_URL`.

### 3. Команды

```sh
pnpm install
pnpm --filter @yoyo/api exec prisma migrate dev   # схема базы
pnpm --filter @yoyo/api exec prisma db seed       # настройки по умолчанию
pnpm dev                                          # API на :4000, веб на :3000
```

| Команда          | Что делает                                |
| ---------------- | ----------------------------------------- |
| `pnpm lint`      | ESLint во всех пакетах                    |
| `pnpm typecheck` | Проверка типов                            |
| `pnpm test`      | Модульные и интеграционные тесты (Vitest) |
| `pnpm build`     | Сборка всех пакетов                       |
| `pnpm e2e`       | Сквозные тесты Playwright                 |

Проверка API: `curl -s localhost:4000/api/v1/health` → `{"status":"ok","db":"up","version":"…"}`.
Если база недоступна, ответ `503` с `{"status":"degraded","db":"down"}`.
