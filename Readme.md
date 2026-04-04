#  User Service

A RESTful microservice handling user authentication, registration, and profile management for the platform. Built with **Express**, **TypeScript**, **Prisma**, and **PostgreSQL**.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Running Tests](#running-tests)

---

## Overview

User Service manages four distinct user roles — `USER`, `RESTAURANT`, `DELIVERY_AGENT`, and `ADMIN` — each with their own registration flow, profile data, and access rules.

- `USER` — Standard customer. Receives tokens immediately on registration.
- `RESTAURANT` — Requires admin verification before login is permitted.
- `DELIVERY_AGENT` — Requires admin verification before login is permitted.
- `ADMIN` — Full platform access. Can verify restaurants and delivery agents.

Profile images are uploaded to **Cloudinary** before registration data is persisted to the database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |
| File Upload | Multer + Cloudinary |
| Auth | JWT (access + refresh tokens) |
| Testing | Vitest |

---

## Project Structure

```
src/
├── controllers/        # Request handlers
│   ├── register.controller.ts
│   ├── login.controller.ts
│   ├── logout.controller.ts
│   ├── refresh.controller.ts
│   ├── verify.controller.ts
│   └── profile.controller.ts
├── services/           # Business logic
│   ├── register.service.ts
│   ├── login.service.ts
│   ├── logout.service.ts
│   ├── refresh.service.ts
│   ├── verify.service.ts
│   └── profile.service.ts
├── middlewares/
│   ├── authenticate.ts     # Verifies JWT, attaches req.user
│   ├── requireAdmin.ts     # Guards admin-only routes
│   └── errorHandler.ts     # Global error handler
├── schemas/
│   └── user.schema.ts      # Zod schemas + inferred types
├── utils/
│   ├── cloudinary.ts
│   ├── hash.ts
│   ├── jwt.ts
│   ├── multer.ts
│   └── prismaClient.ts
└── routes/
    └── user.route.ts
tests/
├── register.controller.test.ts
├── register.service.test.ts
├── login.controller.test.ts
├── login.service.test.ts
├── verify.controller.test.ts
├── verify.service.test.ts
├── profile.controller.test.ts
└── profile.service.test.ts
generated/
└── prisma/             # Prisma generated client
```

---

## Database Schema

```
User
 ├── id, name, email, password, phoneNumber, imageUrl, role, refreshToken
 ├── Address        (1:1) — city, address, streetNumber, latitude, longitude
 ├── Restaurant     (1:1) — panNumber, paymentGateway, merchantId, imageUrl, isVerified, isBlockListed
 ├── DeliveryAgent  (1:1) — vehicleNumber, licenseNumber, licenseImageUrl, paymentGateway, merchantId, isVerified
 └── Admin          (1:1)
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/servio
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=development
PORT=3000
```

---

## API Reference

Base URL: `http://localhost:3000/api/v1/servio/user`

---

### POST `/register`

Registers a new user. Accepts `multipart/form-data` with a JSON `data` field and an optional `image` file.

**Content-Type:** `multipart/form-data`

| Form Field | Type | Description |
|---|---|---|
| `data` | Text | JSON string of the registration body |
| `image` | File | Profile / restaurant / license image (optional) |

**Role: USER**
```json
{
  "role": "USER",
  "name": "Bikash Sharma",
  "email": "bikash@example.com",
  "password": "securepass123",
  "phoneNumber": "+9779800000000",
  "address": {
    "city": "Kathmandu",
    "address": "Durbar Marg",
    "streetNumber": "1",
    "latitude": 27.7136,
    "longitude": 85.3157
  }
}
```

**Role: RESTAURANT** — `image` saved as `restaurant.imageUrl`. Requires admin verification.
```json
{
  "role": "RESTAURANT",
  "name": "Bistro Nepal",
  "email": "bistro@example.com",
  "password": "securepass123",
  "phoneNumber": "+9779811111111",
  "panNumber": "PAN123456",
  "paymentGateway": "E_SEWA",
  "merchantId": "MID001",
  "address": {
    "city": "Kathmandu",
    "address": "Thamel",
    "streetNumber": "5"
  }
}
```

**Role: DELIVERY_AGENT** — `image` saved as `deliveryAgent.licenseImageUrl`. Requires admin verification.
```json
{
  "role": "DELIVERY_AGENT",
  "name": "Sita Rai",
  "email": "sita@example.com",
  "password": "securepass123",
  "phoneNumber": "+9779822222222",
  "vehicleNumber": "BA 1 CHA 2345",
  "licenseNumber": "LIC-98765",
  "licenseImageUrl": "https://example.com/license.jpg",
  "paymentGateway": "E_SEWA",
  "merchantId": "MID002",
  "address": {
    "city": "Lalitpur",
    "address": "Pulchowk",
    "streetNumber": "5B"
  }
}
```

**Role: ADMIN**
```json
{
  "role": "ADMIN",
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepass123",
  "phoneNumber": "+9779833333333",
  "address": {
    "city": "Kathmandu",
    "address": "Bagmati",
    "streetNumber": "9"
  }
}
```

**Responses:**

`201` — USER / ADMIN (tokens issued immediately)
```json
{
  "success": true,
  "accessToken": "<jwt>",
  "user": { "id": 1, "role": "USER", "name": "...", "email": "...", "phoneNumber": "...", "imageUrl": null }
}
```

`201` — RESTAURANT / DELIVERY_AGENT (pending activation)
```json
{
  "success": true,
  "message": "Your information has been gathered. You will receive an email once your account is activated.",
  "user": { ... }
}
```

---

### POST `/login`

**Content-Type:** `application/json`

```json
{
  "email": "bikash@example.com",
  "password": "securepass123"
}
```

`200`
```json
{
  "success": true,
  "accessToken": "<jwt>",
  "user": { "id": 1, "role": "USER", "name": "...", "email": "...", "phoneNumber": "...", "imageUrl": null }
}
```

Sets `refreshToken` as an `httpOnly` cookie.

| Error | Status | Reason |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_PENDING` | 403 | Not yet verified by admin |
| `ACCOUNT_BLOCKED` | 403 | Restaurant has been blocklisted |

---

### POST `/logout`

**Auth required:** Bearer token

No request body. Clears the `refreshToken` cookie and invalidates the token in the database.

`200`
```json
{ "success": true, "message": "Logged out successfully." }
```

---

### POST `/refresh`

Issues a new access token using the refresh token cookie.

**Auth:** `refreshToken` cookie (set automatically on login)

`200`
```json
{ "success": true, "accessToken": "<new_jwt>" }
```

---

### POST `/verify`

**Auth required:** Bearer token (ADMIN only)

Verifies a restaurant or delivery agent, allowing them to log in.

```json
{
  "role": "RESTAURANT",
  "id": 1
}
```

```json
{
  "role": "DELIVERY_AGENT",
  "id": 2
}
```

`200`
```json
{ "success": true, "message": "Restaurant verified successfully." }
```

---

### GET `/profile`

**Auth required:** Bearer token

Returns the authenticated user's profile. Response shape varies by role — only the relevant related table is included.

`200` — USER
```json
{
  "success": true,
  "profile": {
    "id": 1, "name": "Bikash Sharma", "email": "bikash@example.com",
    "phoneNumber": "+9779800000000", "imageUrl": null, "role": "USER",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "address": { "city": "Kathmandu", "address": "Durbar Marg", "streetNumber": "1", "latitude": 27.7136, "longitude": 85.3157 }
  }
}
```

`200` — RESTAURANT (includes `restaurant` object)

`200` — DELIVERY_AGENT (includes `deliveryAgent` object)

`200` — ADMIN (includes `adminProfile` object)

---

### GET `/health`

`200`
```json
{ "success": true, "message": "OK" }
```

---

## Authentication

The service uses two JWTs:

- **Access Token** — Short-lived, sent in the `Authorization: Bearer <token>` header.
- **Refresh Token** — Long-lived (7 days), stored as an `httpOnly` cookie and persisted in the database. Used by `POST /refresh` to issue new access tokens.

---

## Error Handling

All errors flow through the global error handler in `src/middlewares/errorHandler.ts`.

| Error Type | Status | Description |
|---|---|---|
| Zod validation failure | 400 | Invalid request body |
| Duplicate field (Prisma P2002) | 409 | email, phoneNumber, licenseNumber, etc. already in use |
| `Error` with known message | 400 | Business logic errors (not found, already verified, etc.) |
| Unhandled | 500 | Internal server error |

---

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests are located in the `tests/` directory and use **Vitest** with full mocking of Prisma, Cloudinary, and JWT utilities. All services and controllers have unit test coverage across every branch.#   u s e r - s e r v i c e  
 