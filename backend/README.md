# SBOM Analyzer API - Backend

ASP.NET Core Web API для анализа Software Bill of Materials (SBOM).

## 🚀 Возможности

- **Парсинг SBOM файлов** - поддержка форматов CycloneDX и SPDX
- **Генерация SBOM** - из исходного кода (Node.js, Python, Java, .NET, Go, Rust, PHP)
- **Слияние SBOM** - объединение множественных SBOM файлов
- **Извлечение архивов** - поддержка ZIP, TAR.GZ
- **Фильтрация компонентов** - по типу, лицензии, уровню риска
- **REST API** - полнофункциональный API для интеграции

## 📋 Требования

- .NET 8.0 SDK или выше
- Windows, Linux или macOS

## 🛠️ Установка и запуск

### 1. Установка .NET SDK

Скачайте и установите .NET SDK с официального сайта:
https://dotnet.microsoft.com/download

### 2. Восстановление зависимостей

```bash
cd backend/SbomAnalyzer.Api
dotnet restore
```

### 3. Запуск приложения

```bash
dotnet run
```

API будет доступен по адресу: `http://localhost:5000`

Swagger UI (документация API): `http://localhost:5000/swagger`

### 4. Сборка для production

```bash
dotnet build --configuration Release
dotnet publish --configuration Release --output ./publish
```

## 📚 API Endpoints

### SBOM Management

#### `POST /api/sbom/upload`
Загрузка и парсинг одного SBOM файла
- **Request**: `multipart/form-data` с файлом
- **Response**: `List<SbomComponent>`

#### `POST /api/sbom/upload-multiple`
Загрузка и слияние нескольких SBOM файлов
- **Request**: `multipart/form-data` с несколькими файлами
- **Response**: `List<SbomComponent>`

#### `POST /api/sbom/validate`
Валидация формата SBOM файла
- **Request**: `multipart/form-data` с файлом
- **Response**: `{ valid: boolean }`

#### `POST /api/sbom/merge`
Слияние списков компонентов
- **Request**: `List<List<SbomComponent>>`
- **Response**: `List<SbomComponent>`

#### `POST /api/sbom/deduplicate`
Дедупликация компонентов
- **Request**: `List<SbomComponent>`
- **Response**: `List<SbomComponent>`

#### `POST /api/sbom/filter`
Фильтрация компонентов
- **Request**: `FilterComponentsRequest`
- **Response**: `List<SbomComponent>`

### SBOM Generation

#### `GET /api/generator/project-types`
Получение списка поддерживаемых типов проектов
- **Response**: `List<ProjectType>`

#### `POST /api/generator/detect-project-type`
Определение типа проекта по загруженным файлам
- **Request**: `multipart/form-data` с файлами
- **Response**: `ProjectType`

#### `POST /api/generator/generate-from-code`
Генерация SBOM из исходного кода
- **Request**: `multipart/form-data` с файлами + `GenerationOptions`
- **Response**: `GenerationResult`

#### `POST /api/generator/generate-from-archive`
Генерация SBOM из архива
- **Request**: `multipart/form-data` с архивом + `GenerationOptions`
- **Response**: `GenerationResult`

### Archive Management

#### `POST /api/archive/extract`
Извлечение файлов из архива
- **Request**: `multipart/form-data` с архивом
- **Response**: `ArchiveExtractionResult`

#### `GET /api/archive/is-supported`
Проверка поддержки формата архива
- **Query**: `fileName` (string)
- **Response**: `{ supported: boolean }`

## 🏗️ Архитектура

```
SbomAnalyzer.Api/
├── Controllers/           # API контроллеры
│   ├── SbomController.cs
│   ├── GeneratorController.cs
│   └── ArchiveController.cs
├── Services/             # Бизнес-логика
│   ├── SbomParserService.cs
│   ├── SbomGeneratorService.cs
│   ├── SbomMergerService.cs
│   └── ArchiveExtractorService.cs
├── Models/               # Модели данных
│   ├── SbomComponent.cs
│   ├── SbomFile.cs
│   ├── GenerationOptions.cs
│   └── ArchiveExtractionResult.cs
└── Program.cs            # Точка входа приложения
```

## 🔧 Конфигурация

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5000"
      }
    }
  }
}
```

### CORS

API настроен на работу с фронт-ендом на портах:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (альтернативный порт)

Для изменения CORS политики отредактируйте `Program.cs`.

## 📦 NuGet пакеты

- **Microsoft.AspNetCore.OpenApi** - OpenAPI спецификация
- **Swashbuckle.AspNetCore** - Swagger UI
- **System.Text.Json** - JSON сериализация
- **SharpCompress** - работа с архивами
- **System.Xml.XmlDocument** - парсинг XML

## 🧪 Тестирование API

### Использование Swagger UI

1. Запустите приложение
2. Откройте `http://localhost:5000/swagger`
3. Используйте интерактивную документацию для тестирования endpoints

### Использование curl

```bash
# Загрузка SBOM файла
curl -X POST "http://localhost:5000/api/sbom/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/sbom.json"

# Получение поддерживаемых типов проектов
curl -X GET "http://localhost:5000/api/generator/project-types"

# Генерация SBOM из package.json
curl -X POST "http://localhost:5000/api/generator/generate-from-code" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@package.json" \
  -F "options.projectType=nodejs" \
  -F "options.includeDevDependencies=true"
```

## 🔐 Безопасность

- Ограничение размера загружаемых файлов: 10MB на файл, 100MB на запрос
- Валидация входных данных
- CORS политика для защиты от XSS
- Sanitization данных перед обработкой

## 🐛 Отладка

Для включения подробного логирования установите уровень в `appsettings.Development.json`:

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

## 📝 Примеры использования

### Парсинг SBOM файла

```csharp
var client = new HttpClient();
var content = new MultipartFormDataContent();
var fileContent = new ByteArrayContent(File.ReadAllBytes("sbom.json"));
content.Add(fileContent, "file", "sbom.json");

var response = await client.PostAsync("http://localhost:5000/api/sbom/upload", content);
var components = await response.Content.ReadFromJsonAsync<List<SbomComponent>>();
```

### Генерация SBOM из кода

```csharp
var client = new HttpClient();
var content = new MultipartFormDataContent();

var packageJson = new ByteArrayContent(File.ReadAllBytes("package.json"));
content.Add(packageJson, "files", "package.json");
content.Add(new StringContent("nodejs"), "options.projectType");
content.Add(new StringContent("true"), "options.includeDevDependencies");

var response = await client.PostAsync(
    "http://localhost:5000/api/generator/generate-from-code", 
    content
);
var result = await response.Content.ReadFromJsonAsync<GenerationResult>();
```

## 🤝 Интеграция с фронт-ендом

Фронт-енд должен отправлять запросы на `http://localhost:5000/api/...`

Пример настройки в React/TypeScript:

```typescript
const API_BASE_URL = 'http://localhost:5000/api';

export const uploadSbom = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE_URL}/sbom/upload`, {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};
```

## 📄 Лицензия

MIT License

## 👥 Авторы

SBOM Analyzer Team

