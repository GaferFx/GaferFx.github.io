# GaferFx portfolio

Сборка использует Bun и его встроенный YAML-парсер `Bun.YAML.parse` — дополнительные npm-пакеты для YAML не нужны.

Портфолио собирается из списка проектов в `projects.yml`. HTML не нужно редактировать при добавлении нового видео: добавь один YAML-блок, запусти сборку и проверь результат.

## Быстрый старт

1. Открой `projects.yml`.
2. Добавь проект в нужное место списка.
3. Запусти локальную сборку:

   ```bash
   bun run scripts/build-projects.ts
   ```

4. Запусти локальный сервер из корня проекта, потому что браузер блокирует `fetch()` локальных JSON-файлов через `file://`:

   ```bash
bunx serve . -l 8000
   ```

5. Открой `http://localhost:8000/index.html`.

Генератор создаёт `projects.json`. Это локальный производный артефакт: он добавлен в `.gitignore`, не коммитится и не редактируется вручную. GitHub Actions пересоздаёт его во время деплоя.

## Формат `projects.yml`

Минимальная запись содержит `url` и `title`:

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
  title: Название видео
```

Порядок карточек на сайте точно совпадает с порядком записей в YAML.

### Все поддерживаемые поля

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
  title: Название видео
  provider: youtube
  thumbnail: https://example.com/my-thumbnail.jpg
  embed: true
  hidden: false
```

| Поле | Обязательное | Значение | Назначение |
| --- | --- | --- | --- |
| `url` | да | URL | Ссылка на видео или страницу ресурса. |
| `title` | да | строка | Заголовок проекта под превью. |
| `provider` | нет | идентификатор | Явно задаёт видеохостинг. Если пропустить, он определяется по домену URL. |
| `thumbnail` | нет | URL или путь | Ручная обложка. Для YouTube она создаётся автоматически, если поле не указано. |
| `embed` | нет | `true` / `false` | Разрешает встроенный плеер. `false` принудительно открывает ссылку в новой вкладке. |
| `hidden` | нет | `true` / `false` | Временно скрывает проект, не удаляя его из YAML. |

### Пример с дополнительными полями

```yaml
- url: https://example.com/video/123
  title: Experimental cut
  provider: browser
  thumbnail: /assets/projects/experimental.jpg
  embed: false
  hidden: false
```

`thumbnail` может быть абсолютным URL (`https://...`) или путём внутри сайта (`/assets/projects/...`). Если обложки нет и хостинг не умеет автоматически её предоставить, карточка всё равно будет создана, но изображение может быть пустым — для таких ресурсов лучше указывать `thumbnail` вручную.

## Автоматическое определение провайдера

Если `provider` не задан, `scripts/build-projects.ts` использует домен:

- `youtube.com`, `youtu.be` → `youtube`;
- `vk.com`, `vk.ru`, `vkvideo.ru` → `vkvideo`;
- `vimeo.com` → `vimeo`;
- `rutube.ru` → `rutube`;
- `twitch.tv` → `twitch`;
- `dailymotion.com` → `dailymotion`;
- любой другой домен → `browser`.

Явное поле `provider` всегда имеет приоритет над автоматическим определением.

## Embed и fallback

Сайт открывает модальный плеер только для провайдера, у которого есть реализованный адаптер и извлечён идентификатор видео. Сейчас в генераторе и интерфейсе подготовлены:

- YouTube — `youtube-nocookie.com/embed/...`;
- Vimeo — `player.vimeo.com/video/...`;
- Rutube — `rutube.ru/play/embed/...`.

Для VK Video, Twitch, Dailymotion и неизвестных ресурсов пока используется безопасный fallback: ссылка открывается в новой вкладке. Это сделано потому, что URL этих сервисов могут требовать дополнительные параметры, домен `parent`, player ID или приватный hash. Провайдер и бейдж уже сохраняются в данных, поэтому новые адаптеры можно добавить в `index.html` без изменения YAML-схемы.

Если нужно принудительно отключить embed у поддерживаемого сервиса:

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
  title: Open externally
  embed: false
```

## Добавление нового проекта

Добавь запись в нужную позицию:

```yaml
- url: https://youtu.be/VIDEO_ID
  title: Новая работа
```

Для YouTube достаточно URL и названия. Генератор сам определит провайдера и построит стандартную обложку. Для неизвестного сайта укажи собственную обложку и отключи embed:

```yaml
- url: https://host.example/watch/123
  title: Работа на другом хостинге
  thumbnail: /assets/projects/other-host.jpg
  embed: false
```

Чтобы временно спрятать запись:

```yaml
- url: https://...
  title: Черновик
  hidden: true
```

Запись останется в списке и вернётся на сайт после `hidden: false`.

## GitHub Pages и GitHub Actions

Workflow находится в `.github/workflows/deploy.yml`. При push в ветку `main` он:

1. забирает репозиторий;
2. запускает `bun run scripts/build-projects.ts`;
3. создаёт свежий `projects.json`;
4. загружает весь проект как Pages artifact;
5. публикует сайт через GitHub Pages в окружение `github-pages`.

Запуск также можно сделать вручную через **Actions → Build and deploy to GitHub Pages → Run workflow**.

В настройках репозитория открой **Settings → Pages** и выбери **GitHub Actions** как источник публикации. Если GitHub Pages уже настроен через workflow, дополнительных настроек обычно не требуется.

Важно: workflow публикует `index.html` и созданный во время сборки `projects.json`. Локально перед просмотром сайта нужно запускать генератор, потому что браузеру нужен этот JSON для загрузки списка проектов.

## Проверка перед push

```bash
bun run scripts/build-projects.ts
bunx serve . -l 8000
```

После проверки:

```bash
git add projects.yml scripts/build-projects.ts .github/workflows/deploy.yml index.html README.md .gitignore
git commit -m "Build portfolio projects from YAML"
git push origin main
```

Не добавляй в YAML приватные ссылки или токены. Для публичного портфолио превью и embed должны быть доступны посетителям без авторизации.
