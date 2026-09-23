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
scripts/
  site.ts           # общая логика: projects.yml → HTML карточек
  build.ts          # прод-сборка → dist/
  dev.ts            # dev-сервер с live reload
```

## Локальная разработка

```bash
bun run dev
```

Открой `http://localhost:8000`. Сервер отдаёт свежесгенерированную страницу и перезагружает браузер при изменении `index.html`, `projects.yml`, `src/` или `public/` (live reload через SSE, без зависимостей).

Порт можно сменить: `PORT=3000 bun run dev`.

## Прод-сборка

```bash
bun run build
```

Результат в `dist/`:

- `index.html` — готовая страница со всеми карточками проектов, минифицированная;
- JS и CSS — собраны и минифицированы `Bun.build`;
- ассеты из `public/` — скопированы с content-hash в имени, все ссылки переписаны автоматически.

`dist/` в `.gitignore` — это производный артефакт, GitHub Actions пересоздаёт его при деплое.

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

Для статичной картинки вместо `url` укажи `image`:

```yaml
- image: /public/poster.jpg
  title: Название картинки
```

### Автоматическое определение провайдера

Если `provider` не задан, `scripts/site.ts` использует домен:

- `youtube.com`, `youtu.be` → `youtube`;
- `vk.com`, `vk.ru`, `vkvideo.ru` → `vkvideo`;
- `vimeo.com` → `vimeo`;
- `rutube.ru` → `rutube`;
- `twitch.tv` → `twitch`;
- `dailymotion.com` → `dailymotion`;
- любой другой домен → `browser`.

Явное поле `provider` всегда имеет приоритет над автоматическим определением.

### Embed и fallback

Модальный плеер открывается только для провайдера, у которого есть адаптер и извлечён идентификатор видео:

- YouTube — `youtube-nocookie.com/embed/...`;
- Vimeo — `player.vimeo.com/video/...`;
- Rutube — `rutube.ru/play/embed/...`.

Для VK Video, Twitch, Dailymotion и неизвестных ресурсов используется безопасный fallback: ссылка открывается в новой вкладке. Это сделано потому, что URL этих сервисов могут требовать дополнительные параметры, домен `parent`, player ID или приватный hash.

Чтобы принудительно отключить embed у поддерживаемого сервиса:

```yaml
- url: https://www.youtube.com/watch?v=VIDEO_ID
  title: Open externally
  embed: false
```

## Добавление нового проекта

Добавь запись в нужную позицию `projects.yml`:

```yaml
- url: https://youtu.be/VIDEO_ID
  title: Новая работа
```

Для YouTube достаточно URL и названия — провайдер и обложка определяются автоматически. Для неизвестного сайта укажи собственную обложку и отключи embed:

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
