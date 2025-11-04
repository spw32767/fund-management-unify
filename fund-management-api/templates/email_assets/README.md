# Email Header Assets

Notification emails can display up to **two** logos (for example the CP-KKU badge and the Khon Kaen University wordmark). Choose whichever option works for your deployment:

1. **Host them publicly** – Upload both PNG files to a location that every recipient can reach (such as a CDN or a static bucket) and set `EMAIL_LOGO_URLS` to a comma-separated list of their `https://` URLs. Update the list to swap icons without redeploying the API.
2. **Store them on the server** – Keep the PNGs inside the VPN and set `EMAIL_LOGO_PATHS` to a comma-separated list of absolute filesystem paths. The backend will inline the images as base64 data URIs.

For backwards compatibility you can still use the single-value variables `EMAIL_LOGO_URL` or `EMAIL_LOGO_PATH`. If nothing is configured the email header now renders without icons, so update one of the variables above when you are ready to supply new assets.
