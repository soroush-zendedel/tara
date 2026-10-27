# Tara GuitarLab

**Tara GuitarLab** is a free, browser-based music theory and practice tool for guitar and piano. Explore scales, chords, notation, and exercises in English or Persian.

- **Live site:** [soroush-zendedel.github.io/tara](https://soroush-zendedel.github.io/tara/)
- **Languages:** [English](https://soroush-zendedel.github.io/tara/) · [فارسی](https://soroush-zendedel.github.io/tara/fa/)
- **App:** [Open GuitarLab](https://soroush-zendedel.github.io/tara/app.html)
- **Release:** `v1.0.1` · [Changelog](CHANGELOG.md)

This repository is published as the `/tara/` project beneath the personal site at [soroush-zendedel.github.io](https://soroush-zendedel.github.io/). The English and Persian project pages are available at `/tara/` and `/tara/fa/` respectively.

## Features

- Interactive guitar fretboard, piano, Circle of Fifths, scales, chords, and progressions
- Standard notation, tablature, synthesized audio, microphone tuner, and metronome
- Guided lessons, practice exercises, MIDI and keyboard input, and teacher notes
- PDF export, customizable workspace, and dark or light theme
- Responsive English and Persian landing and About pages

## Pages

| Page | URL path |
| --- | --- |
| English landing page | `/` |
| Persian landing page | `/fa/` |
| English About page | `/about.html` |
| Persian About page | `/fa/about.html` |
| GuitarLab app | `/app.html` |

The paths in this table are relative to the project publishing root (`/tara/`) on GitHub Pages. The portfolio site's own home pages live at `/` and `/fa/` and are outside this repository.

## Technical SEO and structured data

- Each indexable page declares its canonical URL under `https://soroush-zendedel.github.io/tara/`; English and Persian landing and About pages link to their language alternate.
- The two About pages show a localized breadcrumb for the actual hierarchy: portfolio home → Tara GuitarLab home → current About page. Their visible trail and JSON-LD `BreadcrumbList` use the same labels and URLs. The landing pages and interactive app do not have a deeper hierarchy that warrants a breadcrumb.
- Existing JSON-LD describes the site and application where applicable. The markup is kept aligned with visible page content; it does not promise a Google rich result.
- `sitemap.xml` contains this project's canonical public URLs and language alternates. `robots.txt` allows crawling and advertises this sitemap. The `/en/` paths are legacy landing pages that redirect to the canonical English pages; they are excluded from indexing and are not listed in the sitemap. The portfolio-domain sitemap, if any, is managed outside this repository.
- When changing canonical URLs, localized page relationships, or breadcrumb paths, update the corresponding HTML and this project's sitemap together. Do not add URLs from other repositories to this sitemap.

## Run locally

The published site is static HTML, CSS, and JavaScript. Node.js, npm, pnpm, and a build step are **not** needed to run it. Use Python or Docker Compose from the project root.

### Python

```bash
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). The tuner can access the microphone on `localhost` or over HTTPS. A local web server is recommended instead of opening HTML files directly.

### Docker Compose

Install Docker Desktop or Docker Engine with Compose v2, then run:

```bash
docker compose up --build -d
```

Open [http://localhost:8001](http://localhost:8001). The Nginx service mounts project files read-only; edits appear after refreshing the page. If port 8001 is busy, set another port in PowerShell and start Compose:

```powershell
$env:TARA_PORT = "8002"
docker compose up --build -d
```

Stop the site with `docker compose down`. View its logs with `docker compose logs -f site`.

## Develop styles

Ordinary content edits and changes to `assets/css/landing.css`, `assets/css/about.css`, or `assets/css/app.css` need no package manager. Tailwind utility classes on the English and Persian landing pages are compiled into the checked-in file `assets/css/tailwind.min.css`.

### Recommended: Tailwind in Docker

Run this from the project root:

```bash
docker compose --profile dev up --build -d
```

This starts the website and a Tailwind watcher. Edit `index.html` or `fa/index.html`; the watcher updates `assets/css/tailwind.min.css`. Refresh the browser to see the result. Watch the CSS service with `docker compose logs -f css`.

The first run downloads the Node image and package dependencies. Once the images and dependencies are cached, the development workflow can run offline. To stop both services, use `docker compose down`.

### Optional: build on the host

If Node.js and pnpm (or npm) are already installed, install dependencies and build the stylesheet:

```bash
pnpm install
pnpm run build:css
```

Use `pnpm run watch:css` to rebuild automatically while editing. The equivalent npm scripts are `npm install`, `npm run build:css`, and `npm run watch:css`. Commit the generated `assets/css/tailwind.min.css` together with Tailwind class changes so the published site needs no build step.

## Offline use

Runtime fonts, icons, images, styles, and JavaScript libraries are stored in the repository. After obtaining the project files, the website runs without internet access. Docker's first run needs internet to download its images and CSS build dependencies; cache them in advance for offline use. Third-party asset licenses are in `assets/licenses/`.

## Project structure

- `index.html`, `fa/`, `en/`: language landing pages and localized content
- `about.html`, `fa/about.html`: About pages
- `app.html`, `assets/`: app markup, styles, scripts, and local dependencies
- `assets/css/tailwind-input.css`, `tailwind.config.cjs`: Tailwind source and configuration
- `assets/css/tailwind.min.css`: generated stylesheet served by the site
- `compose.yaml`, `Dockerfile.css`: local website and CSS development services
- `sitemap.xml`, `CHANGELOG.md`, `VERSION`: sitemap and release information

## Contributing

Issues and contributions are welcome. Please open an issue before larger changes, then submit a pull request. For Tailwind class changes, include the rebuilt `assets/css/tailwind.min.css`.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE).

---

# تارا گیتارلب

**تارا گیتارلب** ابزاری رایگان و تحت مرورگر برای یادگیری و تمرین تئوری موسیقی با گیتار و پیانو است. گام‌ها، آکوردها، نت‌نویسی و تمرین‌ها را به فارسی یا انگلیسی ببینید.

- **نسخهٔ آنلاین:** [soroush-zendedel.github.io/tara](https://soroush-zendedel.github.io/tara/)
- **زبان‌ها:** [English](https://soroush-zendedel.github.io/tara/) · [فارسی](https://soroush-zendedel.github.io/tara/fa/)
- **برنامه:** [ورود به GuitarLab](https://soroush-zendedel.github.io/tara/app.html)
- **انتشار:** `v1.0.1` · [تغییرات نسخه‌ها](CHANGELOG.md)

این مخزن به‌عنوان پروژهٔ `/tara/` زیر وب‌سایت شخصی [soroush-zendedel.github.io](https://soroush-zendedel.github.io/) منتشر می‌شود. صفحه‌های انگلیسی و فارسی پروژه به‌ترتیب در مسیرهای `/tara/` و `/tara/fa/` قرار دارند.

## امکانات

- نمایش تعاملی دستهٔ گیتار، پیانو، دایرهٔ پنجم‌ها، گام‌ها، آکوردها و توالی‌ها
- نت‌نویسی استاندارد و تبلچر، صدای تولیدشده، تیونر با میکروفون و مترونوم
- درس‌ها و تمرین‌های هدایت‌شده، ورودی MIDI و صفحه‌کلید، و ابزار یادداشت مدرس
- خروجی PDF، چیدمان قابل تنظیم، و پوستهٔ تاریک و روشن
- صفحه‌های واکنش‌گرا به فارسی و انگلیسی

## صفحه‌ها

| صفحه | مسیر |
| --- | --- |
| صفحهٔ اصلی انگلیسی | `/` |
| صفحهٔ اصلی فارسی | `/fa/` |
| دربارهٔ تارا به انگلیسی | `/about.html` |
| دربارهٔ تارا به فارسی | `/fa/about.html` |
| برنامهٔ GuitarLab | `/app.html` |

مسیرهای جدول نسبت به ریشهٔ انتشار این پروژه (`/tara/`) در GitHub Pages هستند. صفحه‌های اصلی وب‌سایت شخصی در مسیرهای `/` و `/fa/` قرار دارند و خارج از این مخزن مدیریت می‌شوند.

## سئوی فنی و داده‌های ساخت‌یافته

- هر صفحهٔ قابل نمایه‌سازی canonical خود را زیر `https://soroush-zendedel.github.io/tara/` مشخص می‌کند؛ صفحه‌های اصلی و دربارهٔ انگلیسی و فارسی نیز نسخهٔ زبانی متناظر را معرفی می‌کنند.
- دو صفحهٔ درباره، breadcrumb هماهنگ با زبان و سلسله‌مراتب واقعی نشان می‌دهند: صفحهٔ اصلی وب‌سایت شخصی ← صفحهٔ اصلی تارا گیتارلب ← صفحهٔ درباره. مسیر قابل‌مشاهده و `BreadcrumbList` در JSON-LD نام‌ها و URLهای یکسان دارند. صفحه‌های اصلی پروژه و برنامهٔ تعاملی سلسله‌مراتب عمیق‌تری برای breadcrumb ندارند.
- JSON-LD موجود، در موارد متناسب، وب‌سایت و برنامه را توصیف می‌کند. داده‌ها با محتوای قابل‌مشاهده هماهنگ‌اند و نمایش نتیجهٔ غنی گوگل را تضمین نمی‌کنند.
- فایل `sitemap.xml` فقط URLهای canonical عمومی این پروژه و نسخه‌های زبانی را دارد. `robots.txt` خزش را مجاز می‌کند و نشانی همین sitemap را اعلام می‌کند. مسیرهای قدیمی `/en/` به صفحه‌های canonical انگلیسی هدایت می‌شوند، برای ایندکس در نظر گرفته نشده‌اند و در sitemap نیستند. sitemap دامنهٔ اصلی، اگر وجود داشته باشد، بیرون از این مخزن مدیریت می‌شود.
- هنگام تغییر canonical، ارتباط صفحه‌های زبانی یا مسیر breadcrumb، HTML و sitemap همین پروژه را با هم به‌روز کنید. URL مخزن‌های دیگر را به این sitemap اضافه نکنید.

## اجرای محلی

نسخهٔ سایت از HTML، CSS و JavaScript ایستا تشکیل شده است. برای اجرا به Node.js، npm، pnpm یا فرایند build نیازی نیست. از ریشهٔ پروژه یکی از روش‌های زیر را اجرا کنید.

### با Python

```bash
python -m http.server 8000
```

سپس [http://localhost:8000](http://localhost:8000) را باز کنید. تیونر برای دسترسی به میکروفون به `localhost` یا HTTPS نیاز دارد. اجرای سایت با سرور محلی از بازکردن مستقیم فایل‌های HTML مطمئن‌تر است.

### با Docker Compose

Docker Desktop یا Docker Engine به‌همراه Compose نسخهٔ ۲ را نصب کنید و اجرا کنید:

```bash
docker compose up --build -d
```

سپس [http://localhost:8001](http://localhost:8001) را باز کنید. سرویس Nginx فایل‌های پروژه را فقط‌خواندنی mount می‌کند؛ پس از ویرایش فایل‌ها صفحه را تازه کنید. اگر پورت ۸۰۰۱ اشغال است، در PowerShell پورت دیگری تعیین کنید:

```powershell
$env:TARA_PORT = "8002"
docker compose up --build -d
```

برای توقف سایت `docker compose down` و برای دیدن گزارش آن `docker compose logs -f site` را اجرا کنید.

## توسعهٔ ظاهر

ویرایش متن‌ها و تغییر فایل‌های `assets/css/landing.css`، `assets/css/about.css` و `assets/css/app.css` به ابزار مدیریت بسته نیاز ندارد. کلاس‌های Tailwind صفحه‌های اصلی انگلیسی و فارسی در فایل `assets/css/tailwind.min.css` کامپایل می‌شوند.

### روش پیشنهادی: Tailwind با Docker

از ریشهٔ پروژه اجرا کنید:

```bash
docker compose --profile dev up --build -d
```

این دستور سایت و watcher مربوط به Tailwind را اجرا می‌کند. فایل `index.html` یا `fa/index.html` را ویرایش کنید؛ watcher فایل `assets/css/tailwind.min.css` را به‌روز می‌کند. سپس صفحه را در مرورگر تازه کنید. گزارش سرویس CSS را با `docker compose logs -f css` ببینید.

اجرای اول برای دریافت image مربوط به Node و وابستگی‌های CSS به اینترنت نیاز دارد. پس از ذخیره‌شدن imageها و وابستگی‌ها، توسعه بدون اینترنت هم انجام می‌شود. برای توقف هر دو سرویس `docker compose down` را اجرا کنید.

### روش جایگزین: build روی میزبان

اگر Node.js و pnpm (یا npm) نصب است، وابستگی‌ها را نصب و CSS را تولید کنید:

```bash
pnpm install
pnpm run build:css
```

برای تولید خودکار هنگام ویرایش از `pnpm run watch:css` استفاده کنید. دستورهای معادل npm عبارت‌اند از `npm install`، `npm run build:css` و `npm run watch:css`. فایل تولیدشدهٔ `assets/css/tailwind.min.css` را همراه تغییر کلاس‌های Tailwind commit کنید تا سایت منتشرشده به build نیاز نداشته باشد.

## استفادهٔ بدون اینترنت

فونت‌ها، آیکون‌ها، تصاویر، استایل‌ها و کتابخانه‌های زمان اجرای برنامه داخل مخزن هستند. پس از دریافت فایل‌های پروژه، سایت بدون اینترنت اجرا می‌شود. اجرای نخست Docker برای دریافت imageها و وابستگی‌های build CSS به اینترنت نیاز دارد؛ برای استفادهٔ آفلاین آن‌ها را از قبل cache کنید. مجوز دارایی‌های شخص ثالث در `assets/licenses/` قرار دارد.

## ساختار پروژه

- `index.html`، `fa/` و `en/`: صفحه‌های اصلی زبان‌ها و محتوای ترجمه‌شده
- `about.html` و `fa/about.html`: صفحه‌های درباره
- `app.html` و `assets/`: ساختار برنامه، استایل‌ها، اسکریپت‌ها و وابستگی‌های محلی
- `assets/css/tailwind-input.css` و `tailwind.config.cjs`: ورودی و تنظیمات Tailwind
- `assets/css/tailwind.min.css`: فایل CSS تولیدشده و مورد استفادهٔ سایت
- `compose.yaml` و `Dockerfile.css`: سرویس سایت و محیط توسعهٔ CSS
- `sitemap.xml`، `CHANGELOG.md` و `VERSION`: نقشهٔ سایت و اطلاعات انتشار

## مشارکت

گزارش مسئله و مشارکت در توسعه خوش‌آمد است. برای تغییرات بزرگ، ابتدا یک مسئله ثبت و سپس درخواست ادغام ارسال کنید. در تغییر کلاس‌های Tailwind، فایل `assets/css/tailwind.min.css` تولیدشده را هم اضافه کنید.

## مجوز

این پروژه تحت مجوز MIT منتشر شده است. متن مجوز در [LICENSE](LICENSE) قرار دارد.
