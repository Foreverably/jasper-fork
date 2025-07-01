<p align="center"><img src="https://github.com/JayyDoesDev/jasper/blob/main/.github/assets/jasper.png?raw=true" alt="jasper" width="500""></p>
<h1 align="center">Jasper</h1>
<h2 align="center">🔍 🔨 The multipurpose Discord bot for No Text To Speech!</h2>

<div>
    <h2 align="center">
        <img src="https://img.shields.io/github/commit-activity/m/jayydoesdev/jasper">
        <img src="https://img.shields.io/github/license/jayydoesdev/jasper">
        <img src="https://img.shields.io/github/languages/top/jayydoesdev/jasper">
        <img src="https://img.shields.io/github/contributors/jayydoesdev/jasper">
        <img src="https://img.shields.io/github/last-commit/jayydoesdev/jasper">
    </h2>
</div>

- 🤖 **Bot** - The main Discord bot (Node.js)
- 🌐 **Webserver** - Spring Boot server providing web functionality

## Project Structure

```
.
├── apps/
│   ├── bot/         # Discord bot application
|   ├── databases/   # MongoDB and Redis Docker Containers
│   ├── webserver/   # Spring Boot server
├── compose.yml      # Docker Compose configuration
└── .env             # Environment variables
```

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in required values
3. Choose your preferred setup method:

### Local Development

Each application can be run locally:

#### Bot
```bash
cd apps/bot
yarn install
yarn dev
```

#### Databases
Follow the setup instructions in [apps/databases/README.md](apps/databases/README.md) to configure and start MongoDB and Redis services.

#### Webserver
```bash
cd apps/webserver
./gradlew bootRun
```

### Using Docker

The entire ecosystem can be run using Docker Compose:

```bash
# Build all containers
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Individual services can be managed with:

```bash
# Start/stop specific service
docker-compose up -d [bot|webserver|worker]
docker-compose stop [bot|webserver|worker]
```

## Environment Variables

See the individual README files in each application directory for details on required environment variables:

- [Bot Environment Variables](apps/bot/README.md#environment-variables)
- [Databases Instances Variables](apps/bot/README.md#environment-variables)
- [Webserver Environment Variables](apps/webserver/README.md#environment-variables)
- [Worker Environment Variables](apps/worker/README.md#environment-variables)

## Documentation

Each application has its own README with detailed documentation:

- [Bot Documentation](apps/bot/README.md)
- [Databases Instances Documentation](apps/databases/README.md)
- [Webserver Documentation](apps/webserver/README.md)
- [Worker Documentation](apps/worker/README.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

<a href="https://github.com/JayyDoesDev/Jasper/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=JayyDoesDev/Jasper" />
</a>
