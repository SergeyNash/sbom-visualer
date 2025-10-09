# SBOM Analyzer - Setup Guide

Пошаговая инструкция по установке и запуску приложения.

## 📋 Системные требования

### Минимальные требования
- **ОС**: Windows 10+, macOS 10.15+, или Linux
- **RAM**: 4 GB
- **Диск**: 2 GB свободного места
- **Интернет**: Для установки зависимостей

### Необходимое ПО

#### Backend (.NET)
- **.NET 8.0 SDK** или выше
- Скачать: https://dotnet.microsoft.com/download

#### Frontend (Node.js)
- **Node.js 18+** (LTS рекомендуется)
- **npm** (устанавливается вместе с Node.js)
- Скачать: https://nodejs.org/

## 🚀 Установка

### Шаг 1: Установка .NET SDK

#### Windows
1. Скачайте установщик: https://dotnet.microsoft.com/download/dotnet/8.0
2. Запустите установщик и следуйте инструкциям
3. Перезагрузите терминал
4. Проверьте установку:
```bash
dotnet --version
```

#### macOS
```bash
brew install dotnet-sdk
```

#### Linux (Ubuntu/Debian)
```bash
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0
```

### Шаг 2: Установка Node.js

#### Windows
1. Скачайте установщик LTS: https://nodejs.org/
2. Запустите установщик и следуйте инструкциям
3. Перезагрузите терминал
4. Проверьте установку:
```bash
node --version
npm --version
```

#### macOS
```bash
brew install node
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Шаг 3: Клонирование проекта

```bash
git clone <repository-url>
cd sbom-main
```

## ▶️ Запуск приложения

### Вариант 1: Использование готовых скриптов (Windows)

#### 1. Запуск Backend
Двойной клик на `START_BACKEND.bat` или в терминале:
```bash
START_BACKEND.bat
```

#### 2. Запуск Frontend
Откройте новый терминал и двойной клик на `START_FRONTEND.bat` или:
```bash
START_FRONTEND.bat
```

### Вариант 2: Ручной запуск

#### 1. Запуск Backend

**Windows/macOS/Linux:**
```bash
# Перейти в директорию backend
cd backend/SbomAnalyzer.Api

# Восстановить зависимости
dotnet restore

# Запустить сервер
dotnet run
```

✅ **Backend запущен!**
- API: http://localhost:5000
- Swagger UI: http://localhost:5000/swagger

#### 2. Запуск Frontend

Откройте **новый терминал** в корневой директории проекта:

```bash
# Установить зависимости (только первый раз)
npm install

# Запустить dev server
npm run dev
```

✅ **Frontend запущен!**
- Приложение: http://localhost:5173

### Вариант 3: Одновременный запуск (Linux/macOS)

Создайте скрипт `start-all.sh`:

```bash
#!/bin/bash

# Запуск backend в фоне
cd backend/SbomAnalyzer.Api
dotnet run &
BACKEND_PID=$!

# Возврат в корень и запуск frontend
cd ../..
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop all services"

# Ожидание и остановка при Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
```

Сделайте скрипт исполняемым и запустите:
```bash
chmod +x start-all.sh
./start-all.sh
```

## ✅ Проверка работы

1. **Проверьте Backend**:
   - Откройте http://localhost:5000/swagger
   - Должна отобразиться документация Swagger UI

2. **Проверьте Frontend**:
   - Откройте http://localhost:5173
   - Должен отобразиться интерфейс SBOM Analyzer

3. **Тестовая загрузка**:
   - Нажмите "Upload SBOM" в интерфейсе
   - Загрузите тестовый SBOM файл
   - Данные должны отобразиться в таблице

## 🐛 Решение проблем

### Backend не запускается

**Проблема**: "dotnet command not found"
```bash
# Решение: Установите .NET SDK
# https://dotnet.microsoft.com/download
```

**Проблема**: "Port 5000 already in use"
```bash
# Решение: Измените порт в appsettings.json
# backend/SbomAnalyzer.Api/appsettings.json
{
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5001"  // Измените порт
      }
    }
  }
}
```

**Проблема**: "Unable to find package"
```bash
# Решение: Очистите NuGet кэш
dotnet nuget locals all --clear
dotnet restore
```

### Frontend не запускается

**Проблема**: "node command not found"
```bash
# Решение: Установите Node.js
# https://nodejs.org/
```

**Проблема**: "Port 5173 already in use"
```bash
# Решение: Vite автоматически выберет другой порт
# Или укажите порт вручную:
npm run dev -- --port 3000
```

**Проблема**: "Cannot find module"
```bash
# Решение: Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### CORS ошибки

**Проблема**: "CORS policy: No 'Access-Control-Allow-Origin' header"

```csharp
// Решение: Обновите CORS в backend/SbomAnalyzer.Api/Program.cs
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

### API недоступен

**Проблема**: Frontend не может подключиться к backend

```typescript
// Решение: Проверьте URL в src/services/apiService.ts
const API_BASE_URL = 'http://localhost:5000/api';  // Должен совпадать с портом backend
```

## 📦 Production Build

### Backend

```bash
cd backend/SbomAnalyzer.Api

# Сборка для production
dotnet publish --configuration Release --output ./publish

# Запуск production версии
cd publish
dotnet SbomAnalyzer.Api.dll
```

### Frontend

```bash
# Сборка для production
npm run build

# Результат в директории dist/
# Загрузите содержимое на веб-сервер
```

## 🔧 Дополнительные настройки

### Изменение портов

**Backend** (`backend/SbomAnalyzer.Api/appsettings.json`):
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

**Frontend** (`src/services/apiService.ts`):
```typescript
const API_BASE_URL = 'http://localhost:ПОРТ_BACKEND/api';
```

### Включение HTTPS

**Backend** (`backend/SbomAnalyzer.Api/appsettings.json`):
```json
{
  "Kestrel": {
    "Endpoints": {
      "Https": {
        "Url": "https://localhost:5001",
        "Certificate": {
          "Path": "cert.pfx",
          "Password": "password"
        }
      }
    }
  }
}
```

### Изменение лимитов файлов

**Backend** (`backend/SbomAnalyzer.Api/Program.cs`):
```csharp
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104857600; // 100MB
});

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 104857600; // 100MB
});
```

## 📝 Дополнительная информация

### Документация
- **Backend API**: http://localhost:5000/swagger
- **Backend README**: [backend/README.md](backend/README.md)
- **Frontend README**: [README.md](README.md)
- **Full Stack README**: [README_FULLSTACK.md](README_FULLSTACK.md)

### Команды разработки

**Backend**:
```bash
dotnet run           # Запуск
dotnet build         # Сборка
dotnet test          # Тесты
dotnet publish       # Публикация
```

**Frontend**:
```bash
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # Линтинг
npm test             # Тесты
```

## 🎓 Обучающие материалы

- [.NET Documentation](https://docs.microsoft.com/dotnet/)
- [ASP.NET Core Tutorial](https://docs.microsoft.com/aspnet/core/tutorials/)
- [React Tutorial](https://reactjs.org/tutorial/tutorial.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

## 💡 Советы

1. **Используйте Swagger UI** для тестирования API endpoints
2. **React DevTools** помогут отлаживать frontend
3. **Проверяйте Network tab** в браузере для отладки API запросов
4. **Читайте логи** backend в консоли для диагностики проблем
5. **Используйте TypeScript** для type safety

## 🤝 Поддержка

Если у вас возникли проблемы:
1. Проверьте этот документ на наличие решений
2. Проверьте логи backend и frontend
3. Создайте issue в репозитории с описанием проблемы

---

**Готово!** Приложение должно работать и быть доступно по адресу http://localhost:5173

Приятного использования! 🎉

