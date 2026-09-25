# GaferFx portfolio

Статический сайт-портфолио. Сборка — только Bun, без npm-зависимостей и фреймворков: `projects.yml` превращается в готовый HTML ещё на этапе сборки, клиент получает сразу вёрстку, минифицированные CSS/JS и хешированные ассеты.

## Структура

```
index.html          # шаблон страницы (маркер <!--PROJECTS--> подменяется карточками)
projects.yml        # список проектов — единственный файл, который правится при добавлении работ
src/
  styles.css        # стили
  main.js           # клиентский JS: шапка, перевод, модальный плеер
public/             # статика (картинки, видео), попадает в dist с хешем в имени
  thumbnails/       # скачанные превью видео (генерируются, в .gitignore)
scripts/
  site/             # генерация карточек: projects.yml → HTML
    index.ts        # renderPage() — оркестрация
    config.ts       # пути, маркеры
    projects.ts     # типы и валидация projects.yml
    render.ts       # резолв проекта и HTML карточки
    thumbnails.ts   # скачивание превью и размеры картинок
    imageSize.ts    # размеры PNG/JPEG/GIF/WebP из байтов
    cache.ts        # дисковый кэш метаданных провайдеров (.cache/)
    net.ts          # fetch-обёртки (UA, таймауты)
    providers/      # по файлу на видеохостинг + реестр в index.ts
  build.ts          # прод-сборка → dist/
  dev.ts            # dev-сервер (Bun HMR)
```

## Локальная разработка

```bash
bun run dev
```

Открой `http://localhost:8000`. Сервер рендерит `projects.yml` + `index.html` в `index.gen.html` и отдаёт его через `Bun.serve` с `development: true` — нативный HMR Bun: правки `src/styles.css` подменяются без перезагрузки, JS/разметка/ассеты перезагружают страницу. За `index.html` и `projects.yml` следит отдельный watcher — они триггерят перерендер. Правки в `scripts/` перезапускают процесс через `bun --watch`.

Метаданные провайдеров (превью, размеры, названия) кэшируются в `.cache/site.json` — повторные рендеры не ходят в сеть. Чтобы принудительно обновить, удали `.cache/`.

Порт можно сменить: `PORT=3000 bun run dev`.

## Прод-сборка

```bash
bun run build
```

Результат в `dist/`:

- `index.html` — готовая страница со всеми карточками проектов, минифицированная;
- JS и CSS — собраны и минифицированы `Bun.build`;
- ассеты из `public/` — скопированы с content-hash в имени, все ссылки переписаны автоматически.

`dist/`, `index.gen.html`, `index.build.html`, `public/thumbnails/` и `.cache/` в `.gitignore` — это производные артефакты, GitHub Actions пересоздаёт их при деплое.

## Формат `projects.yml`

Минимальная запись — один `url`, остальное подтянется автоматически:

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
```

Порядок карточек на сайте точно совпадает с порядком записей в YAML.

### Все поддерживаемые поля

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
  title: Название видео
  provider: youtube
  thumbnail: https://example.com/my-thumbnail.jpg
  aspect-ratio: '16 / 9'
  embed: true
  hidden: false
```

| Поле | Обязательное | Значение | Назначение |
| --- | --- | --- | --- |
| `url` | да* | URL | Ссылка на видео или страницу ресурса. |
| `title` | нет* | строка | Заголовок проекта под превью. Без него берётся из метаданных провайдера. |
| `provider` | нет | идентификатор | Явно задаёт видеохостинг. Если пропустить, он определяется по домену URL. |
| `thumbnail` | нет | URL или путь | Ручная обложка; в приоритете над автоматической. |
| `image` | нет | URL или путь | Картинка карточки (для статичных проектов без `url` — обязательна). |
| `aspect-ratio` | нет | `'w / h'` | Ручной override соотношения сторон превью. |
| `embed` | нет | `true` / `false` | Разрешает встроенный плеер. `false` принудительно открывает ссылку в новой вкладке. |
| `hidden` | нет | `true` / `false` | Временно скрывает проект, не удаляя его из YAML. |

\* У записи обязательны `url` или `image`; `title` обязателен только когда нет `url` — название видео подтягивается из API провайдера.

Для статичной картинки вместо `url` укажи `image`:

```yaml
- image: /public/poster.jpg
  title: Название картинки
```

### Автоматическое определение провайдера

Если `provider` не задан, `scripts/site/providers/` использует домен:

- `youtube.com`, `youtu.be` → `youtube`;
- `vk.com`, `vk.ru`, `vkvideo.ru` → `vkvideo`;
- `vimeo.com` → `vimeo`;
- `rutube.ru` → `rutube`;
- `twitch.tv` → `twitch`;
- `dailymotion.com`, `dai.ly` → `dailymotion`;
- любой другой домен → `browser`.

Явное поле `provider` всегда имеет приоритет над автоматическим определением.

### Embed и превью

На этапе сборки провайдер резолвит видео: строит embed-URL (`data-embed` на кнопке), превью, название и aspect-ratio — всё это попадает в HTML, клиентский JS провайдерскую логику не дублирует.

- **YouTube** — `youtube-nocookie.com/embed/…`, превью `i.ytimg.com`, метаданные из oEmbed;
- **VK Video** — `vkvideo.ru/video_ext.php?…`, превью и метаданные из `video.get` (скачиваются, CDN-ссылки протухают);
- **Vimeo** — `player.vimeo.com/video/…`, превью и метаданные из oEmbed (хотлинк);
- **Rutube** — `rutube.ru/play/embed/…`, превью из API (скачивается);
- **Dailymotion** — `dailymotion.com/embed/video/…`, превью и метаданные из oEmbed (скачивается);
- **Twitch** — только эмбед `player.twitch.tv` / `clips.twitch.tv` (`{host}` в URL подставляется на клиенте); превью требует API-токен, не реализовано;
- неизвестные ресурсы (`browser`) — ссылка в новой вкладке.

Приоритет превью: `thumbnail` → `image` → превью провайдера. Если провайдерское превью не скачалось, карточка остаётся с remote URL или без картинки.

### Aspect-ratio

`--project-img-ratio` карточки вычисляется автоматически:

1. `aspect-ratio` из YAML (ручной override — приоритет);
2. реальные размеры видео из метаданных провайдера;
3. размеры скачанного превью или своей `image`/`thumbnail` (парсятся из байтов);
4. `16 / 9` — дефолт.

Близкие значения приводятся к стандартным соотношениям (`16 / 9`, `9 / 16`, `4 / 3`, `1 / 1`, `21 / 9` и т.п.). Модальный плеер всегда 16:9.

Чтобы принудительно отключить embed у поддерживаемого сервиса:

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
  title: Open externally
  embed: false
```

## Добавление нового проекта

Добавь запись в нужную позицию `projects.yml` — для известных хостингов достаточно одного URL:

```yaml
- url: https://youtu.be/VIDEO_ID
```

Для неизвестного сайта укажи собственную обложку и отключи embed:

```yaml
- url: https://host.example/watch/123
  title: Работа на другом хостинге
  thumbnail: https://example.com/cover.jpg
  embed: false
```

Чтобы временно спрятать запись:

```yaml
- url: https://...
  title: Черновик
  hidden: true
```

## GitHub Pages и GitHub Actions

Workflow находится в `.github/workflows/deploy.yml`. При push в ветку `main` он:

1. забирает репозиторий;
2. запускает `bun run build`;
3. загружает `dist/` как Pages artifact;
4. публикует сайт через GitHub Pages в окружение `github-pages`.

Запуск также можно сделать вручную через **Actions → Build and deploy to GitHub Pages → Run workflow**.

В настройках репозитория открой **Settings → Pages** и выбери **GitHub Actions** как источник публикации.

## Проверка перед push

```bash
bun run build        # собрать dist/
bunx serve dist -l 8000   # или любой статик-сервер, посмотреть результат
```

Не добавляй в YAML приватные ссылки или токены. Для публичного портфолио превью и embed должны быть доступны посетителям без авторизации.
