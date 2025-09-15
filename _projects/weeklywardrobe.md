---
layout: project
title: "WeekyWardrobe"
subtitle: ""
description: "HawkHacks 2024 Submission; demo clothing platform for weekly outfits"
date: 2024-05-19
languages: ["HTML/CSS", "JavaScript", "Python"]
field: ["Blockchain", "DevOps", "Web Development"]
tech: ["Docker", "Linux", "Node.js", "React"]
progress: Finished
association: Hackathon
thumbnail: /assets/projects/weeklywardrobe/thumbnail.png
gallery: ["/assets/projects/weeklywardrobe/gallery/1.png", "/assets/projects/weeklywardrobe/gallery/2.png", "/assets/projects/weeklywardrobe/gallery/3.png", "/assets/projects/weeklywardrobe/gallery/4.png", "/assets/projects/weeklywardrobe/gallery/5.png", "/assets/projects/weeklywardrobe/gallery/6.png", "/assets/projects/weeklywardrobe/gallery/thumbnail.png"]
permalink: /projects/weeklywardrobe/
---

# WeekyWardrobe

## Links

- [Taikai Project Site](https://taikai.network/hackbox/hackathons/hawkhacks/projects/clwd4ehgl0d80z901w94tbk3h/idea)

- [YouTube demo](https://www.youtube.com/watch?v=PwSXqk1gRiI)

- [Source code on GitHub](https://github.com/JeremyTubongbanua/WeeklyWardrobe)

## Description

Weekly Wardrobe is a web application platform that allows users to subscribe to a "try on clothing temporarily" service. They will receive used clothing for them to try on, then they will rate the week's clothing. The algorithm will slowly adapt their style and preferences to the clothing they receive.

We were very happy with the idea, but unfortunately, did not win any tracks in the hackathon.

## Sustainability

This idea promotes sustainability by reusing old clothing.

## Money for Everyone

This idea could be seen as highly profitable because we would be making use of clothing that already exists. Clothing providers would also receive a cut by providing used clothing. They would also be able to put that clothing to use, that otherwise may have been thrown away or sold at a cheap price. Consumers would also save money because they would only be trying clothes on and receive discounts on clothes they like. They would only buy clothes in the future that they would like and wear, leaving no clothes to waste to be unused.

## DevOps Pipeline

We used Docker for deployment on a Linux VPS. We also used GitHub actions for CI/CD. We had tests to run so that any code pushed to trunk would not break production. We used Docker hub to push Docker images that our VPS would pull from periodically.

![DevOps Pipeline](https://i.imgur.com/ALVbRch.png)
