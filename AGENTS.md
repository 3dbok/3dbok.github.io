# 3dbok repository guide

This file applies to the whole repository. It describes the codebase as it exists and gives implementation guidance for future changes. Preserve existing behaviour and the established visual language unless a task explicitly calls for a redesign or product change.

## Product and business context

3dbok is a Spanish platform that connects:

- customers who need a custom or replacement 3D-printed object;
- designers who can turn an idea into a printable model; and
- independent local makers who own 3D printers.

The initial market is Spain, beginning in Málaga. The public site is written in Spanish and uses an approachable, local, workshop-oriented voice. The two main conversion paths are:

1. Customer: understand the service, browse makers, and start at `/briefing`.
2. Producer: understand the proposition and register at `/maker`.

Product priorities, in order of day-to-day engineering concern, are maintainability, SEO, mobile-first responsive behaviour, accessibility, performance, and clear conversion into one of those two paths. Do not invent marketplace, payment, account, fulfilment, or backend capabilities that are not present in the repository.

The business-provided brand colours are:

- Primary: `#4959B8`
- Secondary: `#DBD4A0`

These exact values are not currently wired into the site's CSS tokens. The implemented design uses the workshop palette documented below. Treat the two values above as brand context, but do not silently recolour the existing site: a broad palette change is a design change and should be intentional.

## Technical overview

- Astro `5.18.2`, using the default static output.
- JavaScript/ES modules; there is no TypeScript configuration and no client UI framework.
- Three.js `0.184.0`, dynamically loaded only for the STL preview in the customer briefing.
- npm with `package-lock.json` lockfile version 3.
- No Astro adapter, CMS, database, authentication, server routes, or application backend. Customer, maker, and review forms use Formspree as an external form receiver.
- Focused order-flow tests use Node's built-in test runner through `npm test`. No external test framework, linter, formatter, or `astro check` script is configured.
- Canonical production origin: `https://3dbok.com` in both `astro.config.mjs` and `public/CNAME`.

Astro's locked Node engine range is `18.20.8 || ^20.3.0 || >=22.0.0`; deployment deliberately uses Node 20.

## Repository map

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages build and deployment
├── astro.config.mjs               # Astro config; sets the production site URL
├── docs/                          # operational notes and manual release plans
├── package.json                   # dev/build/preview scripts and two direct dependencies
├── public/                        # assets copied verbatim to the site root
│   ├── CNAME
│   ├── favicon.svg
│   ├── fonts/                     # self-hosted Archivo and IBM Plex Mono
│   └── img/                       # runtime image URLs such as /img/productores/...
├── scripts/                       # auxiliary Printables research tooling; not part of Astro
├── test/                          # Node tests for customer-order contracts
└── src/
    ├── components/                # reusable Astro UI
    ├── data/                      # producer and review JSON sources
    ├── img/                       # duplicate source images; currently not imported by pages
    ├── layouts/BaseLayout.astro   # shared document shell and metadata
    ├── lib/                       # shared order, icon, and producer helpers
    ├── pages/                     # file-based routes
    └── styles/                    # global tokens/utilities and producer-page composition
```

Do not edit generated or installed content in `dist/`, `.astro/`, or `node_modules/`. Public JSON data currently points at root-relative files in `public/img/`; the copies under `src/img/` are not used by the current implementation.

## Routes and page responsibilities

### `/` — `src/pages/index.astro`

The acquisition landing page. It explains the three-step service, example order types, materials, the first three makers from `productores.json`, and the maker recruitment call to action. Its animated hero illustration is `PiezaEnCapas.astro`.

### `/briefing` — `src/pages/briefing.astro`

A five-step, client-side customer wizard:

1. description;
2. whether an STL already exists, with optional local preview;
3. approximate size;
4. maker, material, colour, date, and budget;
5. contact details.

`?maker=<productor.id>` preselects a producer. When a valid `?product=<producto.id>` is also supplied, the wizard locks the producer select and shows the chosen work, but still starts at step 1 so that required order details are not skipped.

The final step submits `FormData` to the dedicated Formspree endpoint `https://formspree.io/f/xpqgngdj` with `Accept: application/json`; it can be changed at build time with `PUBLIC_FORMSPREE_PEDIDOS_ENDPOINT`. Every customer submission includes `tipo=pedido_cliente`, a stable `requestId`, and a human-readable reference. Only a successful HTTP response creates the short-lived confirmation summary and redirects to `/confirmacion`; failures stay in the wizard with a retry message.

The selected STL is parsed only in the browser and is never appended to the submitted `FormData` or placed in web storage. The request only sends `stlSeleccionado`, so administrators know to ask the customer for the file by email. Keep copy explicit about this limitation. Files over 20 MB are not previewed. Non-file answers are autosaved in `sessionStorage["3dbok-pedido-borrador"]` for two hours and scoped to the current path/query; a file must always be reselected after a reload.

The STL preview dynamically imports `three`, `OrbitControls`, and `STLLoader` only after a `.stl` file is chosen. Keep that lazy-loading boundary for performance. The renderer, controls, geometry, animation frame, and `ResizeObserver` are disposed when the preview is replaced or cleared.

### `/confirmacion` — `src/pages/confirmacion.astro`

Reads the versioned `3dbok-pedido` success record from `sessionStorage` and renders the customer summary only when it represents a successful, recent submission. The record expires after 30 minutes; invalid, future-dated, expired, or missing data produces an empty state linking back to `/briefing`. If Formspree succeeds but `sessionStorage` is unavailable, `/briefing` displays an in-page receipt instead of accepting a forgeable URL-only confirmation. The confirmation page is `noindex` and does not claim that an automatic email was sent.

Order option lists, display labels, storage keys, TTLs, the STL preview limit, and reference generation live in `src/lib/pedidoShared.js`; update both order pages through that shared contract.

### `/maker` — `src/pages/maker.astro`

A three-step maker-registration form for printer/material/experience details, per-material colours, and contact data. The colour controls are built with DOM APIs. On submit it posts `FormData` to the hard-coded Formspree endpoint `https://formspree.io/f/xlgyykkz`, then replaces the form with an in-page success state. There is no local account creation.

### `/productores` — `src/pages/productores/index.astro`

Build-time directory of all entries in `productores.json`. It calculates ratings from approved entries in `resenas.json`, uses the shared producer stylesheet, and links to each generated profile.

### `/productores/[slug]` — `src/pages/productores/[slug].astro`

Static maker profiles generated by `getStaticPaths()`. A profile shows identity, technical details, products, and approved reviews. Product cards deep-link into `/briefing` with producer and product IDs.

The review form posts `FormData` to `https://formspree.io/f/mvzjyjrb`. A successful Formspree submission does not update `resenas.json` or publish a review automatically; published reviews exist only when approved review data is added to the repository and the site is rebuilt.

### `/privacidad` — `src/pages/privacidad.astro`

Public Spanish privacy information for form users. It explains Formspree processing and international transfers, limited sharing with designers/makers, retention, user rights, and that STL files remain local to the customer's browser.

### `/404` — `src/pages/404.astro`

Small branded not-found page using `BaseLayout` with the normal shared navigation and footer.

## Shared components and modules

- `BaseLayout.astro`: imports global CSS; supplies the Spanish document, title/description, canonical URL, optional `noindex`, favicon, theme colour, Open Graph/Twitter basics, font preload, skip link, navigation, content target, and footer. Page titles become `<page> · 3dbok`; the home page uses the default title.
- `Nav.astro`: sticky desktop navigation plus an accessible button-controlled menu at widths up to 720 px. It marks active `/productores` and `/maker` routes with `aria-current` and closes the compact menu on Escape or breakpoint changes.
- `Footer.astro`: service, maker, contact, and privacy navigation; computes the displayed year at build time.
- `Logo.astro`: the brand mark, an ellipse with `3dbok` set in the heading face (expanded Archivo, 780) as outlines. It loads `public/img/marca/logo.svg`, or `logo-claro.svg` with `tono="claro"` on dark surfaces; colours live inside the SVG files. `public/favicon.svg` is Ignacio's boquerón on a sand plate (a copy of `resources/boqueron-favicon.svg`). `resources/` holds design sources: the original `logo.png`, its vector `logo.svg`, and the earlier boquerón mark kept for future use.
- `PiezaEnCapas.astro`: inline SVG hero showing a Málaga boquerón printed layer by layer. The home uses the `articulado` model: ten print-in-place segments that wiggle once printed and on hover. It is meaningful imagery with an accessible label, not a generic decoration.
- `MaterialChip.astro`: renders only material codes present in the shared `MATERIALES` map.
- `Estrellas.astro`: renders a five-character star string and exposes the numerical rating through an accessible label.
- `src/lib/productorShared.js`: the canonical material map for producer views, star rendering, and approved-review aggregation.
- `src/lib/pedidoShared.js`: the canonical customer-order options, labels, storage keys/expiry times, preview size limit, request/reference validation, Formspree payload/error mapping, and identity generator.
- `src/lib/boquerones.js`: geometry for the hero boquerón models (`natural`, `tricolor`, `articulado`, `lowpoly`). `PiezaEnCapas` takes a `modelo` prop and only stacks, projects and prints the layers it returns; `/boquerones` is an unlinked, `noindex` page that shows all models side by side.
- `src/lib/capas.js`: colour helpers that shade stacked SVG layers so printed pieces read as solids (hero boquerón, home wheel).

Prefer extending an existing component or shared helper when a pattern is used on more than one page. Keep one-off page composition and behaviour close to its page.

## Data contracts

`src/data/productores.json` is the source of truth for the home maker list, the directory, static profile routes, producer choices in the briefing, and product deep links. A producer currently contains:

```text
id, slug, nombre, ubicacion, foto, bio,
especialidades[], materiales[], impresoras[], tamNozzle[],
tiempoRespuestaHoras, productos[]
```

Each product contains:

```text
id, nombre, foto, material, colorHex,
tiempoImpresionHoras, dimensiones, precioDesde
```

Keep producer IDs, slugs, and product IDs unique and stable. `id` is used in query strings, reviews, and form data; `slug` owns the public URL. Adding a producer automatically adds its profile at build time. Image paths beginning with `/img/` must resolve under `public/img/`.

Producer material codes must match keys in `src/lib/productorShared.js` (`PLA`, `PETG`, `ABS`, `TPU`, `RESINA`, `NYLON`) or `MaterialChip` will render nothing. Note that other UI flows deliberately use their own values: the briefing stores lowercase IDs such as `pla` and `resin`, while maker registration uses Spanish display strings such as `Resina`. Do not normalize one list without updating every consumer and the confirmation labels.

`src/data/resenas.json` is currently empty. The code expects review objects with at least:

```text
productorId, aprobada, autor, valoracion, fecha, comentario
```

Only entries whose `productorId` matches and whose `aprobada` value is truthy contribute to profile output and averages. Dates are sorted by JavaScript date parsing.

## Styling and visual conventions

`src/styles/global.css` owns reset rules, font faces, design tokens, typography, layout utilities, buttons, common form controls, option controls, accessibility helpers, and reduced-motion behaviour. `src/styles/ProductorPage.css` is shared by the producer directory and profiles. Most other component/page CSS is scoped in a local `<style>` block.

The currently implemented palette is intentionally workshop-like:

- ink: `--tinta: #15181b`;
- warm print-bed background: `--bancada: #e9e7e0`;
- raised surfaces: `--pieza: #fcfbf7`;
- blueprint/action blue: `--cianotipo: #22367d`;
- hot-filament orange: `--filamento: #d75a28`;
- supporting material, status, line, and contrast variants are also centralised in `:root`.

Do not scatter new colour literals through pages when a semantic token fits. If the official brand colours are integrated in future, do it through the token system and re-check contrast and all dark/blue sections.

Typography has three explicit roles:

- expanded Archivo for headings;
- normal Archivo for body copy;
- IBM Plex Mono for labels, measurements, metadata, and technical values.

Both families are self-hosted as WOFF2 files in `public/fonts`. Preserve `font-display: swap` and avoid adding a remote font request.

The visual language uses print-bed grids, fine 1 px rules, compact radii, material/layer metaphors, solid colour fields, and very limited decorative effects. CSS naming is Spanish BEM-like: `bloque__elemento`, `bloque--modificador`, plus shared utilities such as `envoltura`, `seccion`, `etiqueta`, `dato`, `boton`, and `entrada`.

Responsive layouts use fluid `clamp()` sizing and existing breakpoints near 940, 880/860, 780/720, 620/560, and 420 px. Treat narrow screens as a primary acceptance case, avoid fixed-width overflow, and keep touch targets comfortable. Match a nearby layout rather than introducing a new breakpoint casually.

## Accessibility conventions

Preserve and extend the existing practices:

- semantic landmarks, heading order, lists, labels, and table scopes;
- the `Saltar al contenido` link and `#contenido` target;
- visible `:focus-visible` outlines on light and dark surfaces;
- `aria-current`, `aria-expanded`, `aria-controls`, `aria-pressed`, progressbar values, live error roles, and descriptive SVG/image treatment;
- native buttons for interactive choices rather than clickable generic elements;
- keyboard support for the compact navigation, including Escape;
- the global `[hidden] { display: none !important; }` rule, which is required because many panels also have authored `display` styles;
- the global `prefers-reduced-motion` override.

When adding client interaction, make the static HTML meaningful first, retain an obvious focus path, and do not use colour as the only state indicator. Decorative images may use empty `alt`; product imagery that conveys which product was selected needs descriptive alternative text.

## JavaScript and Astro conventions

- Use two-space indentation, double quotes in JavaScript, semicolons, trailing commas in multiline calls/objects where the surrounding file does, and Spanish names/comments for local domain concepts.
- Keep user-facing text in natural Spanish with correct accents. Preserve the lowercase brand spelling `3dbok` and the established use of “maker” in copy and “productores” in URLs/data.
- Put build-time imports, page constants, and data derivation in Astro frontmatter. Use inline `<script>` only for browser state and DOM interaction.
- Client scripts use plain DOM APIs and `data-*` hooks. Those attributes are behavioural contracts: update selectors and markup together.
- Prefer static rendering. Add client-side JavaScript only where interaction requires it, and avoid introducing a framework for an isolated widget.
- Keep third-party endpoints/constants near the page that owns the integration. Never place secrets in browser code; the current Formspree form IDs are public endpoints, not credentials.
- Preserve cleanup for long-lived browser resources such as animation frames, observers, WebGL objects, and event-driven previews.
- Keep root-relative internal URLs because the site is deployed at the custom-domain root.

## SEO and performance rules

All public pages should continue to use `BaseLayout`. Give non-home pages a concise, unique Spanish `title` and `descripcion`; the layout constructs the canonical URL from `Astro.url.pathname` and the configured `Astro.site`. Keep one clear `h1`, semantic sections, indexable explanatory copy, and descriptive link text.

The site is static by design. Preserve that advantage unless server behaviour is explicitly required. Keep large/interactive libraries lazy, self-host fonts, include intrinsic image dimensions where known, lazy-load below-the-fold imagery, and avoid unnecessary client state. If adding public assets, optimize them before committing and reference the right `public/` path.

## Commands

Run from the repository root:

```bash
npm ci          # reproducible dependency install from package-lock.json
npm run dev     # Astro development server
npm test        # dependency-free Node tests for customer-order contracts
npm run build   # production static build into dist/
npm run preview # serve the production build locally
```

There is currently no `lint`, `format`, or `check` script. Run `npm test` for order-flow changes and `npm run build` as the minimum production validation; then manually exercise the affected route at a narrow and a wide viewport and check keyboard interaction. For form work, verify success and failure states without assuming Formspree updates local JSON.

## Build and deployment

`.github/workflows/deploy.yml` deploys pushes to `main` and supports manual dispatch. The workflow:

1. checks out the repository;
2. installs Node 20 with npm caching;
3. runs `npm ci`;
4. runs `npm test`;
5. runs `npm run build`;
6. configures GitHub Pages;
7. uploads `./dist` as the Pages artifact; and
8. deploys it in the `github-pages` environment.

The workflow has `contents: read`, `pages: write`, and `id-token: write` permissions. Its `pages` concurrency group cancels an older in-progress deployment when a newer one starts. Do not commit `dist`; it is generated and ignored. Keep `astro.config.mjs`'s `site` and `public/CNAME` aligned if the production domain changes.

## Auxiliary Python tooling

`scripts/printables_api.py` is independent research tooling, not an Astro build input and not called by npm or GitHub Actions. It:

- searches Printables through its GraphQL endpoint;
- requests temporary download links for STL/G-code files;
- scrapes model descriptions with `cloudscraper` and Beautiful Soup;
- accepts a search term plus `--limit`, `--ordering`, and `--debug`; and
- writes `<search_term>_results.json` in the current working directory.

Its direct Python imports are `requests`, `cloudscraper`, and `bs4`; no project-level `requirements.txt` or Python package configuration exists. `scripts/benchy_results.json` and `scripts/pendientes_results.json` are captured outputs, not website content. The local `scripts/venv/` is an environment artifact and must not become an application dependency or be committed as source.

## Change checklist

Before handing off a change, check the relevant items:

1. Preserve existing routes, query parameters, `data-*` hooks, JSON IDs, and storage keys unless migration is part of the task.
2. Keep repeated domain rules in shared data/helpers/tokens rather than copying them into another page.
3. Confirm Spanish copy, a useful title/description, heading order, labels, focus behaviour, contrast, and reduced-motion behaviour.
4. Check narrow mobile layout first, then wider layouts.
5. Protect conversion paths: the customer CTA should lead to `/briefing`, producer recruitment to `/maker`, and maker/product deep links should retain their selections.
6. Avoid loading Three.js before it is needed or adding equivalent weight to static pages.
7. Run the available build validation and state clearly which manual flows were checked.
8. Keep changes focused; do not include generated output, local environments, unrelated asset rewrites, or an unrequested redesign.
