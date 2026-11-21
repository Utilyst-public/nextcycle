# Static deployment

## Portable application boundary

Copy `artifacts/nextcycle/` into a standalone repository. Do not copy the surrounding workspace packages, database library, API server, or development configuration. Keep `public/data/` and its per-pair sample files together.

Install using `npm install`, build using `npm run build`, and publish the contents of `dist/public/`. No environment variables are required for a root deployment. `PORT` may optionally override the development-server port (default `5173`), and `VITE_BASE_PATH` may optionally set a path prefix for static hosting (default `/`).

## Azure Static Web Apps

Use the static Vite application preset, build command `npm run build`, and output directory `dist/public`. The copied `staticwebapp.config.json` supplies navigation fallback to `index.html`.

## Cloudflare Pages or Netlify

Use build command `npm run build` and output directory `dist/public`. The `public/_redirects` file becomes the deployed SPA fallback. Direct navigation to routes such as `/watch` must serve `index.html`.

## GitHub Pages

Build with `VITE_BASE_PATH` set to the correct repository path, including leading and trailing slashes (for example `/nextcycle/`). Publish `dist/public`. The build also emits `404.html` for deep links. GitHub Pages returns a 404 HTTP status for such fallback requests even when the application renders; a host with native SPA fallback is preferable for search indexing.

## Custom domain

`nextcycle.tech` is the intended domain in the concept brief, not a statement that this template has been published there. Configure domain ownership, DNS, and HTTPS with the chosen host. Set canonical and social-image URLs only after confirming the actual published URL.

## Before a public release

### 0.3.0 static routing and configuration

The build now writes real `index.html` files for every public route, including each waterbody and embed. Configure the host to serve existing files/directories **before** the SPA fallback; a forced wildcard rewrite would hide the per-page crawler metadata. API JSON/CSV, OG PNGs, feed and sitemap are generated static files and must not be routed to a backend.

Set `VITE_SITE_URL` to the confirmed public origin and, for subdirectory hosting, `VITE_BASE_PATH` to the same prefix used by the host. Both are optional for local root use. The intended `https://nextcycle.tech` default is not evidence that the domain is connected.

The development workspace's unused API placeholder was moved away from `/api` so that NextCycle's static API and documentation work in Preview. That workspace routing change is not part of the standalone site and does not add an API server requirement.

Optional analytics are enabled only when a valid `VITE_GOATCOUNTER_CODE` is supplied at build time. Leave it unset to load no analytics.

- Keep the provisional `data_status` disclosure until a human reviewer completes the source and method checklist.
- Confirm OpenFreeMap and underlying map attribution.
- Verify direct-route loading on the actual host.
- Review keyboard navigation, mobile layout, and export readability.
- Confirm the configured public issue repository remains accessible.
- Check all scientific claims against current authoritative documents.
