# Serenagri AI

Serenagri AI is an AI-powered agricultural intelligence platform designed to optimize food production, supply-demand matching, and agricultural supply chain efficiency for Indonesia. The system helps farmers decide what crops to grow, helps buyers find reliable agricultural suppliers, and provides insights for policymakers to stabilize food systems.

## Platform Capabilities

- **Buyer Sourcing Demand** - Capture buyer demand patterns for farmer matching
- **Crop Recommendation** - AI-powered crop suitability analysis based on land data
- **Farmer-Buyer Supply Matching** - Connect farmer supply with buyer demand
- **Weather Risk Analysis** - Climate risk assessment for agricultural planning
- **Buyer-Logistics Planning** - Connect buyer delivery needs with logistics providers
- **Agricultural Financing Assessment** - Connect farmer needs with financial institutions
- **Buyer-Farmer Transactions** - Contract drafting, negotiation, and monitoring
- **Policy and Simulation Monitoring** - Government view over analysis and transaction data
- **AI Advisory Chat** - Role-aware agricultural assistant

## Supported User Roles

- **Farmers** - Crop recommendations, yield estimates, cost projections
- **Buyers and food distributors** - Demand planning, farmer matching, transactions, logistics planning
- **Agricultural suppliers** - Input and market demand visibility around farmer-buyer matching
- **Logistics providers** - Buyer delivery planning and route coordination
- **Financial institutions** - Farmer financing assessment
- **Government agencies** - Policy insights and food security monitoring

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **AI**: Google Gemini API (gemini-1.5-flash)
- **Language**: Bilingual (English / Bahasa Indonesia)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Login Credentials

Demo login:
- **Username**: `user`
- **Password**: `user123`

Select your role (Farmer, Buyer, Supplier, Logistics, Finance, Government) during login to see role-specific dashboard content.

## Features

### Farmer Workflow

Input your land data to receive:
- Best crops to plant (ranked by profitability and suitability)
- Expected yield estimates per hectare
- Detailed production cost breakdown
- Weather risk assessment
- Potential buyer matching
- Required farming inputs
- Available government subsidies
- Financing options

### Buyer Workflow

Submit commodity demand to receive:
- Potential production regions across Indonesia
- Estimated supply capacity per region
- Logistics route suggestions
- Delivery timeline estimates
- Supply risk analysis
- Recommended supplier types

### Government Policy Insights

Analyze regional data for:
- Regional crop production capacity
- Food supply shortage identification
- Demand-supply imbalance mapping
- Agricultural risk zone identification
- Policy intervention recommendations

### AI Chat

Free-form conversation with the agricultural AI assistant for any agriculture-related questions about Indonesian farming, markets, weather, logistics, and policy.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components (ui, layout, feature-specific)
├── contexts/               # React Context providers (Auth, Language, Role)
├── i18n/                   # Internationalization (English + Bahasa Indonesia)
├── lib/                    # Utilities, Gemini client, AI prompts, constants
└── types/                  # TypeScript type definitions
```

## Language Toggle

The platform supports bilingual content:
- **English (EN)** - Full English interface
- **Bahasa Indonesia (ID)** - Full Indonesian interface

Toggle between languages using the EN/ID switch in the top navigation bar.
