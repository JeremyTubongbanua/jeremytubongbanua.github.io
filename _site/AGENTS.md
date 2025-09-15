# Repository Guidelines

This guide helps contributors work efficiently in this repository.

## Project Structure & Module Organization

- Root contains site sources for a static site (GitHub Pages) using Jekyll as the framework.
- `index.html`, `assets/` (contains `experiences/`, `projects/`, `awards/` and `certifications/`)
  - each of these folders contain more folders in them
  - in each of those folders, there will be a metadata.yml file which contains data of the project/item
  - as well as a content.md where the user can click on this item and learn more and show more content about it.

## Build, Test, and Development Commands

- Local preview `bundle exec jekyll serve --port 4001`
- To rebuild the data, `ruby generate_all_pages.rb`

## Testing Guidelines

- Manual checks: load locally, verify links, images, and console is clean.
- Accessibility: ensure alt text, labels, and sufficient color contrast.
- Link check (optional): run a link checker tool locally before PRs.
