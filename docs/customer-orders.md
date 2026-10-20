# Customer order operations

This runbook covers the static customer request flow at `/briefing`.

## Acceptance criteria

- A valid request creates one Formspree submission containing every visible order choice and contact field.
- The confirmation page is reachable from the wizard only after Formspree returns an HTTP success status.
- An STL is used solely for local preview. No file object or byte content is sent to Formspree or written to browser storage.
- Selecting an STL sets `stlSeleccionado` so the administrator knows to request it by email.
- Network, validation, quota, and timeout failures keep the entered answers available and never display a false success state.
- Maker and product deep links retain their selection while requiring the customer to complete all five steps.
- Step errors are visible and announced; choice groups are labelled; focus follows step changes; keyboard-only completion is possible.
- Confirmation data expires, malformed browser storage cannot break the page, and the private receipt is marked `noindex, nofollow`.
- The flow remains usable at narrow and wide viewports and does not load Three.js until a previewable STL is selected.

## Delivery path

- The production build sends customer submissions to the dedicated Formspree form `xpqgngdj`.
- Set `PUBLIC_FORMSPREE_PEDIDOS_ENDPOINT` at build time to change the customer form without changing source code.
- Customer records include `tipo=pedido_cliente` for operational filtering.
- A successful submission includes `referencia` and `requestId`. Treat matching `requestId` values as the same attempt if a customer retried after a timeout.
- The STL itself never leaves the browser. When `stlSeleccionado` says yes, contact the customer at the submitted email address and ask them to reply with the STL.

## Free-tier constraints

As checked on 20 October 2026, Formspree's Free plan costs $0, accepts AJAX forms, allows 50 submissions per month, keeps 30 days of submission history, and includes no file-upload storage or automatic customer autoresponses. If the existing endpoints belong to the same Formspree account, customer requests, maker registrations, and reviews all consume that account allowance.

Recheck the official [Formspree plans](https://formspree.io/plans) and [account limits](https://help.formspree.io/articles/account-management/account-limits/) before relying on these limits in future planning.

Monitor the Formspree dashboard and notification inbox. If the allowance is exhausted, customers see an honest error and retain their browser draft so they can retry or email `contacto@3dbok.com`.

## Formspree setup checklist

1. Confirm the target email for form `xpqgngdj` is monitored.
2. Keep Formspree's spam filtering enabled.
3. Restrict submissions to the production domain when the dashboard configuration is ready.
4. Test that `tipo`, `referencia`, `requestId`, contact details, order details, and `stlSeleccionado` appear in both the notification and dashboard.
5. Do not enable file fields for this MVP; doing so would contradict the customer copy and exceed the Free plan's attachment allowance.

## Failure handling

- HTTP success: the browser stores a validated confirmation summary for 30 minutes and opens `/confirmacion`.
- Storage unavailable after HTTP success: the wizard shows an in-page receipt with the reference; URL parameters alone never create a success state.
- Validation or service error: the customer remains on the final step, sees an actionable error, and can retry without re-entering text.
- Twenty-second timeout: delivery is uncertain. The same `requestId` is retained for one cautious retry so administrators can identify a duplicate.
- Reload before submission: non-file answers are restored for two hours in the same tab and URL context. Browsers do not retain the STL; the customer is told to select it again.

## Manual release test

1. Open `/briefing` at a narrow mobile width and complete all five steps using only the keyboard; confirm focus moves to each new heading and errors are announced.
2. Verify short descriptions, no design choice, no size, invalid email, and a date less than seven days away cannot advance or submit.
3. Select a small valid STL; rotate and zoom its local preview, then remove it. Confirm no file field or file bytes appear in the Formspree request.
4. Select an STL over 20 MB; confirm the request can continue, the preview is skipped, and the UI says the file will be requested by email.
5. Reload midway; confirm text/choices return but the STL does not. Wait beyond the documented TTL or alter the URL query and confirm an unrelated draft is not restored.
6. Start from a maker profile and a product card. Confirm the maker/product remains selected, the product notice is visible, and the wizard still begins at step 1.
7. Submit against the live Formspree form. Confirm exactly one dashboard/email record arrives with `tipo=pedido_cliente`, all expected fields, and the correct `stlSeleccionado` value.
8. Confirm the success page appears only after the network success, displays the reference and accurate next steps, survives one refresh, and contains a `noindex, nofollow` robots meta tag.
9. Simulate offline mode, a 422 response, a 429 response, and a timeout. Confirm no success page appears, the draft remains, the submit button re-enables, and the error gives a usable next action.
10. Open `/confirmacion` directly, with a fabricated `?referencia=...` parameter, malformed storage, a future timestamp, and an expired record. Confirm every case shows the empty state without a script error.
11. Repeat the happy path at a wide desktop width and check the privacy link, visible focus styles, layout, and Spanish copy.

## Automated checks

Run `npm test` to validate request/reference generation, confirmation TTL and schema checks, Formspree field construction (including the absence of STL bytes), and customer-facing failure messages. The deployment workflow runs these tests before the production build.
