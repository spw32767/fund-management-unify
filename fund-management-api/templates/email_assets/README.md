# Email Header Assets

The notification service can show the Research Funding CP-KKU icon in two ways:

1. **Embed the PNG directly** – Copy the official `fund_cpkku_logo.png` file into this directory. The backend will base64-encode the file and include it inline with every email so recipients can see the icon without needing network access to your VPN.
2. **Reference a public URL** – Upload the PNG to a server that is reachable from the public Internet (for example, a university CDN or a static bucket) and set the environment variable `EMAIL_LOGO_URL` to the absolute `https://...` address. This keeps the binary small and lets you update the asset without redeploying.

When you need to keep the file outside the repository (for example because deployments run from a different working directory), set `EMAIL_LOGO_PATH` to the absolute path of the PNG on the server. The backend will fall back to the bundled relative path when the variable is not set. If neither the path nor the URL is configured, a branded gradient badge is rendered instead of the logo.
