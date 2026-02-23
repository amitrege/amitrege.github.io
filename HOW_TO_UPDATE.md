# Quick Guide: Update Your Site

This repo uses Jekyll and GitHub Pages. The new homepage is designed so you can update most content without editing HTML/CSS.

## 1. Files You Will Edit Most Often

- `/_data/profile.yml` for your name, tagline, email, photo path, CV link, resume link.
- `/_data/updates.yml` for short update cards on the homepage.
- `/_data/publications.yml` for publication entries.
- `/_data/projects.yml` for side projects and demos.
- `/_posts/` for blog posts (`YYYY-MM-DD-title.md` format).

## 2. Add Your Photo

1. Put your image in `assets/img/` (create the folder if needed), for example `assets/img/amit.jpg`.
2. Set `photo: "/assets/img/amit.jpg"` in `/_data/profile.yml`.

## 3. Add CV and Resume PDFs

1. Put PDFs in `assets/docs/`, for example:
   - `assets/docs/cv.pdf`
   - `assets/docs/resume.pdf`
2. Update these fields in `/_data/profile.yml`:
   - `cv_url: "/assets/docs/cv.pdf"`
   - `resume_url: "/assets/docs/resume.pdf"`

## 4. Local Preview

From repo root:

```bash
bundle install
bundle exec jekyll serve
```

Then open `http://127.0.0.1:4000`.

## 5. Publish Live

From repo root:

```bash
git add .
git commit -m "Update website content"
git push origin master
```

Because this is a `username.github.io` repo, GitHub Pages deploys automatically from `master` for most setups.
Your site should update at: `https://amitrege.github.io` (usually within a few minutes).

If it does not update:

1. Go to GitHub repo Settings.
2. Open Pages.
3. Ensure source is set to `Deploy from a branch`, branch `master`, folder `/ (root)`.
