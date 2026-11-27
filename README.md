# SMART OUTFIT
**Your Style, Our Inspiration**

A Bangladesh-focused MERN fashion commerce starter with a React/Vite storefront, Express API, MongoDB models, and a responsive admin workspace.

## Current implementation
- Responsive storefront with home, API-backed shop/category catalogue, product details, cart, checkout, customer registration/login, account profile/address and order history.
- Customer carts persist in browser storage; signed-in wishlists now sync to MongoDB, while guest wishlists remain local to the browser.
- Shared purple/black/white design system, BDT pricing, Bangladesh phone/address validation and an English-first interface with a basic language toggle.
- Express/Mongoose APIs for products, categories, customers, orders, coupons, settings, inventory, support tickets, delivery metadata, reporting and staff roles.
- Checkout now reserves inventory, limited coupon usage and the order in one MongoDB transaction; cancellation and advance-payment rejection restore stock and release coupon usage atomically.
- Admin product/category CRUD, stock adjustments, order status and manual advance-payment verification, coupon management, customer access controls and store settings.

## Not yet live / requires configuration
- Full production end-to-end and concurrency tests against the live MongoDB Atlas database.
- Real bKash/Nagad/Rocket payment processing and server-side verification.
- Pathao/Steadfast/RedX courier booking and tracking.
- Cloudinary media uploads, email/SMS, Google OAuth, refunds, 2FA and scheduled backups.
- Production security review, staging database integration tests and deployment verification.
- Automated backend and storefront unit tests run in GitHub Actions; they do not replace live database or browser end-to-end tests.

No payment success, courier booking, or database persistence is simulated as a real transaction.

## Requirements
- Node.js 20+
- npm 10+
- MongoDB Atlas or a MongoDB replica set (checkout uses multi-document transactions)

## Run locally
```bash
cp .env.example server/.env
# Set MONGODB_URI and a strong JWT_SECRET in server/.env
npm install
npm run dev
```
Client: http://localhost:5173  
API: http://localhost:5000/api/health

The client reads `VITE_API_URL` from the root environment or its own `.env` file. For local development, the default is `http://localhost:5000/api`.

## Build
```bash
npm run build
npm start
```

## Suggested deployment
1. Push this folder to a private/public GitHub repository.
2. Create a MongoDB Atlas database and allow only the required deployment IPs.
3. Deploy `server/` as a Render web service; set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV`.
4. Deploy `client/` as a static site with build command `npm install && npm run build`, publish directory `dist`, and `VITE_API_URL` set to the API URL plus `/api`.
5. Configure HTTPS, custom domain, CORS origins, backups, logging and monitoring.
6. Add payment/courier credentials only after obtaining official merchant accounts and implementing provider-specific verification flows.

## Project layout
- `client/` — React/Vite customer and admin UI
- `server/` — Express API, Mongoose models and middleware
- `.env.example` — configuration template; never commit secrets
- `render.yaml` — initial Render API blueprint

## Security notes
JWT secret is mandatory in production. Passwords are hashed with bcrypt. Authentication uses bearer tokens for this starter; production deployment should additionally review refresh-token rotation, secure cookie strategy, CSRF posture, audit logging, rate limits, upload scanning and admin MFA.


## Development increment: API-backed catalogue (2026-11-12)
- Storefront shop now requests published products and active categories from the Express API, with a clearly labeled local preview fallback when the API is unavailable.
- Homepage featured products attempt to load from the API.
- Product detail attempts an API lookup before retaining its local preview fallback.
- Added public category listing and admin-protected product/category create/update/delete endpoints.
- Added admin catalogue screens for product creation/deletion and category creation.
- Added a shared Axios client that attaches the locally stored bearer token.
- Production startup now refuses to run without `JWT_SECRET`.

### Admin access note
The starter deliberately does not create a default administrator or expose a public admin bootstrap route. Create the first administrator through a controlled database provisioning process before using admin CRUD. The API role guard currently allows `super_admin`, `admin`, and `editor` for product/category editing; production permission granularity still needs review.


## Security increment (2026-11-13)
- Added an explicit authentication rate-limit policy covering customer login, registration, staff/admin login and the one-time Super Admin bootstrap endpoint.
- Added Node's built-in test runner and regression tests for the protected authentication entry points and skip conditions.
- Run checks with `npm test` from the repository root. These tests cover the rate-limit route policy only; they do not replace integration, database or end-to-end tests.


## Customer wishlist increment (2026-11-13)
- Added a MongoDB-backed wishlist on customer accounts, with authenticated list/add/remove endpoints.
- Signed-in storefront sessions load and update the account wishlist; guest wishlists remain browser-local. Wishlist state is cleared on logout/account switching to avoid leaking one customer's saved products to another account on a shared device.
- The API caps each account wishlist at 200 products and rejects invalid or unpublished product IDs.


## Transactional checkout increment (2026-11-14)
- Added server-side Bangladesh delivery-address and phone validation helpers, strict cart-line normalization, duplicate-variant merging and per-variant quantity limits.
- Order placement now uses a MongoDB session transaction so stock decrements, coupon usage reservation and order creation either all commit or all roll back. Invalid advance-payment details no longer leave stock deducted.
- Coupon usage limits are reserved atomically at checkout and released on order cancellation or advance-payment rejection.
- Cancellation and advance-payment verification now update order status, inventory and coupon usage in the same transaction. Shipped/delivered orders must use the return workflow; verified advance delivery payments cannot be cancelled until a refund is resolved.
- The delivery workspace no longer exposes a cancellation path that bypasses inventory restoration.
- These transactions require MongoDB Atlas or another replica-set/sharded MongoDB deployment. Unit tests cover checkout validation and calculations; live database concurrency tests remain outstanding.


## Granular staff access increment (2026-11-15)
- Added a server-side permission matrix for Super Admin, Admin, Editor, Support and Viewer roles.
- Product/category/coupon writes, inventory adjustments, order access and status updates, advance-payment verification, customer management, support, delivery, reports, analytics and store settings now use separate permission checks.
- Admin cannot change staff roles or read the Super Admin activity log. Editor can manage catalogue/coupons but cannot adjust inventory or orders. Support can work with support tickets and order updates but cannot verify advance payments. Viewer is read-only.
- The admin sidebar hides Roles & Access and Activity Log from non-Super-Admin accounts.
- Automated tests cover the permission matrix; authenticated route integration and staging database tests are still required.


## Refund safety increment (2026-11-16)
- Manual refund recording now uses an atomic compare-and-set against the order's previous refunded total. If two staff requests race, only the request based on the current balance can be recorded; the other receives a conflict response and must refresh.
- Refund references cannot be duplicated within the same order, and refund amounts remain capped at the verified amount received (advance amount for prepaid orders, full total for paid COD orders).
- Added unit tests for partial/full refunds, payment eligibility, legacy orders without a stored refund total, duplicate-reference protection and the compare-and-set guard.
- This records a refund that staff have already completed through the bank/mobile wallet; it does not initiate a real payment-provider refund.


## Public customer support flow (2026-11-17)
- Fixed the public Contact Us form, which previously posted to an admin-only route and therefore required a staff bearer token.
- Added `POST /api/support` outside the authenticated admin router. It validates name, reply email, optional Bangladesh mobile number, subject and message before saving a ticket for the existing Admin Support workspace.
- Added a per-IP limit of five support submissions per 15 minutes and a honeypot field; automated submissions that fill the honeypot are accepted without being stored.
- The endpoint returns only a receipt message and ticket ID, not the submitted personal details. Email/SMS notifications are not sent unless a separate provider integration is configured.
- Added unit tests for input normalization, validation, Bangladesh phone format and honeypot handling. Live MongoDB ticket creation and end-to-end browser submission still require staging verification.


## Customer returns increment (2026-11-18)
- Customers can submit a return request from their own delivered order within seven days of the recorded delivery timestamp. The API checks order ownership, verified payment, delivery history, request reason length and active-request duplication.
- Return requests are embedded in the order record and include customer reason, review status, reviewer, timestamps and store note. Submission uses an atomic order update to prevent concurrent duplicate active requests.
- Staff with `returns.manage` can approve or reject a pending request; rejection requires a customer-visible reason. Approved items can be marked received. Only after receipt does the order enter the existing `returned` state and become eligible for the existing manual refund ledger.
- Refund recording remains a manual record of money already sent; no bank/mobile-wallet transfer is initiated. The return-request window is currently fixed at seven days. Live database and browser end-to-end tests are still required.

## Return review concurrency increment (2026-11-19)
- Staff approve/reject/receive decisions now use a single MongoDB compare-and-set update against the exact embedded return request ID and its expected prior status. Concurrent reviewers cannot both change the same pending request.
- Marking a return as received also requires the parent order to remain delivered; the same atomic update changes the order to returned and appends its status-history entry.
- Added normalized review-note validation and conflict responses so stale Admin screens must refresh rather than silently overwrite another staff member's decision.
- Removed `returned` from the generic order-status API. Staff must mark an approved request as received through Returns & Refunds; this prevents directly changing an order to returned and bypassing the review/receipt step.
- Added unit tests for transition filters, note validation, the atomic received update and the generic status guard. These tests verify policy/update construction; an actual concurrent MongoDB integration test remains outstanding.

## Order fulfilment transition guard (2026-11-20)
- The staff order-status API now enforces a sequential lifecycle: pending → confirmed → processing → shipped → delivered. Orders may be cancelled only before shipment; delivered, cancelled and returned orders are terminal in the generic status API.
- Orders awaiting manual bKash/Nagad advance-payment verification can only be cancelled; they cannot enter fulfilment until the payment is verified.
- The Admin order selector shows only the current status and valid next steps. The server remains authoritative and returns a conflict response for skipped, reversed, repeated or terminal transitions.
- Added isolated unit tests for the transition matrix. These tests validate policy logic; authenticated API and live MongoDB workflow tests remain outstanding.



## Partial returns and inspected inventory receipt (2026-11-21)
- Customers can select specific purchased order lines and whole-number quantities for return. The API snapshots the original product, SKU, size, colour and unit price; it ignores client-supplied prices and product details.
- Requested, approved and received quantities are reserved against the original order line. A customer can submit another return request for the remaining quantities after the previous request is received or rejected, within the original seven-day delivery window.
- Return receipt runs in a MongoDB transaction. Staff can explicitly select only inspected, resaleable items to restock; selected variant stock and aggregate product stock are incremented with the order/request receipt update. Items not selected are recorded as received but are not returned to available stock.
- The order becomes `partially_returned` until all ordered quantities have been received; only then does it become `returned`. Generic fulfilment status updates cannot set either return status.
- Refund ceilings are calculated from received item quantities after proportional coupon/discount allocation and exclude delivery charge. Refunds remain manual records of money already sent; no bKash/Nagad transfer is initiated.
- These receipt and stock updates require a MongoDB replica set or sharded cluster. Unit tests cover item selection, quantity reservation, return progress, restock selection and refund limits; live concurrent MongoDB and browser end-to-end tests remain outstanding.


## Customer return and refund timeline (2026-11-22)
- Customer Order Tracking now shows return-request decisions in chronological order, including request/review timestamps, selected product variants and customer-visible store notes.
- Added the store-recorded refund ledger to the customer's own order details, with amount, processed date, transaction reference and note. The UI labels these as recorded refunds and does not initiate or claim a payment transfer.
- Separated actual order statuses from the `return_requested` history event so customers no longer see an event-only value in the order-status filter.
- Added a dependency-free storefront unit test suite and wired it into the root `npm test` command and GitHub Actions.
- The customer timeline reads the authenticated customer's existing `/api/orders/mine` response. Live database persistence, payment transfer and browser end-to-end behavior still require staging verification.


## Customer return reservation concurrency fix (2026-11-23)
- Customer return submission now uses the order's dedicated order field (returnRequestRevision) as a compare-and-set guard, in addition to the ownership, eligible-order-status and no-active-request conditions.
- The request and customer-visible history event are appended while incrementing returnRequestRevision in the same atomic update. If two tabs/devices submit against the same remaining quantities, only the first update can reserve them; the other receives HTTP 409 and must refresh.
- Legacy orders without a version key match only when returnRequestRevision is absent or zero; the successful update initializes the version key, preventing a second stale submission from winning.
- Added unit tests for versioned and legacy filters and the atomic update shape. These tests verify query/update construction; concurrent writes against a real MongoDB replica set and browser flows still require staging verification.


## Configurable customer return window (2026-11-23)
- Added a Super Admin-only setting for the customer return request window, configurable from 1 to 30 calendar days after the recorded delivery timestamp. Existing stores and orders default to 7 days unless the setting is changed.
- The authenticated customer return endpoint reads the same persisted setting used by the public storefront configuration, so the customer-facing form and server eligibility check stay aligned. The API remains authoritative and reports the configured window when it has expired.
- The General Settings workspace shows the control only to Super Admin accounts. The server rejects attempts by other staff roles to change this specific setting even if they can edit other store settings.
- Added unit coverage for default, boundary, invalid and custom-window eligibility behavior. Staging database and browser end-to-end verification are still required.


## Verified customer product reviews (2026-11-24)
- Added a customer review API that exposes only Admin-approved reviews and aggregates real average ratings/counts for published products.
- Customers can submit one review per product only after a paid order is delivered. Products whose quantities are reserved by an active return or already received return cannot be reviewed; retained quantities on a partial return remain eligible.
- New reviews enter the existing Admin → Product Reviews moderation queue and are not shown publicly until approved.
- Added an 8-submission-per-15-minute IP limit for review POST requests and a unique product/customer index to prevent duplicate reviews under concurrent submissions.
- Removed the storefront's hard-coded 4.8-star fallback. Product cards now show only approved rating aggregates; products without approved reviews are labeled as new instead of displaying a fabricated score.
- Automated policy tests cover input validation, verified purchase eligibility, return reservations and duplicate-review state. Database/index creation, authenticated route integration and browser end-to-end review moderation still require staging verification.


## Delivery workspace transition guard (2026-11-24)
- Reused the shared sequential order-status transition policy in the Admin delivery update endpoint. Delivery staff can no longer skip confirmed → processing → shipped → delivered or mark a COD order paid by jumping directly to delivered.
- Courier name and tracking-number edits remain available without changing order status. Invalid status jumps return HTTP 409.
- Added a regression test for delivery-workspace transition rules. Authenticated API and live database verification remain outstanding.


## API-backed catalogue filtering and pagination (2026-11-25)
- The public products endpoint resolves category filters by MongoDB ID, URL slug, or exact category name, so current slug links and older shared category-name links work.
- Search is literal (regex metacharacters are escaped) and covers product name, description, and tags. Server-side filters support BDT minimum/maximum price, size, colour, in-stock items, and sale items.
- Added deterministic recommended/newest/price/featured/best-seller ordering and server-side pagination with a 48-item maximum page size. Responses include effective page, page count, total count, and limit.
- The storefront requests filtered pages from the API instead of downloading only the first 48 products and filtering that partial list in the browser. Search, category, sort, filter, and page state are shareable through URL query parameters.
- Added a clearly labeled preview-catalogue filter fallback when the API is unavailable. Preview products remain non-purchasable.
- Added pure backend and storefront catalogue helper tests. These do not replace MongoDB integration or browser end-to-end tests.

## Catalogue-wide filter facets (2026-11-26)
- Added public `GET /api/products/facets`, which aggregates available sizes and colours across the full matching published catalogue, not just the current paginated product page.
- Facets combine legacy product-level size/colour arrays with size/colour values stored on variants, de-duplicate values per product, and include product counts plus the matching BDT price range.
- Category, literal search, in-stock and sale constraints are respected; the selected size, colour and price range are intentionally excluded from facet discovery so customers can still see alternative options and clear a selected filter.
- The Shop page now loads facet data independently with abortable requests, uses catalogue-wide options for API results, preserves a selected option when it temporarily has zero matches, and keeps preview-only options when the API is unavailable.
- Added unit tests for aggregation pipeline construction and defensive storefront facet normalization. Real MongoDB aggregation and browser end-to-end verification remain outstanding.


## Checkout reliability increment (2026-11-27)
- Customer checkout now sends a cryptographically random `Idempotency-Key` and retains it locally against a SHA-256 fingerprint of the checkout payload until the API confirms the order.
- The API scopes idempotency to the authenticated customer, hashes the normalized order payload, and returns the existing order on a safe retry instead of reserving stock or coupon usage twice.
- A reused key with changed order details returns HTTP 409. A deterministic order `_id` also protects concurrent retries if the compound idempotency index has not yet been built.
- Idempotency keys and request fingerprints are excluded from normal order query projections and removed from checkout responses.
- Existing MongoDB transaction requirements remain: use Atlas or a replica set for checkout inventory and coupon atomicity. No payment provider is called; bKash/Nagad delivery-fee verification remains manual.
