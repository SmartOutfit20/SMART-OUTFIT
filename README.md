# SMART OUTFIT

A production-ready Bangladeshi premium fashion e-commerce platform built with React + Vite frontend and Express + MongoDB backend.

## Features

- Premium retail storefront for Bangladesh market
- Responsive design with modern fashion branding
- Product catalog, cart, wishlist, and checkout flow
- Customer login and registration
- Blog and contact sections
- Admin dashboard structure for products and orders
- Express API with MongoDB-ready models
- Environment based configuration
- Render deployment guidance

## Tech stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose
- Security: Helmet, CORS, rate limiting, JWT-ready auth

## Project structure

```text
smart-outfit/
├── client/               # React frontend
├── server/               # Express backend
├── .env.example          # Environment sample
├── .gitignore
├── README.md
├── package.json
└── render.yaml           # Render deployment config
```

## Local development

1. Install dependencies:
   ```bash
   npm install --workspaces --include-workspace-root
   ```
2. Copy environment files:
   ```bash
   cp .env.example .env
   ```
3. Start development servers:
   ```bash
   npm run dev
   ```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Production build

```bash
npm run build
npm run start
```

## Environment variables

Update `.env` with your own values before deployment.

```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-outfit
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

## Render deployment

1. Push repo to GitHub.
2. Create a new Web Service on Render.
3. Set the build command to:
   ```bash
   npm install --workspaces --include-workspace-root && npm run build
   ```
4. Set the start command to:
   ```bash
   npm run start
   ```
5. Add the required environment variables from `.env.example`.

## Hostinger notes

For Hostinger, use a Node.js hosting plan, upload the repository, install dependencies, set environment variables, and run:

```bash
npm install --workspaces --include-workspace-root
npm run build
npm run start
```

## Important

This project includes the architecture, flows, and integration points for a complete e-commerce website. For live payment gateways, courier integrations, and email/SMS services, add the real credentials in production environment variables.

## License

MIT
