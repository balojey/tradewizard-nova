---
inclusion: always
---

# TradeWizard Product Overview

TradeWizard is an AI-powered prediction trading platform that provides intelligent analysis and trading recommendations for real-world political and economic outcomes on Polymarket.

## Core Value Proposition

TradeWizard transforms prediction markets from speculative guessing into guided, intelligence-driven trading by providing:

- **Multi-Agent AI Analysis**: Specialized AI agents analyze markets from different perspectives (news, polling, market dynamics, sentiment, risk)
- **Explainable Recommendations**: Clear trade signals with reasoning, catalysts, and risk scenarios
- **Real Market Integration**: Direct integration with regulated Polymarket infrastructure
- **Professional-Grade Intelligence**: Bloomberg Terminal-style analytics for prediction markets

## Key Components

### Backend (tradewizard-agents)
Multi-agent system built on LangGraph that:
- Ingests market data from Polymarket APIs
- Runs specialized AI agents for market analysis
- Generates structured trade recommendations
- Stores analysis results in Supabase database

### Frontend (tradewizard-frontend)
Next.js web application that:
- Displays AI-generated market intelligence
- Provides seamless trading interface via Magic Link authentication
- Shows real-time market data and recommendations
- Manages user portfolios and trading sessions

## Target Users

- Prediction market power users seeking analytical edge
- Politically engaged retail traders
- Crypto-native traders looking for regulated real-world exposure
- Data-driven investors interested in event-driven markets

## Business Model

SaaS subscription tiers for AI trading intelligence:
- Starter: Basic market insights and probability analysis
- Pro: Full strategy recommendations and risk modeling
- Elite: Advanced agents and early signal detection

## Product Development Principles

### User-Centric Design
- Prioritize clarity and explainability in all AI outputs
- Ensure trading recommendations include reasoning and risk assessment
- Provide actionable insights, not just data
- Design for both power users and newcomers to prediction markets

### Data Integrity
- All market data must be sourced from Polymarket APIs
- Maintain audit trails for all analysis and recommendations
- Validate all external data (news, polling) before use
- Store analysis history for transparency and learning

### Performance & Reliability
- Real-time market data updates via Supabase subscriptions
- Graceful degradation when external APIs are unavailable
- Consistent response times for trading recommendations
- Robust error handling with user-friendly messaging

### Security & Compliance
- Secure wallet authentication via Magic Link
- No storage of private keys or sensitive credentials
- Compliance with Polymarket's terms and regulations
- Rate limiting on external API calls to prevent abuse

## Feature Prioritization

When evaluating new features, consider:
1. **Impact on trading decisions**: Does it improve recommendation quality?
2. **User experience**: Is it intuitive and accessible?
3. **Data reliability**: Can we source and validate the data consistently?
4. **System scalability**: Can it handle growth without degradation?
5. **Regulatory compliance**: Does it align with market regulations?