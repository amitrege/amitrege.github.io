# Amit Rege Website (Modern Stack)

This repo now uses **Astro + Node** instead of legacy Jekyll/Ruby.

## Stack

- Astro (static site generator)
- JSON data files for profile, updates, publications, projects
- GitHub Actions deployment to GitHub Pages

## Local Development

1. Use Node 22 (recommended):

```bash
nvm use 22
```

2. Install dependencies:

```bash
npm install
```

3. Run local dev server:

```bash
npm run dev
```

4. Build check (what CI runs):

```bash
npm run build
```

## Where To Edit Content

- Profile and links: `src/data/profile.json`
- Update cards: `src/data/updates.json`
- Publications: `src/data/publications.json`
- Side projects/demos: `src/data/projects.json`

## Add Photo, CV, Resume

- Put your photo in `public/assets/img/` and set `photo` in `src/data/profile.json`
- Set `cvUrl` / `resumeUrl` in `src/data/profile.json`

The CV and résumé sources are `cv/amit_rege_cv.tex` and `cv/amit_rege_resume.tex`.
Edit them and push to `master`: the deploy workflow builds both PDFs and
publishes them at `/assets/docs/`. The PDFs are build outputs and are not
committed. To preview them locally (needs xelatex; see `cv/README.md`):

```bash
make -C cv site
```

## Deploy Live

Push to `master`:

```bash
git add .
git commit -m "Update website"
git push origin master
```

Deployment runs via GitHub Actions (`.github/workflows/deploy.yml`).

In GitHub repository settings:

- Go to **Settings > Pages**
- Set **Build and deployment** source to **GitHub Actions**

Your live site URL: `https://amitrege.com` (`https://amitrege.github.io` redirects there)

## Custom Domain

`amitrege.com` is registered at Cloudflare and served by GitHub Pages.

- Cloudflare DNS: four `A` and four `AAAA` records on `amitrege.com` pointing at
  GitHub Pages, plus `www` as a `CNAME` to `amitrege.github.io`. Keep them
  **DNS only** (grey cloud); proxying breaks GitHub's HTTPS certificate.
- GitHub **Settings > Pages**: custom domain `amitrege.com`, **Enforce HTTPS** on.
  No `CNAME` file is needed because the site deploys via GitHub Actions.

## Legacy Site

Old Jekyll files were moved to `legacy-jekyll/` for reference.
