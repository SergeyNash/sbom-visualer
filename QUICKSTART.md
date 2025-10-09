# ⚡ Quick Start Guide

Быстрый старт для SBOM Analyzer в 3 шага.

## 📋 Что нужно установить

1. **.NET 8.0 SDK**: https://dotnet.microsoft.com/download
2. **Node.js 18+**: https://nodejs.org/

## 🚀 Запуск за 3 шага

### Шаг 1: Установка зависимостей

```bash
# В корневой директории проекта
npm install
```

### Шаг 2: Запуск Backend

**Вариант A - Windows** (двойной клик):
```
START_BACKEND.bat
```

**Вариант B - Командная строка**:
```bash
cd backend/SbomAnalyzer.Api
dotnet run
```

✅ Backend готов: http://localhost:5000

### Шаг 3: Запуск Frontend

Откройте **новый терминал**:

**Вариант A - Windows** (двойной клик):
```
START_FRONTEND.bat
```

**Вариант B - Командная строка**:
```bash
npm run dev
```

✅ Приложение готово: http://localhost:5173

## 🎯 Готово!

Откройте браузер: **http://localhost:5173**

## 📚 Дополнительно

- **API документация**: http://localhost:5000/swagger
- **Полное руководство**: [SETUP.md](SETUP.md)
- **Документация**: [README_FULLSTACK.md](README_FULLSTACK.md)

## ❓ Проблемы?

1. Убедитесь что установлены .NET SDK и Node.js
2. Проверьте что порты 5000 и 5173 свободны
3. Перезапустите терминалы
4. Смотрите [SETUP.md](SETUP.md) для деталей

---

**Приятного использования!** 🎉

