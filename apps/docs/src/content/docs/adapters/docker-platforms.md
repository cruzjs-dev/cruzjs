---
title: Managed Platforms (Dokploy, Coolify)
description: Deploy CruzJS to self-hosted platforms like Dokploy and Coolify, or directly to a VPS with Docker Compose.
---

Self-hosted platforms give you full control over your infrastructure while providing a deployment experience similar to Vercel or Netlify. CruzJS works with any platform that can build and run Docker containers.

## Dokploy

[Dokploy](https://dokploy.com) is an open-source, self-hosted PaaS. Install it on any VPS and deploy CruzJS with automatic builds, SSL, and monitoring.

### Setup

1. **Provision a VPS** (DigitalOcean Droplet, Hetzner, etc.) with at least 2 GB RAM.
2. **Install Dokploy** on the VPS:
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```
3. Open the Dokploy dashboard at `https://your-vps-ip:3000` and create your admin account.

### Create the Application

1. In the Dokploy dashboard, click **Create Project**, then **Add Application**.
2. Connect your Git repository (GitHub, GitLab, or Bitbucket).
3. Set the build method to **Dockerfile** -- Dokploy detects and builds your multi-stage `Dockerfile`.
4. Under **Environment Variables**, add your configuration:
   ```
   DATABASE_URL=postgres://cruz:password@postgres:5432/cruzdb
   REDIS_URL=redis://redis:6379
   AUTH_SECRET=your-secret-key
   S3_ENDPOINT=http://minio:9000
   S3_BUCKET=uploads
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadmin
   ```
5. Under **Domains**, add your domain. Dokploy provisions SSL via Let's Encrypt automatically.
6. Click **Deploy**.

### Attach Databases

Dokploy can manage PostgreSQL and Redis as services alongside your app:

1. In the same project, click **Add Database** and choose **PostgreSQL**.
2. Dokploy creates a managed PostgreSQL container with persistent volumes.
3. Copy the internal connection string and use it as `DATABASE_URL`.
4. Repeat for **Redis** if you need cache and queue support.

Dokploy handles backups, restarts, and volume management for these database services.

### Migrations

Run migrations after each deploy via the Dokploy terminal or a post-deploy hook:

```bash
# In the Dokploy terminal for your application
npx cruz db migrate
```

Or add a post-deploy command in the application settings to run migrations automatically.

## Coolify

[Coolify](https://coolify.io) is another open-source PaaS with a polished UI and built-in database management.

### Setup

1. **Install Coolify** on your server:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
2. Open the dashboard and complete initial setup.

### Deploy with Docker Compose

Coolify works well with `docker-compose.yml`. Use the compose file from the [Docker adapter docs](/adapters/docker) as your starting point.

1. In Coolify, click **Add New Resource** and select **Docker Compose**.
2. Connect your GitHub repository.
3. Coolify detects `docker-compose.yml` and deploys all services (app, PostgreSQL, Redis, MinIO).
4. Configure environment variables in the Coolify dashboard -- these override values in the compose file.
5. Set your domain under **Settings > Domain**. Coolify handles SSL automatically.

### Use Coolify's Built-in Databases

Instead of defining databases in your compose file, you can use Coolify's managed databases:

1. Click **Add New Resource > Database > PostgreSQL**.
2. Coolify provisions a PostgreSQL instance with automatic backups.
3. Copy the internal URL and set it as `DATABASE_URL` in your app's environment.
4. Do the same for Redis if needed.

This separates database lifecycle from application deployments, which is safer for production.

### Migrations in Coolify

Add a pre-deploy command in your application settings:

```bash
npx cruz db migrate
```

Coolify runs this command inside the container before routing traffic to the new version.

## General VPS Deployment

For a minimal setup without a platform, deploy directly with Docker Compose and a reverse proxy.

### Deploy Script

Create a deploy script on your server:

```bash
#!/bin/bash
# /opt/cruz-app/deploy.sh
set -e

cd /opt/cruz-app
git pull origin main
docker compose up -d --build

# Run migrations after the new containers are healthy
docker compose exec app npx cruz db migrate

echo "Deployment complete."
```

### SSH Deploy from CI

Trigger the script from your local machine or CI:

```bash
ssh deploy@my-server "cd /opt/cruz-app && bash deploy.sh"
```

Add a deploy key to your server so it can pull from your private repository:

```bash
# On the server
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
# Add the public key as a deploy key in your GitHub repo settings
```

### Nginx Reverse Proxy

Put Nginx in front of your CruzJS app for SSL termination:

```nginx
# /etc/nginx/sites-available/cruz-app
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Obtain certificates with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com
```

Certbot auto-renews certificates via a systemd timer.

## Watchtower (Auto-Update)

[Watchtower](https://containrrr.dev/watchtower/) monitors your running containers and automatically pulls and restarts them when a new image is pushed to the registry.

```yaml
# Add to docker-compose.yml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      WATCHTOWER_POLL_INTERVAL: 300  # Check every 5 minutes
      WATCHTOWER_CLEANUP: "true"     # Remove old images
    restart: unless-stopped
```

This is useful for simpler deployments where you push a new image to a registry and want the server to pick it up automatically. For production, pair Watchtower with a CI pipeline that builds and pushes images on every merge to `main`.

:::caution
Watchtower does not run database migrations. Combine it with a startup migration script (see [Docker adapter docs](/adapters/docker#automatic-migrations-on-startup)) or run migrations manually after updates.
:::
