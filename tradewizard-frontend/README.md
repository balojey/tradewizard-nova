# TradeWizard Frontend

A Next.js 16-based web application that provides the user interface for TradeWizard's AI-powered prediction trading platform. Built with TypeScript and Tailwind CSS, it delivers professional-grade market intelligence and seamless trading execution on Polymarket.

## What is TradeWizard Frontend?

TradeWizard transforms prediction markets from speculative guessing into guided, intelligence-driven trading. The frontend provides a Bloomberg Terminal-style interface for prediction markets, featuring:

- **Multi-Agent AI Analysis**: Display insights from specialized AI agents (news, polling, market dynamics, sentiment, risk)
- **Explainable Recommendations**: Clear trade signals with reasoning, catalysts, and risk scenarios  
- **Real Market Integration**: Direct integration with regulated Polymarket infrastructure
- **Professional-Grade Intelligence**: Advanced analytics for prediction market trading

## Key Features

### AI-Powered Trade Recommendations
- Multi-Agent Analysis: Display insights from specialized AI agents with adversarial reasoning
- LangGraph Integration: Real-time access to multi-agent workflow results
- Supabase Real-time: Live updates as new recommendations are generated
- Explainable AI: Full transparency into recommendation logic, catalysts, and risk scenarios
- Consensus Engine: Probability consensus from multiple AI perspectives

### Market Intelligence
- Market Discovery: Browse and filter prediction markets with infinite scroll
- Real-time Pricing: Live market prices via Polymarket CLOB API
- Market Analytics: Volume, liquidity, and trend analysis
- Event-based Organization: Markets grouped by events and categories

### Trading Interface
- Magic Link Authentication: Seamless wallet connection with email-based authentication
- Safe Wallet Integration: Deterministic Safe deployment from EOA for enhanced security
- Polymarket CLOB API: Direct order execution via Polymarket's Central Limit Order Book
- Token Approvals: Automated ERC-20 and ERC-1155 approvals for seamless trading
- USDC.e Management: Balance tracking and Polygon network transfers
- Risk Management: Position sizing and liquidity risk assessment

## Tech Stack

### Core Technologies
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS 4 with custom design system
- **State Management**: React Query (@tanstack/react-query) for server state
- **Authentication**: Magic Link SDK for wallet connection
- **Blockchain**: ethers.js v5 and viem for Web3 interactions
- **Database**: Supabase with real-time subscriptions
- **UI Components**: Lucide React icons, Framer Motion animations

### Key Dependencies
- `@polymarket/clob-client` - Trading API integration
- `@supabase/supabase-js` - Real-time data subscriptions  
- `magic-sdk` - Wallet authentication
- `recharts` - Data visualization
- `date-fns` - Date manipulation
- `zod` - Runtime type validation

## Architecture

### System Overview

```
TradeWizard Agents (Backend)
    ↓ (Stores recommendations)
Supabase Database
    ↓ (Real-time queries)
Frontend Hooks (React Query)
    ↓ (Caching & state management)
UI Components
    ↓ (User interaction)
Trading Execution (Polymarket CLOB)
```

### Core Components

#### AI Recommendation System
- `useTradeRecommendation()` - Fetch recommendations from Supabase with React Query caching
- `AIInsightsPanel` - Comprehensive recommendation display with agent breakdown
- `RecommendationBadge` - Quick recommendation preview in market cards
- `AgentWorkflowDiagram` - Visual representation of multi-agent analysis process

#### Market Data
- `useMarkets()` - Market discovery with filtering, pagination, and infinite scroll
- `usePublicMarketPrices()` - Real-time pricing for unauthenticated users
- `MarketCard` - Market display with integrated AI recommendations
- `CategoryTabs` - Political and economic market categorization

#### Trading Session
- `useTradingSession()` - Complete trading session orchestration
- `useClobClient()` - Authenticated CLOB client management
- `useUserApiCredentials()` - API credential derivation and management

### Database Integration

The frontend connects directly to the same Supabase database used by the TradeWizard agents backend:

**Key Tables:**
- `markets` - Market metadata and analysis status
- `recommendations` - AI-generated trade recommendations
- `agent_signals` - Individual agent analysis results
- `analysis_history` - Audit trail of analysis runs

## Getting Started

### Prerequisites

1. **Supabase Configuration**
   ```bash
   cp .env.example .env.local
   
   # Configure Supabase connection
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Magic Link Setup**
   ```bash
   # Configure Magic Link for wallet authentication
   NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key
   ```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Database Types

Generate TypeScript types from your Supabase schema:

```bash
# Requires Supabase CLI
npx supabase gen types typescript --local > lib/database.types.ts
```

## Key Features

### AI Recommendation Integration

The frontend seamlessly integrates with the TradeWizard agents backend through Supabase:

- **Automatic Loading**: Recommendations are automatically fetched when viewing markets
- **Real-time Updates**: React Query provides caching and background updates
- **Detailed Analysis**: Full breakdown of agent reasoning, catalysts, and risks
- **Visual Indicators**: Clear action signals (BUY YES, BUY NO, NO TRADE) with expected value

### Market Intelligence

- **Smart Filtering**: Filter by categories, tags, and market status
- **Trend Analysis**: Volume and liquidity trending indicators
- **Event Grouping**: Related markets grouped by events
- **Real-time Pricing**: Live bid/ask spreads and mid prices

### Trading Execution

- **One-Click Trading**: Direct integration from AI recommendations to order placement
- **Risk Management**: Liquidity risk assessment and position sizing
- **Order Management**: Track active orders and positions
- **Safe Integration**: Secure multi-sig wallet deployment and management

## Development

### Project Structure

```
tradewizard-frontend/
├── app/                    # Next.js App Router pages
├── components/
│   ├── Trading/           # Trading-related components
│   │   ├── Markets/       # Market discovery and display
│   │   ├── TradeRecommendation/  # AI recommendation components
│   │   ├── Orders/        # Order management
│   │   └── Positions/     # Position tracking
│   ├── Header/            # Navigation and wallet info
│   ├── TradingSession/    # Trading session management
│   └── shared/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries (Supabase, Magic)
├── providers/             # React context providers
├── utils/                 # Pure utility functions
└── __tests__/             # Component and hook tests
```

### Key Hooks

- `useTradeRecommendation(conditionId)` - Fetch AI recommendation for a market
- `useMultipleRecommendations(conditionIds)` - Batch fetch recommendations
- `useMarkets(options)` - Market discovery with filtering
- `useTradingSession()` - Complete trading session management
- `useClobClient()` - Authenticated Polymarket CLOB client

### Component Architecture

Components follow a feature-based organization with clear separation of concerns:

- **Smart Components**: Handle data fetching and state management
- **Presentation Components**: Pure UI components with props
- **Shared Components**: Reusable UI elements (Card, Badge, LoadingState)

## Integration with TradeWizard Agents

The frontend is designed to work seamlessly with the TradeWizard agents backend:

- **Shared Database**: Both systems use the same Supabase database
- **Real-time Sync**: Frontend automatically reflects backend analysis results
- **Type Safety**: Shared TypeScript types ensure data consistency
- **Graceful Degradation**: Frontend handles missing recommendations gracefully

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Configuration

Configure environment variables for:
- Supabase connection (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Magic Link authentication (`NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY`)
- Application configuration

### Recommended Deployment

Deploy to Vercel for automatic Next.js optimization:

```bash
vercel deploy
```

## Development Guidelines

### Code Quality

- Use TypeScript strictly (no `any` types)
- Follow component patterns established in the codebase
- Implement proper error handling and loading states
- Add loading states for all async operations
- Test with real Supabase data

### Testing

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## License

This project is part of the TradeWizard platform for AI-powered prediction market trading.