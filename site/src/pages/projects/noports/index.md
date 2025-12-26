---
title: "noports"
subtitle: ""
description: "Establish TCP connections to devices on the Internet without opening ports on external interfaces"
date: "2022-05-04"
languages: ["Dart", "C"]
field: ["Cybersecurity", "DevOps", "IoT/Embedded", "Networking"]
tech: ["CMake", "Linux"]
progress: "In-Progress"
association: "Atsign"
hidden: true
layout: ../../../layouts/ProjectLayout.astro
---

# noports

## Links

- <https://github.com/JeremyTubongbanua/noports>

## Description

noports is a company-wide project that aims to provide people the power to remote access their machines without having those machines to have open ports. It is a secure and easy-to-use solution that is perfect for people who are not tech-savvy. noports is a project that is currently in development and is not yet available for public use.

## My Contribution

- Wrote the at_c C SDK that is a core dependency of noports' C SSHNPD.
- Wrote the initial set of end-to-end tests using Docker that simulated the noports handshake process. Ports were closed on the Docker machines and simulated one Docker container SSH'ing into another.
