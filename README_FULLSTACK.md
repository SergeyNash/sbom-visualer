# SBOM Analyzer - Full Stack Application

Интерактивное веб-приложение для визуализации и анализа Software Bill of Materials (SBOM) с архитектурой клиент-сервер.

## 🏗️ Архитектура

Приложение разделено на две части:

```
sbom-main/
├── backend/                 # .NET 8.0 Web API
│   └── SbomAnalyzer.Api/   # ASP.NET Core проект
└── src/                     # React + TypeScript фронтенд
```

### Backend (ASP.NET Core Web API)

- **Язык**: C# / .NET 8.0
- **Фреймворк**: ASP.NET Core
- **Порт**: `http://localhost:5000`
- **Документация API**: `http://localhost:5000/swagger`

**Основной функционал:**
- Парсинг SBOM файлов (CycloneDX, SPDX)
- Генерация SBOM из исходного кода (7 языков)
- Слияние множественных SBOM
- Извлечение архивов (ZIP, TAR.GZ)
- Фильтрация и валидация данных

### Frontend (React + TypeScript)

- **Язык**: TypeScript
- **Фреймворк**: React 18
- **Build Tool**: Vite
- **Порт**: `http://localhost:5173`
- **UI**: Tailwind CSS

**Основной функционал:**
- Интерактивная визуализация SBOM
- Drag & Drop загрузка файлов
- Дерево зависимостей
- Фильтрация и поиск компонентов
- Оценка рисков безопасности

## 🚀 Быстрый старт

### Предварительные требования

#### Backend
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download) или выше

#### Frontend
- [Node.js 18+](https://nodejs.org/)
- npm или yarn

### Установка и запуск

#### 1. Запуск Backend

```bash
# Перейти в директорию backend
cd backend/SbomAnalyzer.Api

# Восстановить зависимости
dotnet restore

# Запустить API сервер
dotnet run
```

✅ Backend запущен на `http://localhost:5000`  
✅ Swagger UI доступен на `http://localhost:5000/swagger`

#### 2. Запуск Frontend

Откройте новый терминал:

```bash
# Перейти в корневую директорию проекта
cd sbom-main

# Установить зависимости
npm install

# Запустить dev server
npm run dev
```

✅ Frontend запущен на `http://localhost:5173`

#### 3. Открыть приложение

Откройте браузер и перейдите по адресу: `http://localhost:5173`

## 📖 Использование

### 1. Загрузка SBOM файлов

1. Нажмите кнопку **"Upload SBOM"**
2. Выберите или перетащите JSON файл в формате CycloneDX или SPDX
3. Первый файл загружается автоматически
4. Для слияния нескольких файлов нажмите **"Merge & Load All"**

### 2. Генерация SBOM из кода

1. Нажмите кнопку **"Generate from Code"**
2. Загрузите файлы проекта или ZIP архив
3. Система автоматически определит тип проекта
4. Настройте опции генерации (опционально)
5. Нажмите **"Generate SBOM"**

Поддерживаемые языки:
- 📦 **Node.js** (package.json)
- 🐍 **Python** (requirements.txt, pyproject.toml)
- ☕ **Java** (pom.xml, build.gradle)
- 🔷 **.NET** (*.csproj)
- 🐹 **Go** (go.mod)
- 🦀 **Rust** (Cargo.toml)
- 🐘 **PHP** (composer.json)

### 3. Работа с данными

- **Сортировка**: Кликните по заголовку столбца в таблице
- **Фильтрация**: Используйте панель фильтров сверху
- **Поиск**: Введите название компонента в строку поиска
- **Детали**: Кликните по компоненту для просмотра подробной информации
- **Дерево зависимостей**: Интерактивная визуализация связей

## 🔧 Разработка

### Backend

```bash
cd backend/SbomAnalyzer.Api

# Запуск в режиме разработки
dotnet run

# Сборка для production
dotnet build --configuration Release

# Публикация
dotnet publish --configuration Release --output ./publish
```

### Frontend

```bash
# Запуск dev server
npm run dev

# Сборка для production
npm run build

# Preview production build
npm run preview

# Линтинг
npm run lint

# Тестирование
npm test
```

## 📁 Структура проекта

```
sbom-main/
├── backend/
│   └── SbomAnalyzer.Api/
│       ├── Controllers/         # API контроллеры
│       ├── Services/           # Бизнес-логика
│       ├── Models/             # Модели данных
│       ├── Program.cs          # Точка входа
│       └── README.md           # Backend документация
├── src/
│   ├── components/             # React компоненты
│   ├── services/              # API клиент
│   │   └── apiService.ts      # HTTP запросы к backend
│   ├── types/                 # TypeScript типы
│   ├── utils/                 # Утилиты (deprecated)
│   ├── data/                  # Mock данные
│   └── App.tsx                # Главный компонент
├── public/                    # Статические файлы
├── dist/                      # Production build
├── package.json              # Frontend dependencies
└── README.md                 # Frontend документация
```

## 🔌 API Endpoints

### SBOM Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sbom/upload` | Загрузка одного SBOM файла |
| POST | `/api/sbom/upload-multiple` | Загрузка нескольких SBOM файлов |
| POST | `/api/sbom/validate` | Валидация SBOM файла |
| POST | `/api/sbom/merge` | Слияние компонентов |
| POST | `/api/sbom/filter` | Фильтрация компонентов |

### SBOM Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/generator/project-types` | Список поддерживаемых языков |
| POST | `/api/generator/detect-project-type` | Определение типа проекта |
| POST | `/api/generator/generate-from-code` | Генерация из исходников |
| POST | `/api/generator/generate-from-archive` | Генерация из архива |

### Archive Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/archive/extract` | Извлечение файлов из архива |
| GET | `/api/archive/is-supported` | Проверка поддержки формата |

Полная документация API доступна на `http://localhost:5000/swagger`

## 🌐 CORS

Backend настроен на работу с фронтендом на следующих портах:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (альтернативный)

Для изменения CORS политики отредактируйте `backend/SbomAnalyzer.Api/Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

## 🔒 Безопасность

- **Ограничение размера файлов**: 10MB на файл, 100MB на запрос
- **Валидация входных данных** на backend
- **CORS политика** для защиты от XSS
- **Sanitization данных** перед обработкой
- **Type safety** с TypeScript на фронтенде
- **Input validation** с ASP.NET Core

## 📊 Производительность

### Backend
- **Парсинг SBOM**: ~50ms для 100 компонентов
- **Генерация SBOM**: зависит от размера проекта
- **Извлечение архивов**: поддержка до 10000 файлов

### Frontend
- **Рендеринг**: ~16ms (60 FPS)
- **Ленивая загрузка**: 20 элементов за раз
- **Оптимизация**: useMemo для тяжелых вычислений

## 🐛 Отладка

### Backend

Включите подробное логирование в `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  }
}
```

Логи доступны в консоли сервера.

### Frontend

Откройте DevTools браузера (F12):
- **Console**: ошибки JavaScript
- **Network**: HTTP запросы к API
- **React DevTools**: состояние компонентов

## 🚀 Deployment

### Backend

1. **Сборка**:
```bash
cd backend/SbomAnalyzer.Api
dotnet publish --configuration Release --output ./publish
```

2. **Настройка производственного окружения**:
   - Обновите `appsettings.json` с production настройками
   - Настройте HTTPS
   - Настройте reverse proxy (IIS, Nginx)

3. **Запуск**:
```bash
cd publish
dotnet SbomAnalyzer.Api.dll
```

### Frontend

1. **Сборка**:
```bash
npm run build
```

2. **Деплой**:
   - Загрузите содержимое директории `dist/` на веб-сервер
   - Настройте веб-сервер для SPA (redirect на index.html)
   - Обновите `API_BASE_URL` в `src/services/apiService.ts` на production URL

## 🧪 Тестирование

### Backend
```bash
cd backend/SbomAnalyzer.Api
dotnet test
```

### Frontend
```bash
npm test
```

## 📝 Поддерживаемые форматы

### SBOM Formats
- **CycloneDX** 1.4+ (JSON)
- **SPDX** 2.3+ (JSON)

### Archive Formats
- **ZIP**
- **TAR.GZ** (planned)

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License

## 👥 Команда

SBOM Analyzer Team

---

**Версия**: 2.0 (Full Stack)  
**Дата**: 2025

## 🔗 Полезные ссылки

- [.NET Documentation](https://docs.microsoft.com/dotnet/)
- [React Documentation](https://reactjs.org/)
- [CycloneDX Specification](https://cyclonedx.org/)
- [SPDX Specification](https://spdx.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

