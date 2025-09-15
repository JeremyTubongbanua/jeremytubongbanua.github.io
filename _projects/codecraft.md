---
layout: project
title: "codecraft.io"
subtitle: ""
description: "Ignition Hacks 2024; AI assisted coding learning platform"
date: 2024-08-18
languages: ["C", "HTML/CSS", "JavaScript", "Python"]
field: ["AI/ML", "DevOps", "Web Development"]
tech: ["Docker", "Node.js", "React"]
progress: Finished
association: Hackathon
thumbnail: /assets/projects/codecraft/thumbnail.png
gallery: ["/assets/projects/codecraft/gallery/ai-chat-bot.jpg", "/assets/projects/codecraft/gallery/debugging.jpg", "/assets/projects/codecraft/gallery/image.png", "/assets/projects/codecraft/gallery/questions.jpg", "/assets/projects/codecraft/gallery/thumbnail.png"]
permalink: /projects/codecraft/
---

# codecraft.io

## Links

- [DevPost Link](https://devpost.com/software/codecraft-4wr1od)
- [YouTube video](https://www.youtube.com/watch?v=69-goLnVlUo>)
- [GitHub](https://github.com/JeremyTubongbanua/codecraft.io)

## Description

codecraft.io was our submission to Ignition Hacks 2024. codecraft.io was our attempt at implementing a coding platform with an AI assistant tutor. We used Wolfram's Full Results API to act as the AI assistant tutor.

We used React, Vite, and Tailwind for the frontend and Nginx, Docker, a Raspberry Pi 4, and a Linux VPS for the backend and deployment.

We used a number of production deployment techniques such as having a fallback server. We also used NoPorts to act as a TCP tunnel to our Raspberry Pi 4.

## Code Builder Server

Our code builder worked by exposing an API then writing code to a file, compiling it, then executing it. We also had a fall back code builder server in case the main server was down.

![server architecture](https://i.imgur.com/vyrNDhD.png)
