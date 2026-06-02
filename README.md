# Lang AI Learn

Веб-приложение для изучения немецкого и английского с русским интерфейсом. AI-наставник: тест уровня (A1–C2), составление предложений с разбором ошибок, оценка произношения (Azure Pronunciation Assessment).

## Стек

- **Next.js 16** (App Router, TypeScript, Tailwind, standalone output)
- **Clerk** — авторизация
- **Postgres 16 + Drizzle ORM** — данные
- **OpenAI** (`gpt-4o`, `gpt-4o-mini`) — тест уровня, генерация и проверка предложений, советы по произношению
- **Azure Cognitive Services Speech** — Pronunciation Assessment (per-phoneme скоры)
- **Docker / Coolify** — деплой

## Локальный запуск (с Docker)

```bash
cp .env.example .env
# заполнить CLERK_*, OPENAI_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION

docker compose up --build
# открыть http://localhost:3000
```

Postgres поднимется автоматически, миграции применятся при старте контейнера.

## Разработка без Docker

```bash
npm install
# поднять отдельный Postgres (или из docker-compose: docker compose up postgres -d)
cp .env.example .env.local

npm run db:generate   # сгенерировать миграции из schema.ts (если меняли)
npm run db:migrate    # применить
npm run dev
```

## Скрипты

| | |
|---|---|
| `npm run dev` | dev-сервер (Turbopack) |
| `npm run build` | production build |
| `npm run start` | запуск собранного app |
| `npm run db:generate` | новая миграция из `lib/db/schema.ts` |
| `npm run db:migrate` | применить миграции |
| `npm run db:studio` | drizzle studio в браузере |

## Получение ключей

- **Clerk** → https://dashboard.clerk.com → создать app → API Keys → `Publishable key` + `Secret key`.
- **OpenAI** → https://platform.openai.com/api-keys
- **Azure Speech** → https://portal.azure.com → создать ресурс «Speech Services» (F0 — бесплатно 5 ч/мес). На странице ресурса: `Keys and Endpoint` → `KEY 1` + регион (например `westeurope`).

  ⚠️ **Защита от перерасхода**: после создания ресурса включи **Cost Management → Budget alert** на $5/$20 и в **Speech resource → Networking** ограничь по IP (для prod). Pronunciation Assessment вызывается с сервера, ключ не светится клиенту — но билля всё равно стоит закрыть жёстким budget cap.

## Cleanup cron

`/api/cron/cleanup` удаляет просроченные сессии (>7 дней с `consumed_at IS NULL`) и старые rate-limit записи. Защищён `CRON_SECRET` (в `Authorization: Bearer ...` или `?secret=...`).

**Coolify Scheduled Task:**
- Тип: Cron Job
- Schedule: `0 3 * * *` (раз в день в 3 утра)
- Command: `curl -sS -H "Authorization: Bearer $CRON_SECRET" http://app:3000/api/cron/cleanup`
- (или `docker exec` если из контейнера планировщика)

## Observability (Sentry)

Опционально. Если задать `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` — ошибки и трассировки уйдут в Sentry. Без DSN билд работает как обычно. Для source maps в проде задай `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT`.

## Деплой на Coolify (Proxmox)

1. Запушить репо в любой Git (GitHub/Gitea/локальный).
2. В Coolify создать **Project** → внутри:
   - **Resource → Database → PostgreSQL 16** (внутреннее имя, скажем, `lang-pg`).
   - **Resource → Application → Public/Private Repository** → выбрать репо → Build Pack: `Dockerfile`.
3. На странице приложения → **Environment Variables**:
   - `DATABASE_URL` → ссылка на Postgres (Coolify подставит `postgres://...@lang-pg:5432/...`).
   - `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`.
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/onboarding`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding`.
4. **Port**: `3000`. Включить webhook на GitHub — каждый push в main = redeploy.
5. Миграции применяются автоматически entrypoint-скриптом.

## Структура

```
app/                 # Next.js App Router
  (auth)/            # Clerk sign-in/sign-up
  (app)/             # защищённые: dashboard, onboarding, test, practice
  api/               # роуты: test, sentence, pronunciation
components/          # UI и фичевые компоненты
lib/
  ai/                # OpenAI клиент + промпты
  azure/             # Speech Service: токены
  db/                # Drizzle: schema, queries, migrations
  cefr.ts, i18n/ru.ts
middleware.ts        # Clerk middleware
Dockerfile           # standalone Next.js
docker-compose.yml   # Postgres + app для локалки
```

## Что есть в MVP

- ✅ Регистрация/вход (Clerk)
- ✅ Выбор языка (DE/EN)
- ✅ Адаптивный CEFR-тест на 12 вопросов
- ✅ Practice: составление предложений с разбором ошибок (подсветка, объяснения на русском)
- ✅ Practice: произношение с per-phoneme скорами (Azure) и AI-советом
- ✅ Дашборд: уровень, серия дней, последние попытки

## Что планируется дальше

- Spaced repetition / слова
- Больше языков
- Социальные фичи / лидерборды
- Мобильные приложения
