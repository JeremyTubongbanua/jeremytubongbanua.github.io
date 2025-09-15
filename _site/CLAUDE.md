# CLAUDE

## assets

The assets/ folder contains data that I have manually compiled myself that would go onto the website:

- `assets/awards/` - Awards data
- `assets/certifications/` - Certifications data
- `assets/experiences/` - Education data
- `assets/projects/` - Projects data

You can assume each folder to also have a list of subfolders. In each of those subfoldersr, there will be a `thumbnail.png` which will be the main thumbnail image for this item, then a content.md which contains content for the user if they want to learn more about this item. It will also contain a metadata.yml which follows this template:

```yml
title: "Figma Challenge with Automated Drive Club at Ontario Tech"
subtitle: "1st Place Overall"
description: "Won 1st place overall in ADC's Figma Challenge. Designed car dashboard and tablet Figma prototypes for accessible semi-automated vehicles."
fromdate: "2025-03-07"
todate: "2025-03-07"

roles: ["Winner", "Designer"]
industries: ["Design", "Automotive"]
```

Projects should be a grid view of 3 columns
Experiences 2
Awards 2
Certifications 2

Note: if a todate is defined, but a fromdate is not defined, simply display the todate (and assume it was a one day thing).
