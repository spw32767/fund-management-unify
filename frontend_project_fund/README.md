## Publication summary API

The `POST /api/publication-summary` endpoint can generate a PDF document from the official DOCX template by invoking LibreOffice in headless mode. The API performs an automatic lookup for the LibreOffice CLI (`soffice`) using the current `PATH`, a set of common installation locations, and the optional environment variables listed below.

### Environment variables

| Variable | Description |
| --- | --- |
| `LIBREOFFICE_PATH` | Optional hint that points either to the `soffice` executable or to its containing directory. Multiple paths can be provided using the platform delimiter (`:` on Linux/macOS, `;` on Windows). |
| `PUBLICATION_SUMMARY_FALLBACK_FORMAT` | Optional override for the behavior when LibreOffice is unavailable. Defaults to returning the patched DOCX response; set to `error` to keep the previous 503 error response instead. |

If LibreOffice cannot be located the API now returns the patched DOCX document so that callers can still download the official template. Configure `LIBREOFFICE_PATH` on platforms where LibreOffice is installed outside of the default locations (for example, a custom Windows install directory), or set `PUBLICATION_SUMMARY_FALLBACK_FORMAT=error` to surface an explicit error instead.

### Local testing

1. Install [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/).
2. Ensure the `soffice` binary is available on the system `PATH` or export `LIBREOFFICE_PATH` before starting the Next.js server.
3. Run the dev server with `npm run dev` (or `yarn dev`).
4. Issue a POST request with the placeholders payload to `/api/publication-summary`.

When LibreOffice is present the endpoint returns a PDF response (`Content-Type: application/pdf`). When LibreOffice is missing and the fallback is disabled, callers receive a structured JSON error without the route crashing.