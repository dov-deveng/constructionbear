# ConstructionBear.AI — Setup Guide

## Quick Start

### 1. Install dependencies
```bash
cd constructionbear
npm install --prefix server
npm install --prefix client
```

### 2. Configure server environment
```bash
cp server/.env.example server/.env
```
Edit `server/.env` and set at minimum:
- `JWT_SECRET` — any long random string (required)
- `ANTHROPIC_API_KEY` — your Anthropic API key (required for chat)

### 3. Start development
```bash
# Terminal 1 — API server (port 3457)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Open http://localhost:5173

---

## Environment Variables

### Server (`server/.env`)
| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Long random string for signing tokens |
| `ANTHROPIC_API_KEY` | Yes | For AI chat and document generation |
| `GOOGLE_CLIENT_ID` | Optional | Enable "Login with Google" button |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth (server-side verification) |
| `STRIPE_SECRET_KEY` | Optional | Enable subscription payments |
| `STRIPE_WEBHOOK_SECRET` | Optional | For Stripe webhooks |
| `STRIPE_PRICE_ID` | Optional | Your $19.99/month price ID in Stripe |
| `SMTP_HOST` | Optional | Email server for verification emails |
| `SMTP_USER` | Optional | Email sender address |
| `SMTP_PASS` | Optional | Email password/app password |
| `CLIENT_URL` | Optional | Frontend URL (default: http://localhost:5173) |

### Client (`client/.env`)
| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Optional | Same as server GOOGLE_CLIENT_ID |

---

## Connecting Services

### Stripe (Payments)
1. Create account at stripe.com
2. Create a recurring price at $19.99/month
3. Copy `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` to `server/.env`
4. Set up webhook endpoint: `POST https://yourdomain.com/stripe/webhook`
5. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Google OAuth ("Login with Google")
1. Go to console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add authorized origins: your domain
4. Copy client ID to both `server/.env` and `client/.env`

### Email (Verification + Password Reset)
Works with any SMTP. For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password
3. Set `SMTP_USER=your@gmail.com`, `SMTP_PASS=your-app-password`

---

## Production Deployment

The client builds to `client/dist/` — serve this with any static host.
The server is a standard Node.js Express app — deploy to Railway, Render, Fly.io, etc.

For Cloudflare Tunnel (already used by Bear):
- Point `app.doveandbearinc.com` → `localhost:3457` for API
- Serve `client/dist/` via Cloudflare Pages or a static server
