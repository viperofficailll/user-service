# User Service

Handles user auth, registration, and profiles. Four roles: `USER`, `RESTAURANT`, `DELIVERY_AGENT`, `ADMIN`.

## Stack

Node.js · Express · TypeScript · Prisma · PostgreSQL · Zod · Multer · Cloudinary · JWT · Vitest

## Folder Structure

```
user-service/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── schemas/           # strores definations for all. 
│   ├── utils/
│   │   ├── multer.ts       # stores upload in /public/temp before cloudinary
│   │   └── cloudinary.ts   # uploads file, returns url, deletes local temp
│   └── routes/
├── tests/
└── generated/prisma/
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Environment Variables

```env
DATABASE_URL=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NODE_ENV=development
PORT=3000
```

---

## Endpoints

Base: `http://localhost:3000/api/v1/servio/user`

---

### POST `/register`

**Content-Type:** `multipart/form-data`

Multer accepts a single file under the field name `image`. The file is saved temporarily to `/public/temp`, uploaded to Cloudinary, and the returned URL is stored in the database. The rest of the body goes in a `data` field as a JSON string.

| Field | Type | Description |
|---|---|---|
| `data` | Text | JSON string of the registration body |
| `image` | File | Optional. Stored on Cloudinary. |

Image is saved to:
- `user.imageUrl` for `USER`
- `restaurant.imageUrl` for `RESTAURANT`
- `deliveryAgent.licenseImageUrl` for `DELIVERY_AGENT`

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

**Role: RESTAURANT** — requires admin verification before login
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

**Role: DELIVERY_AGENT** — requires admin verification before login
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

**Response: USER / ADMIN** `201`
```json
{
  "success": true,
  "accessToken": "<jwt>",
  "user": { "id": 1, "role": "USER", "name": "Bikash Sharma", "email": "bikash@example.com", "phoneNumber": "+9779800000000", "imageUrl": null }
}
```

**Response: RESTAURANT / DELIVERY_AGENT** `201`
```json
{
  "success": true,
  "message": "Your information has been gathered. You will receive an email once your account is activated.",
  "user": { "id": 2, "role": "RESTAURANT" }
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

**Response** `200`
```json
{
  "success": true,
  "accessToken": "<jwt>",
  "user": { "id": 1, "role": "USER", "name": "Bikash Sharma", "email": "bikash@example.com", "phoneNumber": "+9779800000000", "imageUrl": null }
}
```

Sets `refreshToken` as an `httpOnly` cookie valid for 7 days.

| Error | Status |
|---|---|
| Wrong email or password | 401 |
| Account not yet verified | 403 |
| Restaurant blocklisted | 403 |

---

### POST `/logout`

**Auth:** `Authorization: Bearer <token>`

No body. Clears the refresh cookie and removes the token from the database.

**Response** `200`
```json
{ "success": true, "message": "Logged out successfully." }
```

---

### POST `/refresh`

**Auth:** `refreshToken` cookie (set on login automatically)

No body.

**Response** `200`
```json
{ "success": true, "accessToken": "<new_jwt>" }
```

---

### POST `/verify`

**Auth:** `Authorization: Bearer <token>` (ADMIN only)

**Content-Type:** `application/json`

```json
{ "role": "RESTAURANT", "id": 1 }
```

```json
{ "role": "DELIVERY_AGENT", "id": 2 }
```

**Response** `200`
```json
{ "success": true, "message": "Restaurant verified successfully." }
```

---

### GET `/profile`

**Auth:** `Authorization: Bearer <token>`

No body. Returns profile based on the role in the token.

**Response: USER** `200`
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

**Response: RESTAURANT** — same as above plus:
```json
{
  "restaurant": { "id": 1, "panNumber": "PAN123456", "paymentGateway": "E_SEWA", "merchantId": "MID001", "imageUrl": null, "isVerified": true, "isBlockListed": false }
}
```

**Response: DELIVERY_AGENT** — same as above plus:
```json
{
  "deliveryAgent": { "id": 1, "vehicleNumber": "BA 1 CHA 2345", "licenseNumber": "LIC-98765", "licenseImageUrl": null, "isVerified": false }
}
```

**Response: ADMIN** — same as above plus:
```json
{
  "adminProfile": { "id": 1 }
}
```

---

### GET `/health`

**Response** `200`
```json
{ "success": true, "message": "OK" }
```

---

## Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```