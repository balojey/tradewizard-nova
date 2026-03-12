---
inclusion: always
---

# TradeWizard Technical Stack

## Architecture Overview

TradeWizard is a full-stack TypeScript application with a multi-agent backend and modern web frontend, integrated with Polymarket's prediction market infrastructure.

## Backend (tradewizard-agents)

### Core Technologies
- **Runtime**: Node.js 18+ with ES2022 modules
- **Language**: TypeScript with strict mode enabled (no `any` types)
- **AI Framework**: LangGraph for multi-agent workflows
- **LLM Providers**: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini), Amazon (Nova)
- **Observability**: Opik for LLM tracing and cost tracking
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Validation**: Zod schemas for type-safe data validation

### Key Dependencies
- `@langchain/langgraph` - Multi-agent workflow orchestration
- `@langchain/core` - LangChain core abstractions
- `@polymarket/clob-client` - Polymarket API integration
- `@supabase/supabase-js` - Database and real-time subscriptions
- `opik` - LLM observability and tracing
- `zod` - Runtime type validation

### Testing Framework
- **Unit Tests**: Vitest with 30s timeout for LLM calls
- **Property-Based Tests**: fast-check for correctness properties
- **Coverage**: V8 provider with text/json/html reports
- **E2E Tests**: Custom scripts for 24h continuous monitoring

### Code Patterns
- **Nodes**: Pure functions that transform LangGraph state (in `src/nodes/`)
- **External APIs**: All calls wrapped in `src/utils/` (polymarket-client, newsdata-*, etc.)
- **Database**: Use persistence layer in `src/database/` for all data operations
- **Configuration**: Centralized in `src/config/index.ts`, validated with Zod
- **Error Handling**: Graceful degradation with user-friendly messaging

## Frontend (tradewizard-frontend)

### Core Technologies
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4
- **State Management**: React Query (@tanstack/react-query) for server state
- **Authentication**: Magic Link SDK for wallet connection
- **Blockchain**: ethers.js v5 and viem for Web3 interactions
- **UI Components**: Lucide React icons, Framer Motion animations

### Key Dependencies
- `@polymarket/clob-client` - Trading API integration
- `@supabase/supabase-js` - Real-time data subscriptions
- `magic-sdk` - Wallet authentication
- `recharts` - Data visualization
- `date-fns` - Date manipulation

### Code Patterns
- **Components**: PascalCase in feature directories (Trading/, Performance/)
- **Hooks**: camelCase with `use*` prefix, use React Query for server state
- **Utilities**: kebab-case pure functions in `lib/` and `utils/`
- **Providers**: React context in `providers/` for global state (Wallet, Trading, Query)
- **Validation**: Zod schemas in `utils/validation.ts` (shared with backend)

## Database & Infrastructure

### Supabase PostgreSQL
- **Real-time subscriptions** for live market data
- **Row Level Security (RLS)** for data access control
- **Auto-generated TypeScript types** from schema (in `lib/database.types.ts`)
- **Migration system** for schema versioning

### Key Tables
- `markets` - Market metadata and analysis status
- `recommendations` - AI-generated trade recommendations  
- `agent_signals` - Individual agent analysis results
- `analysis_history` - Audit trail of analysis runs

## Development Workflow

### Backend Commands (tradewizard-agents)
```bash
npm run monitor:dev              # Start with hot reload
npm run build           # Compile TypeScript to dist/
npm test               # Run all tests
npm run test:e2e       # End-to-end tests
npm run cli -- analyze <conditionId>  # Analyze market
npm run migrate        # Run database migrations
```

### Frontend Commands (tradewizard-frontend)
```bash
npm run dev    # Start Next.js dev server
npm run build  # Build for production
npm run lint   # ESLint checking
```

## Code Quality Standards

### TypeScript
- Strict mode enabled, no `any` types
- Use interfaces for type definitions (in `src/models/types.ts`)
- Use Zod schemas for runtime validation (in `src/models/schemas.ts`)
- Named exports preferred over default exports

### Testing
- Unit tests: `*.test.ts` co-located with source
- Property-based tests: `*.property.test.ts` for correctness properties
- Integration tests: `*.integration.test.ts` for multi-component workflows
- E2E tests: `scripts/` directory for full system validation

### Formatting & Linting
- ESLint configured for TypeScript with Next.js rules
- Prettier for consistent code formatting
- Run linting before commits

## Configuration Management

### Environment Variables
- **Multi-provider LLM setup** (OpenAI, Anthropic, Google)
- **Single-provider mode** for budget-friendly operation
- **Opik integration** for observability (cloud or self-hosted)
- **LangGraph checkpointing** (memory, SQLite, PostgreSQL)

### Build Configuration
- **esbuild** for fast backend compilation
- **TypeScript** with ES2022 target
- **Vitest** for testing with globals enabled
- **Next.js** with Tailwind CSS integration

## Integration Points

### External APIs
- **Polymarket CLOB API** - Market data and trade execution
- **NewsData.io** - Real-time news feeds
- **Multiple LLM providers** - AI analysis capabilities
- **Supabase** - Database and real-time subscriptions

### Security Best Practices
- **API keys**: Managed via environment variables only
- **Rate limiting**: Implement for external API calls
- **Input validation**: All user input validated with Zod schemas
- **Audit logging**: All operations logged for compliance
- **No private keys**: Magic Link handles wallet authentication securely