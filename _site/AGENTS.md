# Repository Guidelines

This guide helps contributors work efficiently in this repository.

## Project Structure & Module Organization

- Static site built with Jekyll.
- Content sources:
  - `_data/asset_{projects,experiences,awards,certifications}.yml` — master lists with `folder` slugs.
  - `assets/{projects,experiences,awards,certifications}/<folder>/` — per-item `metadata.yml`, `content.md`, optional `gallery/` and `thumbnail.png`.
- Generated collections (do not hand-edit):
  - `_{projects,experiences,awards,certifications}/<folder>.md` — produced by generators.

## Build, Test, and Development Commands

- Rebuild data with pruning: `ruby generate_all_pages.rb`
  - Generates `_{collection}/<folder>.md` and prunes stale pages no longer in `_data`/`assets`.
- Local preview: `bundle exec jekyll serve --port 4001`
- Clean site output/cache (optional): `bundle exec jekyll clean`

## Data Generation Details

- Script: `generate_all_pages.rb`
  - Reads `_data` YAML + `assets/.../<folder>/` to compose pages.
  - Writes `thumbnail` as `/assets/.../<folder>/thumbnail.png` and adds gallery items if present.
  - Prunes any `_{collection}/*.md` whose slug isn’t listed in the corresponding `_data` file.
  - Output example: “Generated 35 projects pages — Pruned 1 stale projects pages”.

## Testing Guidelines

- Manual checks: load locally, verify links, images, and console is clean.
- Accessibility: ensure alt text, labels, and sufficient color contrast.
- Link check (optional): run a link checker tool locally before PRs.
