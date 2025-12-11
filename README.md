# MyService

Стартовый каркас проекта с разделением на backend и frontend.

## Структура
- `backend/` — FastAPI-приложение, подключение к SQLite через SQLAlchemy, заготовки моделей, схем и роутеров.
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

## Дальнейшая разработка
- Добавляйте бизнес-логику, поля моделей и схемы по мере необходимости.
- Реализуйте маршруты в соответствующих файлах внутри `backend/routers/`.
