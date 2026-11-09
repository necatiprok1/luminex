# Luminex

A modular Discord bot project built with **Node.js** and **Discord.js v14**, with AI integrations and a web dashboard.

[Repository](https://github.com/necatiprok1/luminex)

## Overview

Luminex brings bot commands and server-management functionality together with supporting web services.

- **Discord bot:** command modules organized by category, including moderation, user, entertainment, bot, and owner commands.
- **AI integration:** Google Generative AI package integration.
- **Translation:** Google Translate integration.
- **Dashboard:** Express-based web dashboard with routes, views, middleware, and OAuth-related handling.
- **Data layer:** MongoDB/Mongoose-related dependencies.
- **Deployment:** Dockerfile and Docker Compose configuration are included.

## Tech stack

- Node.js
- Discord.js 14
- Express
- MongoDB / Mongoose
- Google Generative AI SDK
- Docker

## Getting started

### Requirements

- Node.js compatible with the dependencies
- A Discord application and bot token
- The environment values required by the project

### Setup

```bash
git clone https://github.com/necatiprok1/luminex.git
cd luminex
npm install
```

Create your local `.env` file using `.env.example` as a reference, then fill in your own credentials.

> Never commit real tokens, passwords, OAuth secrets, or database credentials. Keep local environment files out of Git.

### Run

```bash
npm start
```

The start script launches `shard.js`.

## Project structure

```text
.
├── commands/       # Command modules grouped by category
├── config/         # Bot configuration
├── dashboard/      # Express dashboard, routes, views and middleware
├── bot.js          # Bot entry point
├── shard.js        # Sharding entry point
├── Dockerfile
└── docker-compose.yml
```

## Configuration

See [`.env.example`](.env.example) for the environment variable template. Add valid credentials locally before starting the application.

## Contributing

Issues and pull requests are welcome. For substantial changes, open an issue first to discuss the proposed update.

---

<div align="center">
  <sub>Built as an ongoing Discord automation and AI integration project.</sub>
</div>
