# CV & Resume

Source for the CV and résumé published on **amitrege.com**. Edit the two TeX
files here and push to `master`; the deploy workflow builds both PDFs and
publishes them with the site. The PDFs are build outputs and are never
committed.

| Source                  | Published at                          |
|-------------------------|---------------------------------------|
| `amit_rege_cv.tex`      | `/assets/docs/amit_rege_cv.pdf`       |
| `amit_rege_resume.tex`  | `/assets/docs/amit_rege_resume.pdf`   |

## Documents

**CV** — full academic CV. Self-contained **xelatex** document in the **Georgia**
typeface (navy + burgundy, left-aligned header, letter-spaced section headers).
Reverse-chronological publications with the author's name highlighted, burgundy
award tags (`[Best Paper Finalist]`, `[Oral]`) and navy `[Link]`s to the public
arXiv/OpenReview version of each paper; Talks / Posters / Guest Lectures, etc.
Renders correctly in macOS Preview (the old `resume.cls`/Charter build is retired).

**Resume** — one-page industry résumé (`article`, Helvetica Neue, `■` bullets).

## How publishing works

`.github/workflows/deploy.yml` builds the PDFs on a macOS runner, because the
documents use the macOS system fonts Georgia and Helvetica Neue. It installs
BasicTeX plus the extra TeX Live packages listed in `texlive-packages.txt`,
runs `make`, and drops both PDFs into `public/assets/docs/` before the Astro
build.

If you add a `\usepackage` that BasicTeX doesn't include, add its TeX Live
package name to `texlive-packages.txt` (`tlmgr search --global --file /name.sty`
finds it), or the deploy fails and the site keeps the previous PDFs.

## Local preview (optional)

One-time setup on a Mac:

```sh
brew install --cask basictex
sudo tlmgr update --self
sudo tlmgr install $(cat texlive-packages.txt)
```

Then:

```sh
make           # -> amit_rege_cv.pdf, amit_rege_resume.pdf
make site      # also copy them into ../public/assets/docs for `npm run dev`
make clean     # remove .aux/.log/.out/.xdv
```
