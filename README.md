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
