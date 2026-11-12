# SMART OUTFIT
**Your Style, Our Inspiration**

A Bangladesh-focused MERN fashion commerce starter with a React/Vite storefront, Express API, MongoDB models, and a responsive admin workspace.

## Current implementation
- Responsive storefront foundation with home, shop, product detail, cart, login and admin routes.
- Product catalogue seed data for UI development; cart persists in browser storage.
- Shared purple/black/white design system, BDT formatting, English/Bangla language toggle.
- Express API health endpoint, MongoDB connection setup, core Mongoose schemas, security middleware and product/order/auth route foundations.
- Admin overview shell and management navigation.

## Not yet live / requires configuration
- Database-backed account registration/login, checkout/order persistence and admin permissions.
- Real bKash/Nagad/Rocket payment processing and server-side verification.
- Pathao/Steadfast/RedX courier booking and tracking.
- Cloudinary media uploads, email/SMS, Google OAuth, refunds, 2FA and scheduled backups.
- Production security review, automated test suite and deployment verification.

No payment success, courier booking, or database persistence is simulated as a real transaction.

## Requirements
- Node.js 20+
- npm 10+
- MongoDB Atlas or local MongoDB

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
