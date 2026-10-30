# VivoBuy - Live Social Shopping Platform 🇧🇷

A next-generation live social shopping platform for the Brazilian market, combining real-time streaming, social interaction, and seamless commerce.

![VivoBuy Banner](https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200)

## 🚀 Features

### For Shoppers
- **Live Streaming** - Watch HD live product demonstrations
- **Interactive Shopping** - Buy products directly during streams with 3-tap checkout
- **Social Engagement** - Chat, react, and interact with hosts and other viewers
- **PIX Payment** - 5% discount on instant payments via Brazil's PIX system
- **Personalized Discovery** - AI-curated feed based on interests

### For Sellers/Hosts
- **Professional Dashboard** - Real-time analytics and stream management
- **Product Carousel** - Showcase products during live streams
- **Engagement Tools** - Polls, flash sales, and giveaways
- **Revenue Tracking** - Commission and sales analytics

### Platform Highlights
- 🎯 Mobile-first responsive design
- 🇧🇷 Portuguese (Brazilian) localization
- 💳 Multiple payment methods (PIX, Credit, Boleto)
- 🎮 Gamification with loyalty points and badges
- 🔒 Secure transactions with PCI-DSS compliance

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router) on Cloudflare Workers (OpenNext)
- **Data:** Cloudflare D1 (SQLite), R2 for images, Better Auth for login
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **UI Components:** Radix UI
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 📦 Installation

Runs on Cloudflare Workers (via OpenNext) with a D1 database, R2 for uploaded images and Better Auth for login.

```bash
npm install

# Local secrets: copy and set BETTER_AUTH_SECRET (any long random string)
cp .dev.vars.example .dev.vars

# Local database
npm run db:migrate:local
npm run db:seed:local

# Start development server (D1 and R2 run locally through Wrangler)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Live features (chat, reactions, viewers, polls, auctions)

Each live stream has a `LiveRoom` Durable Object (`src/realtime/live-room.ts`) that holds the viewers'
WebSockets, saves chat to D1, counts viewers and closes auctions when they end. `worker.ts` wraps the
OpenNext worker to export it and route `/api/live/<id>/ws` to it. Signed-in viewers connect with a
short-lived ticket from `/api/live/<id>/ticket`; signed-out viewers can watch and are counted but can't chat.
A Cron Trigger (every 5 minutes, `scheduled()` in `worker.ts`) closes auctions that ended while nobody was
watching. Auction winners pay at `/auctions/<id>`.

`npm run dev` (Next.js dev server) can't run Durable Objects, so the chat shows as unavailable there.
To try the live features locally, build and run the real Worker:

```bash
npm run preview   # opennextjs-cloudflare build, then serves the Worker locally
```

Better Auth only accepts requests from `BETTER_AUTH_URL`, so set it in `.dev.vars` to the address the
preview prints.

### Deploying

Pushes to `master` deploy automatically through GitHub Actions (`.github/workflows/deploy.yml`) once the
repository has the `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `BETTER_AUTH_SECRET` secrets; the
workflow creates the image bucket, applies migrations, builds and deploys. To deploy from your own machine instead:

```bash
# One-time setup
npx wrangler r2 bucket create vivobuy-images
npx wrangler secret put BETTER_AUTH_SECRET

npm run db:migrate:remote   # also after pulling new migrations
npm run deploy              # creates the LiveRoom Durable Object on first deploy
```

### Google login (optional)

1. In Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID of type *Web application*.
2. Add the redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local use).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.dev.vars` locally and with `npx wrangler secret put` in production.

The "Continuar com Google" button only appears once both are set.

### Live video (optional)

Video runs on [LiveKit Cloud](https://cloud.livekit.io): the host broadcasts camera and microphone from the
live page (phone or computer browser) and viewers watch with under a second of delay.

1. Create a LiveKit Cloud project; under **Settings → Keys** create an API key.
2. Set `LIVEKIT_URL` (`wss://<project>.livekit.cloud`), `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` as GitHub
   secrets (the deploy copies them to Cloudflare) or with `npx wrangler secret put`, and in `.dev.vars` locally.

To record each live and play it back after it ends, also set `RECORDINGS_S3_ENDPOINT`
(`https://<account id>.r2.cloudflarestorage.com`), `RECORDINGS_S3_ACCESS_KEY` and `RECORDINGS_S3_SECRET` from an
R2 API token with Object Read & Write on the `vivobuy-images` bucket (R2 → Manage API tokens).

Without these the live page shows the stream's cover image, as before.

### Payments (Asaas)

Buyers pay by Pix (QR code on the site), card or boleto (Asaas's payment page). Each payment is
split: sellers and live hosts get their part in their own Asaas wallet (sellers paste their wallet
id in the dashboard), minus VivoBuy's fee (`src/lib/fees.ts`); the rest stays in VivoBuy's account.

1. Create an account at [sandbox.asaas.com](https://sandbox.asaas.com) (test money) and copy the API key
   (Integrações → Chave de API).
2. Set the secrets `ASAAS_API_KEY` and `ASAAS_WEBHOOK_TOKEN` (any long random string).
3. In Asaas → Integrações → Webhooks, add `https://<site>/api/payments/webhook` with that token, API
   version v3, and the charge events (Cobranças) on.
4. For real money, use a production key and set `ASAAS_ENV=production`.

Without `ASAAS_API_KEY`, orders are registered and wait for payment, as before.

**Refunds** (`src/lib/refunds.ts`) always return the whole order. Before shipping, the buyer cancels in
"Meus pedidos" and the money goes back right away. After shipping (up to 30 days, `REFUND_WINDOW_DAYS`), the
buyer asks, the seller arranges the return and confirms "Recebi de volta" in the dashboard, and that sends the
refund. Boleto buyers give a bank account on an Asaas page. A refund Asaas refuses is tried again every hour.
Refunds made in Asaas's panel and chargebacks arrive by webhook and update the order; sellers can't ship
during a refund or dispute. The API key needs the `PAYMENT_REFUND:WRITE` permission.

### Shipping (Melhor Envio)

Checkout quotes the real freight by CEP (Correios, Jadlog and others) and offers "Econômico" and
"Expresso". Each seller ships their own items from the CEP they set in the dashboard, receives the
shipping in the payment split (no VivoBuy fee on it), buys the label themselves and adds the tracking
code to the order. Products can carry their package weight and size; otherwise a small parcel is assumed.

1. Create an account at [sandbox.melhorenvio.com.br](https://sandbox.melhorenvio.com.br) and generate a
   token (Integrações → Permissões de acesso → Gerar token) with the `shipping-calculate` scope.
2. Set the secrets `MELHOR_ENVIO_TOKEN` and `MELHOR_ENVIO_CONTACT` (an email Melhor Envio can reach).
3. For real prices, use a token from melhorenvio.com.br and set `MELHOR_ENVIO_ENV=production`.

Without a token (or for a seller with no CEP yet), shipping is a flat R$ 19,90 per seller.

### E-mail (Brevo)

Sends password recovery links and order news (paid, shipped, refunded…). Order e-mails are queued in
`notifications` and sent by the cron every 5 minutes, so they can take a few minutes; if Brevo is down
they wait for the next run. Anything older than a day is dropped.

1. Create an account at [brevo.com](https://www.brevo.com) and add a sender (Senders & IP → Senders),
   confirming it by the e-mail Brevo sends.
2. Create an API key (SMTP & API → API keys).
3. Set the secrets `BREVO_API_KEY` and `EMAIL_FROM` (the confirmed sender).

Without them nothing is sent and "Esqueci minha senha" doesn't appear. A sender on your own domain
(authenticated in Brevo) lands in the inbox far more often than a Gmail address.

### Before launch

`/terms`, `/privacy` and `/help` show placeholders (company name, CNPJ, address, contact e-mails) defined in `src/lib/company.ts`. Fill them in and have the terms and privacy policy reviewed by a lawyer.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── discover/          # Explore streams/products
│   ├── live/              # Live streams
│   │   └── [id]/          # Individual stream page
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Checkout flow
│   ├── profile/           # User profile
│   ├── notifications/     # Notifications
│   └── seller/            # Seller dashboard
├── components/
│   ├── layout/            # Layout components
│   ├── stream/            # Streaming components
│   ├── product/           # Product components
│   └── ui/                # Reusable UI components
├── store/                 # Zustand stores
├── types/                 # TypeScript types
├── lib/                   # Utilities
└── data/                  # Mock data
```

## 🎨 Design System

### Colors
- **Tropical Green:** `#00D85F` - Primary CTAs, success states
- **Deep Ocean:** `#0A1628` - Backgrounds
- **Sunset Gold:** `#FFD23F` - Highlights, special offers
- **Coral Pink:** `#FF6B6B` - Live indicators, urgency
- **Sky Blue:** `#4ECDC4` - Information, links
- **Purple Glow:** `#6B46C1` - Premium features

### Typography
- **Display:** Montserrat (Bold/Black)
- **Body:** Inter (Regular/Medium/Semibold)

## 🚦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with live streams and products |
| `/discover` | Browse all streams and products |
| `/search` | Search products, lives and sellers |
| `/deals`, `/trending` | Biggest discounts, best sellers of the last 30 days |
| `/courses` | Courses |
| `/schedule` | Upcoming lives by day |
| `/live/[id]` | Watch a live stream |
| `/cart`, `/checkout` | Cart and checkout |
| `/orders` | Order history |
| `/profile` | User profile |
| `/wishlist`, `/reviews` | Favorites; rate purchased products |
| `/addresses`, `/settings` | Address book; profile, password, sessions |
| `/payment-methods`, `/referral`, `/help` | Payment info, invite link, FAQ |
| `/terms`, `/privacy` | Terms of use and privacy policy (LGPD) — drafts |
| `/notifications` | User notifications |
| `/seller/dashboard` | Seller dashboard |
| `/seller/products/new`, `/seller/streams/new` | Add a product (with variants and images), schedule a live |

## 🌐 Localization

The platform is fully localized for Brazilian Portuguese (pt-BR):
- All UI text in Portuguese
- Currency: Brazilian Real (R$)
- Date format: DD/MM/YYYY
- PIX payment integration
- WhatsApp sharing support

## 🔐 Payment Methods

- **PIX** - Instant payment with 5% discount
- **Credit Card** - Up to 12x installments
- **Boleto Bancário** - Bank slip payment
- **Digital Wallets** - Mercado Pago, PicPay

## 📈 KPIs & Metrics

Target metrics for the platform:
- Stream engagement rate: >40%
- Conversion rate: 8-10%
- Cart abandonment: <30%
- Average watch time: >15 minutes

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for the Brazilian market

**VivoBuy** - Compras ao vivo, direto do coração do Brasil! 🇧🇷

