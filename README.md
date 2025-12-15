# MyService

Стартовый каркас проекта с разделением на backend и frontend.

## Структура
- `backend/` — FastAPI-приложение, подключение к SQLite через SQLAlchemy, модели, схемы и CRUD-роутеры для основных сущностей.
- `frontend/` — статический фронтенд, начальный `index.html`.
- `docs/` — место для документации.

## Запуск backend
1. Создайте и активируйте виртуальное окружение (опционально):
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
2. Установите зависимости:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Запустите сервер:
   ```bash
   uvicorn backend.main:app --reload
   ```
4. Проверьте работоспособность health-check по адресу `http://127.0.0.1:8000/health`.

## CRUD API
В API доступны CRUD-эндпоинты для сущностей: users, domains, sources, cards, experts, events. Каждый маршрут возвращает Pydantic-схемы и работает с SQLite-базой `myservice.db`.

Сценарные эндпоинты:
- `GET /cards/feed` — реестр/лента карточек с минимальным набором полей и пагинацией.
- `GET /cards/{card_id}/full` — полная карточка с владельцем, источниками и последними событиями.

## Примечания по .gitignore
- Локальная база данных SQLite (`myservice.db`) используется только для разработки и не должна коммититься.
- Виртуальное окружение `backend/venv` также остаётся локальным.
- Эти файлы и директории автоматически игнорируются Git благодаря обновлённому `.gitignore`.

### Пример запроса
Создание домена:
```bash
curl -X POST http://127.0.0.1:8000/domains \
  -H "Content-Type: application/json" \
  -d '{"code": "AI", "name": "Artificial Intelligence", "description": "AI domain"}'
```

После запуска все маршруты можно исследовать в Swagger UI по адресу `http://127.0.0.1:8000/docs`.

## Frontend

Фронтенд расположен в директории `frontend/` и обслуживается самим FastAPI.

1. Запустите backend:
   ```bash
   cd backend
   # активация venv (пример для Windows)
   ..\backend\venv\Scripts\Activate.ps1
   python -m uvicorn backend.main:app --reload
   ```
2. Откройте главную страницу: http://127.0.0.1:8000/app/
3. Рабочее место (чат и карточка): http://127.0.0.1:8000/app/workbench.html

На рабочей странице доступны:
- лента карточек с фильтрами и выбором активной карточки;
- чат, который имитирует ответы через эндпоинт `/chat/mock` и подбирает карточки по ключевым словам запроса;
- реестр карточек в табличном виде.

## Проверка фикса `/cards/feed`

Минимальная ручная проверка исправления неоднозначного `join`:

1. Запустите сервер, как описано выше.
2. В чистой базе (можно удалить `myservice.db` перед запуском) выполните:
   ```bash
   curl -i http://127.0.0.1:8000/cards/feed
   ```
3. Ожидаемый ответ: `200 OK` и тело вида
   ```json
   {"items":[],"total":0,"page":1,"page_size":20}
   ```
   Без ошибок `AmbiguousForeignKeysError` и без предупреждений об overlapped relationships в логе.