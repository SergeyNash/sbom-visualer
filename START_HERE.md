# 🎉 SBOM Analyzer - Новая Версия!

## ✨ Что изменилось?

Приложение **полностью переработано** с новой архитектурой:

### Было:
- ❌ Вся логика выполнялась в браузере
- ❌ Ограничения производительности браузера
- ❌ Нет возможности масштабирования

### Стало:
- ✅ **Backend на .NET 8.0** - вся бизнес-логика на сервере
- ✅ **REST API** - стандартный интерфейс взаимодействия
- ✅ **React Frontend** - только UI и визуализация
- ✅ **Высокая производительность** - обработка на сервере
- ✅ **Масштабируемость** - можно развернуть где угодно

## 🚀 Как запустить?

### Вариант 1: Быстрый старт (Windows)

1. **Установите необходимое ПО:**
   - [.NET 8.0 SDK](https://dotnet.microsoft.com/download)
   - [Node.js 18+](https://nodejs.org/)

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Запустите приложение:**
   - Двойной клик на `START_BACKEND.bat`
   - Двойной клик на `START_FRONTEND.bat` (в новом окне)

4. **Откройте браузер:**
   - http://localhost:5173

### Вариант 2: Ручной запуск

```bash
# Терминал 1: Backend
cd backend/SbomAnalyzer.Api
dotnet restore
dotnet run

# Терминал 2: Frontend (новый терминал)
npm install
npm run dev
```

## 📚 Документация

| Файл | Описание | Для кого |
|------|----------|----------|
| **[QUICKSTART.md](QUICKSTART.md)** | Быстрый старт за 3 шага | Все |
| **[SETUP.md](SETUP.md)** | Подробная установка и настройка | Начинающие |
| **[README_FULLSTACK.md](README_FULLSTACK.md)** | Полная документация архитектуры | Разработчики |
| **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** | Что было изменено | Техническая команда |
| **[backend/README.md](backend/README.md)** | Backend API документация | Backend разработчики |
| **[README.md](README.md)** | Frontend документация | Frontend разработчики |

## 🎯 Что нового?

### Backend (.NET 8.0 Web API)
- ✅ REST API с полной документацией (Swagger)
- ✅ Парсинг SBOM (CycloneDX, SPDX)
- ✅ Генерация SBOM из кода (7 языков)
- ✅ Слияние множественных SBOM
- ✅ Извлечение архивов (ZIP)
- ✅ Валидация и фильтрация
- ✅ CORS настройки
- ✅ Асинхронная обработка

### Frontend (React + TypeScript)
- ✅ Новый API клиент
- ✅ Обновленные компоненты загрузки
- ✅ Улучшенная обработка ошибок
- ✅ Все прежние функции UI

### Поддерживаемые языки для генерации SBOM:
- 📦 Node.js (package.json)
- 🐍 Python (requirements.txt, pyproject.toml)
- ☕ Java (pom.xml, build.gradle)
- 🔷 .NET (*.csproj)
- 🐹 Go (go.mod)
- 🦀 Rust (Cargo.toml)
- 🐘 PHP (composer.json)

## 🌐 Адреса

После запуска приложение доступно по адресам:

- **Frontend (Приложение)**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Swagger UI (API Docs)**: http://localhost:5000/swagger

## 🔧 Настройка

### Изменение порта Backend

Отредактируйте `backend/SbomAnalyzer.Api/appsettings.json`:
```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:НОВЫЙ_ПОРТ"
      }
    }
  }
}
```

Затем обновите `src/services/apiService.ts`:
```typescript
const API_BASE_URL = 'http://localhost:НОВЫЙ_ПОРТ/api';
```

### Изменение порта Frontend

```bash
npm run dev -- --port 3000
```

## ❓ Часто задаваемые вопросы

### Q: Нужно ли удалять старый код?
**A:** Нет, старые файлы (`src/utils/`) остаются для обратной совместимости, но больше не используются.

### Q: Можно ли запустить только Frontend?
**A:** Нет, Frontend требует запущенный Backend для работы.

### Q: Как протестировать API?
**A:** Откройте http://localhost:5000/swagger и используйте интерактивную документацию.

### Q: Поддерживается ли старый формат данных?
**A:** Да, все форматы SBOM остались прежними (CycloneDX, SPDX).

### Q: Можно ли развернуть на production?
**A:** Да! См. раздел "Deployment" в [README_FULLSTACK.md](README_FULLSTACK.md).

## 🆘 Помощь

### Backend не запускается

```bash
# Проверьте установку .NET
dotnet --version

# Если не установлен, скачайте:
# https://dotnet.microsoft.com/download
```

### Frontend не запускается

```bash
# Проверьте установку Node.js
node --version

# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### CORS ошибки

Убедитесь что:
1. Backend запущен на http://localhost:5000
2. Frontend запущен на http://localhost:5173
3. CORS настройки в `Program.cs` включают эти порты

## 📊 Структура проекта

```
sbom-main/
├── backend/                    # .NET 8.0 Backend
│   └── SbomAnalyzer.Api/
│       ├── Controllers/        # API endpoints
│       ├── Services/          # Бизнес-логика
│       └── Models/            # Модели данных
├── src/                       # React Frontend
│   ├── components/            # UI компоненты
│   ├── services/             # API клиент
│   └── types/                # TypeScript типы
├── START_BACKEND.bat         # Запуск backend
├── START_FRONTEND.bat        # Запуск frontend
├── QUICKSTART.md            # Быстрый старт
└── SETUP.md                 # Подробная установка
```

## 🎓 Обучение

### Для начинающих
1. Прочитайте [QUICKSTART.md](QUICKSTART.md)
2. Запустите приложение
3. Изучите интерфейс
4. Попробуйте загрузить SBOM файл

### Для разработчиков
1. Прочитайте [SETUP.md](SETUP.md)
2. Изучите [README_FULLSTACK.md](README_FULLSTACK.md)
3. Откройте Swagger UI: http://localhost:5000/swagger
4. Изучите код в `backend/` и `src/`

### Для DevOps
1. Прочитайте секцию "Deployment" в [README_FULLSTACK.md](README_FULLSTACK.md)
2. Настройте production окружение
3. Настройте reverse proxy (Nginx/IIS)
4. Настройте HTTPS

## 🚀 Следующие шаги

1. **Запустите приложение** ([QUICKSTART.md](QUICKSTART.md))
2. **Протестируйте функционал** (загрузка SBOM, генерация из кода)
3. **Изучите API** (http://localhost:5000/swagger)
4. **Настройте под себя** ([SETUP.md](SETUP.md))
5. **Разверните в production** ([README_FULLSTACK.md](README_FULLSTACK.md))

## 💡 Полезные ссылки

- [.NET SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/)
- [ASP.NET Core Docs](https://docs.microsoft.com/aspnet/core)
- [React Docs](https://reactjs.org/)
- [CycloneDX](https://cyclonedx.org/)
- [SPDX](https://spdx.dev/)

## 🤝 Поддержка

Если у вас возникли проблемы:
1. Проверьте документацию выше
2. Прочитайте [SETUP.md](SETUP.md) раздел "Решение проблем"
3. Проверьте логи в консоли backend и frontend
4. Создайте issue с описанием проблемы

---

## 🎊 Готово к использованию!

Начните с **[QUICKSTART.md](QUICKSTART.md)** для быстрого старта!

**Приятной работы!** 🚀

