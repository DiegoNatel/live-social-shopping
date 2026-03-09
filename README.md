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

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **UI Components:** Radix UI
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vivobuy.git
cd vivobuy

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
| `/live` | All live and scheduled streams |
| `/live/[id]` | Watch a live stream |
| `/cart` | Shopping cart |
| `/checkout` | Checkout process |
| `/profile` | User profile and settings |
| `/notifications` | User notifications |
| `/seller/dashboard` | Seller analytics dashboard |

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

