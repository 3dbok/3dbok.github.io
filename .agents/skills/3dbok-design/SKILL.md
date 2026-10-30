---
name: 3dbok-design
description: Audit and improve the visual design of the 3dbok Astro website while preserving its workshop identity, conversion journeys, accessibility, performance, and existing behavior. Use for project-specific layout, typography, spacing, color, hierarchy, responsive polish, and microinteraction work; do not use for unrelated feature or backend changes.
---

# 3dbok Design

Make focused, professional visual improvements to 3dbok. Refine the existing system; do not replace it with a new aesthetic or expand the product.

## Establish the baseline

Before changing files:

1. Read the repository `AGENTS.md` completely and follow it as the source of truth for product behavior, routes, data contracts, accessibility, and engineering conventions.
2. Check the active branch and `git status`. Preserve unrelated and user-owned changes. Do not switch branches, commit, or push unless the user explicitly asks.
3. Inspect the affected page, its shared components, `src/styles/global.css`, and any relevant shared stylesheet. Trace reused classes and behavioral `data-*` hooks before editing markup.
4. Render the current interface in a browser. Inspect the affected route at mobile, tablet, and desktop sizes before proposing changes. Exercise relevant interactive states rather than auditing only a static screenshot.

Do not start implementation until a concise design audit exists. The audit must identify:

- the route's audience, primary task, CTA, and place in either `/briefing` or `/maker` conversion journey;
- the current hierarchy, layout/grid, typography, spacing rhythm, color roles, imagery, controls, states, and motion;
- responsive, accessibility, performance, and content-legibility problems supported by rendered evidence;
- what already works and must remain recognizable;
- a small prioritized set of improvements, with the reason and expected user benefit for each.

Distinguish observable problems from personal taste. Prefer the smallest coherent change set that resolves the audit findings.

## Preserve the product and identity

3dbok is a Spanish, local, approachable service connecting customers, designers, and independent 3D-printing makers. Keep the public voice natural, useful, and workshop-oriented. Protect these paths:

- customers understand the service, browse makers, and begin at `/briefing`;
- makers understand the proposition and register at `/maker`;
- maker and product deep links retain their selections and required order steps.

Do not invent marketplace, payment, account, fulfillment, messaging, or backend behavior. A visual task does not authorize changes to form submissions, Formspree endpoints, storage records, query parameters, data IDs, routes, validation, or the lazy Three.js STL preview.

The established visual language is a print workshop and technical drawing, not a generic SaaS template:

- warm print-bed surfaces, solid color fields, fine 1 px rules, and compact radii;
- blueprint structure and actions, with hot-filament orange used sparingly;
- grids, layers, material samples, measurements, and fabrication details as meaningful motifs;
- limited decoration, no diffuse shadow-heavy surfaces, and no collection of interchangeable rounded cards;
- restrained asymmetry or editorial composition when it improves hierarchy without obscuring the task.

Retain the existing logo and the meaningful layered Málaga boquerón illustration unless the user explicitly scopes an asset change.

## Work with the existing system

Treat `src/styles/global.css` as the shared design foundation:

- `--tinta`, `--tinta-media`, and `--tinta-suave` provide the ink hierarchy;
- `--bancada`, `--bancada-honda`, and `--pieza` define the print-bed and raised surfaces;
- `--cianotipo` and its variants carry structure and primary actions;
- `--filamento` and `--filamento-tinta` are scarce accents;
- `--linea*`, `--mat-*`, `--paso-*`, `--aire-seccion`, `--ancho`, `--canal`, and `--r-*` provide shared color, type, spacing, width, and radius decisions.

Reuse a suitable token before adding a literal. Add or revise a semantic token when a value has a repeated role; keep truly local composition in the page or component's scoped `<style>`. Extend an existing shared component or helper when a pattern appears in more than one place. Follow the Spanish BEM-like naming already in use.

The official brand colors are `#4959B8` and `#DBD4A0`, but they are not currently mapped into the implemented tokens. Never introduce them as isolated decoration or silently replace the workshop palette. If their integration is in scope:

1. explain the intended semantic roles and how they relate to the current blueprint and workbench colors;
2. compare the affected surfaces, actions, states, illustrations, and metadata before changing tokens;
3. integrate through the token system as one deliberate palette decision;
4. verify contrast for default, hover, focus, active, disabled, error, dark, and blue surfaces;
5. show the user the visual impact and call out any broad recoloring explicitly.

## Typography, layout, and responsive behavior

- Keep self-hosted Archivo for headings/body and IBM Plex Mono for labels, measurements, metadata, and technical values. Preserve `font-display: swap`; do not add remote fonts.
- Use type size, weight, stretch, line height, measure, and spacing to establish hierarchy before adding decoration. Preserve the fluid `--paso-*` scale where it fits.
- Keep headings concise and balanced, body text comfortably readable, and technical labels compact without making essential information cryptic.
- Prefer fluid layouts with `clamp()`, Grid/Flexbox, `minmax(0, 1fr)`, wrapping, and intrinsic sizing. Avoid fixed widths that cause overflow.
- Start with narrow screens. Match nearby breakpoints (roughly 940, 880/860, 780/720, 620/560, and 420 px) instead of adding one for a single pixel defect.
- Preserve `envoltura`, `envoltura--angosta`, `seccion`, `etiqueta`, `dato`, `boton`, `entrada`, and `opcion` conventions when their semantics match.
- Give controls comfortable touch targets and enough separation. Check long Spanish copy, real producer data, validation messages, and empty states for wrapping and reflow.
- Keep image dimensions or aspect ratios explicit, lazy-load below-the-fold images, and avoid layout shift.

## Microinteractions

Use motion to explain state or improve feedback, not to decorate every element.

- Align small hover/focus/state transitions with the existing quick rhythm, generally around 160–180 ms; use longer motion only when progress or spatial change needs it.
- Keep transforms subtle and avoid interactions that shift surrounding layout.
- Pair hover treatment with keyboard-visible focus and persistent selected/active cues.
- Preserve the global reduced-motion override and make scripted scrolling or animation respect `prefers-reduced-motion`.
- Do not add a client framework or animation dependency for effects native CSS and small DOM scripts can handle.

## Accessibility and behavior

Keep meaningful HTML before styling. Preserve one clear `h1`, heading order, landmarks, lists, labels, fieldsets, table scopes, useful alternative text, and descriptive links.

- Preserve the skip link, `#contenido`, visible `:focus-visible`, keyboard access, and the mobile menu's Escape behavior.
- Keep native buttons for actions. Do not make generic elements clickable.
- Preserve required ARIA state and live feedback, including `aria-current`, `aria-expanded`, `aria-controls`, `aria-pressed`, progress values, busy/error states, and focus management in multi-step forms.
- Never use color alone to communicate selection, status, validation, or links.
- Retain `[hidden] { display: none !important; }`; authored display rules otherwise expose hidden panels.
- Meet WCAG AA contrast: at least 4.5:1 for normal text and 3:1 for large text and essential graphical/control boundaries.
- Verify keyboard order, focus visibility, zoom/reflow, touch usability, reduced motion, and success, error, disabled, empty, and loading states affected by the change.

## Implement and verify

Use Astro, semantic HTML, scoped component styles, the shared CSS system, and native browser APIs. Avoid dependencies unless the user has explicitly approved a need the existing stack cannot meet. Keep static rendering and the current performance profile.

After implementation:

1. Run `npm run build`. Run `npm test` when order-flow contracts, shared order helpers, form behavior, or relevant hooks could have been affected.
2. Serve the built site or development site and inspect it in a real browser; source review alone is insufficient.
3. Verify at least one representative viewport in each class and record the exact sizes used:
   - mobile: about `390 × 844` (also check `320 px` width for horizontal overflow when practical);
   - tablet: about `768 × 1024`;
   - desktop: about `1440 × 900`.
4. Check the affected route at all three sizes. If shared tokens, navigation, buttons, fields, or footer changed, spot-check `/`, `/briefing`, `/maker`, `/productores`, and one producer profile as applicable.
5. Exercise keyboard and interactive states. Test the mobile navigation, every modified control, long/empty content, and relevant form validation without sending production submissions.
6. Compare the result with the baseline audit. Remove changes that add novelty without improving hierarchy, comprehension, trust, responsiveness, accessibility, or conversion.

Report the reasoning behind the final improvements, files changed, automated checks, browser viewports/routes/states inspected, and any remaining limitation. Do not claim a viewport or interaction was verified unless it was rendered and exercised.

## Visual QA checklist

- [ ] The visual audit was completed before edits and names the user task, strengths, problems, and priorities.
- [ ] The result still looks unmistakably like 3dbok's technical print workshop, not a generic template or unrequested redesign.
- [ ] The primary CTA and next step are obvious; `/briefing` and `/maker` journeys remain intact.
- [ ] Shared tokens/components were reused; any new token has a clear semantic role and no unnecessary color literals were scattered.
- [ ] Any use of `#4959B8` or `#DBD4A0` was deliberate, tokenized, explained, and contrast-tested across states and surfaces.
- [ ] Heading hierarchy, paragraph measure, type roles, alignment, whitespace, and section rhythm create a clear reading order.
- [ ] Layouts reflow without clipping, overlap, accidental horizontal scroll, or awkward empty space at mobile, tablet, and desktop sizes.
- [ ] Real Spanish content, long labels, errors, empty states, and dynamic/selected states remain legible.
- [ ] Buttons, links, forms, navigation, tables, imagery, and cards retain consistent visual and interaction patterns.
- [ ] Hover, focus, active, selected, disabled, loading, success, and error states are distinct and do not rely on color alone.
- [ ] Keyboard order is logical; focus is always visible; mobile navigation and modified interactions work with keyboard and Escape where applicable.
- [ ] Contrast meets WCAG AA, targets are comfortably tappable, and the page remains usable at 200% zoom.
- [ ] Motion is purposeful, restrained, layout-stable, and disabled or simplified under reduced-motion preferences.
- [ ] Images have appropriate alternative text, dimensions/aspect ratios, loading behavior, and no avoidable layout shift.
- [ ] No unnecessary framework, font, animation library, or client JavaScript was introduced.
- [ ] `npm run build` passes; relevant tests pass; rendered checks list exact routes, viewports, and states actually inspected.
