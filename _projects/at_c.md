---
layout: project
title: "at_c"
subtitle: "Atsign Project"
description: "atProtocol implementation re-written in C for ESP32 and Embedded Devices with SSL and cryptography features"
date: 2023-02-18
languages: ["C"]
field: ["Cryptography", "Cybersecurity", "DevOps", "IoT/Embedded", "Networking"]
tech: ["CMake", "Docker", "Espressif (ESP-IDF)", "Linux"]
progress: In-Progress
association: Atsign
thumbnail: /assets/projects/at_c/thumbnail.png
gallery: ["/assets/projects/at_c/gallery/1.png", "/assets/projects/at_c/gallery/gallery.json"]
permalink: /projects/at_c/
---

# at_c

## Links

- <https://github.com/JeremyTubongbanua/at_c/tree/trunk>

## Description

at_c is the client implementation of the atProtocol. Kind of like how you need a library to talk the HTTP protocol, you will need an atSDK to communicate in the atProtocol.

Since the atProtocol alone is not inherently useful, a client SDK is needed to do things like edge encryption, server authentication, and encapsulating the protocol in a more user-friendly manner.

This is just one of the few SDKs that I helped implement from scratch. I have also had a hand in implementing at_java, at_pico_w, and at_esp32, which are all atSDKs like at_c.

However, at_c flourished to be a more complete SDK compared to others due to customer attraction and need.

By August 2024, we were able to make our first v0.1.0 beta release.

## Cryptography Features

I had the opportunity (with the help of a team) to implement low-level cryptographic features using MbedTLS as a dependency:

- RSA 2048 encrypt/decrypt
- RSA 2048 sign/verify
- AES 256 CTR encrypt/decrypt
- AES key generation
- RSA 2048 key importing
- SHA 256 hashing

## atProtocol Features

I had the opportunity of implementing:

- CRUD operations
  - Put
  - Get
  - Delete

- Events
  - Notify
  - Monitor

- AtKey
  - metadata
  - to/from string

- Authentication
  - PKAM authentication
