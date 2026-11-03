# Yoyo

Маркетплейс аренды вещей между людьми: от PS5 на выходные до дрели на один раз.

- Спецификация: [`docs/superpowers/specs/2026-11-03-yoyo-design.md`](docs/superpowers/specs/2026-11-03-yoyo-design.md)
- Дизайн-система: [`DESIGN.md`](DESIGN.md)
- Планы: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Структура

| Папка | Что внутри |
|-------|-----------|
| `apps/api` | API на NestJS + Prisma (PostgreSQL), все маршруты под `/api/v1` |
| `apps/web` | Сайт на Next.js |
| `packages/shared` | Общие для сайта и API константы, типы и схемы |

## Локальный запуск

Нужны: Node 24+ (на этом Mac стоит 26), pnpm 12, Homebrew.

1. Установить и запустить базу данных и ловушку для писем:
   ```bash
   brew install postgresql@17 mailpit
   brew services start postgresql@17
   brew services start mailpit
   ```
   PostgreSQL 17 из Homebrew не добавляет свои команды в `PATH`. Чтобы пользоваться `psql` и `createdb` напрямую, добавьте в `~/.zshrc`:
   ```bash
   export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
   ```
2. Создать базы для разработки и для тестов:
   ```bash
   createdb yoyo_dev
   createdb yoyo_test
   ```
3. Поставить зависимости и создать файл настроек API:
   ```bash
   pnpm install
   cp apps/api/.env.example apps/api/.env
   ```
4. Запустить API:
   ```bash
   pnpm --filter @yoyo/api dev
   ```
   Проверка: <http://localhost:4000/api/v1/health> отвечает `{"status":"ok","db":"up",…}`.

Письма, которые отправляет сайт при локальной разработке, не уходят наружу. Они видны в Mailpit: <http://localhost:8025>.

## Проверки

```bash
pnpm lint        # линтер
pnpm typecheck   # проверка типов
pnpm test        # тесты (тесты API работают с базой yoyo_test)
```
