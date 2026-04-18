# job-search

Core-only NestJS API that mirrors the Job search auth and webhook mechanism.

## Included

- Local login (`/auth/login`) with username + password
- JWT bearer auth for protected endpoints
- Global JWT guard with `@Public()` route bypass
- Webhook endpoint open to public (`/webhooks/orders`)

## Excluded

- Shopify and all other business modules

## Run

1. `cp .env.example .env`
2. `npm install`
3. `npm run start:dev`

## Test credentials

- username: `admin`
- password: `admin123`
# job-search
