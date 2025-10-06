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

## 7. Customizing the Header Branding

The dashboard header (logo, application name, and subtitle) is now driven by a shared
configuration file located at `app/config/branding.js`.

### How it works now

| Element | Where to change it | Notes |
| --- | --- | --- |
| Logo badge (fallback text, optional image, colors) | `BRANDING.logo` | Supply `imageSrc` (e.g. `/images/fund_cpkku_logo.png` for a file in `public/images`) to display an image instead of the default text badge. Use `containerClassName`/`containerStyle` to size the badge and `imageWidth`/`imageHeight` or enable `useFill` (with optional `imageWrapperClassName`) to enlarge the logo. `imageClassName`/`imageStyle` let you control how the image scales inside the badge. |
| Application name | `BRANDING.appName` | Appears next to the logo for both Admin and Member dashboards. |
| Subtitle / description | `BRANDING.subtitles.admin` and `BRANDING.subtitles.member` | Each dashboard can show a different subtitle.

The header components (`app/admin/components/layout/Header.js` and
`app/member/components/layout/Header.js`) now import and read from the shared
`BRANDING` object, so any updates you make to `branding.js` automatically show up in
both experiences.

When `logo.useFill` is set to `true`, the image will stretch to whatever size the
badge container allows. This is the easiest way to make the logo larger without
manually updating the intrinsic `imageWidth`/`imageHeight` numbers.

### How it differed before

Previously the logo text, subtitle, and styling were hard-coded inside each header
component. To change the branding you had to edit multiple files individually. The new
approach centralizes those values in one place, reducing duplication and keeping the
Admin and Member headers in sync.

### Changing the browser tab title

The HTML `<title>` (shown in the browser tab and search results) is controlled by the
Next.js metadata exported from `app/layout.js`. Update the `metadata.title` value in
that file whenever you need to rename the overall site.

### Changing the browser tab icon (favicon)

Replace the file at `app/favicon.ico` with your desired icon (or update the
`app/icon.png` variant if your deployment uses it). Browsers display this asset in the
tab bar and bookmark lists.