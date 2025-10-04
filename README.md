# Frontend Deployment Guide

This document explains how to deploy and update the Next.js frontend for the fund management platform.

## 1. Prerequisites

Install the following packages on the target server:

- `git`
- Build tools (`build-essential` on Debian/Ubuntu)
- SSL libraries (`libssl-dev`)
- Node.js **LTS** (18.x or newer) and either `npm` or `yarn`

```bash
# Debian / Ubuntu example
sudo apt update
sudo apt install -y git build-essential libssl-dev
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Initial Deployment

```bash
# Clone the repository
cd /opt
sudo git clone https://<your-git-host>/fund-management-unify.git
sudo chown -R $USER:$USER fund-management-unify

# Enter the frontend project
cd fund-management-unify/frontend_project_fund

# Install dependencies
npm install
# or
# yarn install
```

## 3. Environment Configuration

Create an `.env.local` file in `frontend_project_fund` with the required environment variables:

```bash
cp .env.local.example .env.local  # if you maintain an example file
```

Define at least the following variables (values will depend on your backend deployment):

```bash
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
BACKEND_URL=https://api.example.com
```

Add any other secrets the application expects. Never commit real credentials to Git.

## 4. Build and Run (Production)

```bash
# Build optimized assets
npm run build
# or
# yarn build

# Start the production server
npm run start
# or use your process manager, e.g.:
# npx pm2 start npm --name fund-frontend -- run start
```

Run the start command inside a process manager (PM2, systemd, etc.) when deploying permanently.

## 5. Optional: Development Mode

For debugging on a staging environment:

```bash
npm run dev
# or
# yarn dev
```

Development mode should not be used on the public server.

## 6. Updating an Existing Deployment

```bash
cd /opt/fund-management-unify/frontend_project_fund

# Pull latest changes
git pull

# Install updated dependencies
npm install
# or
# yarn install

# Rebuild and restart the service
npm run build
npm run start  # replace with your process manager command
```

Ensure any new environment variables introduced in updates are applied to `.env.local` before restarting the service.