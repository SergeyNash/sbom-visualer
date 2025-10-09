# 🔧 Установка .NET SDK для работы с Backend

## ❌ Проблема

При попытке запустить backend появляется ошибка:
```
dotnet : команда "dotnet" не найдена
```

Это означает, что .NET SDK не установлен в системе.

## ✅ Решение

### Шаг 1: Скачивание .NET SDK

1. **Откройте браузер** и перейдите на:
   https://dotnet.microsoft.com/download/dotnet/8.0

2. **Выберите вашу операционную систему:**
   - **Windows** → .NET 8.0 SDK (x64)
   - **macOS** → .NET 8.0 SDK (x64)
   - **Linux** → .NET 8.0 SDK (x64)

3. **Скачайте установщик** (файл .exe для Windows, .pkg для macOS, .deb/.rpm для Linux)

### Шаг 2: Установка

#### Windows
1. **Запустите скачанный .exe файл**
2. **Следуйте инструкциям установщика**
3. **Перезагрузите терминал** (закройте и откройте заново)

#### macOS
1. **Запустите скачанный .pkg файл**
2. **Следуйте инструкциям установщика**
3. **Перезагрузите терминал**

#### Linux (Ubuntu/Debian)
```bash
# Скачайте пакет
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb

# Установите
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0
```

### Шаг 3: Проверка установки

Откройте новый терминал и выполните:

```bash
dotnet --version
```

Должно появиться что-то вроде:
```
8.0.xxx
```

### Шаг 4: Запуск Backend

После установки .NET SDK:

```bash
# Перейдите в директорию backend
cd backend/SbomAnalyzer.Api

# Восстановите зависимости (только первый раз)
dotnet restore

# Запустите backend
dotnet run
```

Должно появиться:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
```

## 🚀 Альтернативный способ (Автоматический)

### Windows
```bash
# Используйте Chocolatey (если установлен)
choco install dotnet-sdk

# Или используйте winget
winget install Microsoft.DotNet.SDK.8
```

### macOS
```bash
# Используйте Homebrew
brew install dotnet-sdk
```

## 🔍 Устранение проблем

### Проблема: "dotnet command not found" после установки

**Решение:**
1. **Перезагрузите терминал** полностью
2. **Перезагрузите компьютер**
3. **Проверьте PATH переменную**:
   ```bash
   # Windows
   echo $env:PATH
   
   # macOS/Linux
   echo $PATH
   ```
   
   Должна содержать путь к .NET (обычно что-то вроде `C:\Program Files\dotnet`)

### Проблема: "Permission denied"

**Решение (Linux/macOS):**
```bash
# Дайте права на выполнение
sudo chmod +x /usr/local/share/dotnet/dotnet
```

### Проблема: "Package not found"

**Решение (Linux):**
```bash
# Обновите список пакетов
sudo apt update

# Установите снова
sudo apt install -y dotnet-sdk-8.0
```

## 📚 Дополнительная информация

### Версии .NET
- **.NET 8.0** - Текущая LTS версия (рекомендуется)
- **.NET 6.0** - Предыдущая LTS версия
- **.NET 7.0** - Промежуточная версия

### Что включает .NET SDK
- **Компилятор** (.NET Compiler)
- **Runtime** (.NET Runtime)
- **CLI инструменты** (dotnet command)
- **Библиотеки** (.NET Standard Library)

### Проверка установленных версий
```bash
# Список всех установленных SDK
dotnet --list-sdks

# Список всех установленных runtime
dotnet --list-runtimes
```

## 🎯 После установки

1. **Установите .NET SDK** (инструкции выше)
2. **Перезагрузите терминал**
3. **Запустите backend**:
   ```bash
   cd backend/SbomAnalyzer.Api
   dotnet restore
   dotnet run
   ```
4. **Запустите frontend** (в новом терминале):
   ```bash
   npm run dev
   ```
5. **Откройте браузер**: http://localhost:5173

## 📞 Помощь

Если у вас возникли проблемы с установкой:

1. **Проверьте системные требования**:
   - Windows 10+ / macOS 10.15+ / Ubuntu 18.04+
   - 2GB RAM
   - 1GB свободного места

2. **Попробуйте разные способы установки** (установщик, пакетный менеджер)

3. **Проверьте права администратора** (Windows/Linux)

4. **Обратитесь к официальной документации**:
   - https://docs.microsoft.com/dotnet/core/install/

---

**После установки .NET SDK приложение будет работать полностью!** 🚀
