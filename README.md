# Amit Rege Website (Modern Stack)

This repo now uses **Astro + Node** instead of legacy Jekyll/Ruby.

## Stack

- Astro (static site generator)
- Markdown content for blog posts
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
- Blog posts: `src/content/blog/*.md`

## Add Photo, CV, Resume

- Put your photo in `public/assets/img/` and set `photo` in `src/data/profile.json`
- Put PDFs in `public/assets/docs/` and set `cvUrl` / `resumeUrl` in `src/data/profile.json`

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

Your live site URL: `https://amitrege.github.io`

## Legacy Site

Old Jekyll files were moved to `legacy-jekyll/` for reference.
