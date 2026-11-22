# Sources for the CV + resume published on amitrege.com
#
# Publishing needs no local build: push to master and the deploy workflow
# builds both PDFs and ships them with the site.
#
#   make            build both PDFs (amit_rege_cv.pdf, amit_rege_resume.pdf)
#   make cv         build only the CV
#   make resume     build only the resume
#   make site       build, then copy both PDFs into ../public/assets/docs for `npm run dev`
#   make clean      remove LaTeX build artifacts
#
# Requires xelatex (BasicTeX) plus the extra TeX Live packages in texlive-packages.txt.
# CV uses the Georgia system font; resume uses Helvetica Neue (both ship with macOS).

ENGINE  = xelatex
FLAGS   = -interaction=nonstopmode -halt-on-error
SITE    = ../public/assets/docs
CV_PDF  = amit_rege_cv.pdf
RES_PDF = amit_rege_resume.pdf
PDFS    = $(CV_PDF) $(RES_PDF)

.PHONY: all cv resume site clean

all: $(PDFS)

cv: $(CV_PDF)
resume: $(RES_PDF)

# Both documents are self-contained; two passes resolve layout/page refs.
%.pdf: %.tex
	$(ENGINE) $(FLAGS) $<
	$(ENGINE) $(FLAGS) $<

# The site copies are build outputs (gitignored); CI does the same copy on deploy.
site: $(PDFS)
	cp $(PDFS) $(SITE)/

clean:
	rm -f *.aux *.log *.out *.xdv
