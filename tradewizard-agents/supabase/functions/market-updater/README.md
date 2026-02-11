# Market Updater Edge Function

## Overview

The Market Updater is a Supabase Edge Function that maintains fresh market data in the TradeWizard database by periodically fetching updated information from Polymarket APIs. This lightweight serverless function runs hourly via PostgreSQL's pg_cron extension, ensuring market prices, volumes, liquidity, and resolution status remain accurate without the overhead of running full AI analysis.

## Architecture

```
┌─────────────┐      Hourly       ┌──────────────────┐
│  pg_cron    │─────────────────>│  Edge Function   │
│  Scheduler  │                   │  market-updater  │
└─────────────┘                   └──────────────────┘
                                           │
                                           │ Query Active Markets
                                           ▼
                                  ┌──────────────────┐
                                  │   PostgreSQL     │
                                  │   Database       │
                                  └──────────────────┘
                                           ▲
                                           │ Update Records
                                           │
                                  ┌──────────────────┐
                                  │  Polymarket API  │
                                  │  (CLOB Client)   │
                                  └──────────────────┘
```

### Key Features

- **Automated Updates**: Runs hourly via pg_cron to keep market data fresh
- **Efficient Processing**: Only updates markets with status 'active'
- **Resolution Detection**: Automatically detects and marks resolved markets
- **Graceful Error Handling**: Continues processing even if individual markets fail
- **Comprehensive Logging**: Returns detailed execution summary with success/failure counts

## Environment Variables

The edge function requires the following environment variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Yes | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database access | Yes | `eyJhbGc...` |
| `POLYMARKET_CHAIN_ID` | Polygon chain ID (137 for mainnet) | No | `137` |

## Local Development

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- Node.js 18+ (for local testing)
- Access to a Supabase project

### Setup

1. **Start Supabase locally**:
```bash
cd tradewizard-agents
supabase start
```

2. **Set environment variables**:
```bash
# Create a .env file in supabase/functions/market-updater/
cat > supabase/functions/market-updater/.env << EOF
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
POLYMARKET_CHAIN_ID=137
EOF
```

3. **Serve the function locally**:
```bash
supabase functions serve market-updater --env-file supabase/functions/market-updater/.env
```

### Local Testing

Test the function using curl:

```bash
curl -X POST http://localhost:54321/functions/v1/market-updater \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "total_markets": 10,
  "updated": 8,
  "resolved": 1,
  "failed": 1,
  "duration_ms": 2345,
  "errors": [
    "0x123abc: Market not found on Polymarket"
  ]
}
```

## Deployment

### Deploy to Supabase

1. **Deploy the edge function**:
```bash
cd tradewizard-agents
supabase functions deploy market-updater
```

2. **Set production environment variables**:
```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set POLYMARKET_CHAIN_ID=137
```

3. **Verify deployment**:
```bash
supabase functions list
```

### Configure Automated Scheduling

The function is automatically scheduled via pg_cron when you run the database migration:

```bash
supabase db push
```

This creates a cron job that runs hourly at minute 0 (e.g., 1:00, 2:00, 3:00).

### Manual Invocation

Test the deployed function manually:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/market-updater \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Monitoring

A comprehensive set of monitoring queries is available in [`MONITORING.sql`](./MONITORING.sql). This file includes queries for:

- **Cron Job Status**: Check job configuration, execution history, and success rates
- **Recent Market Updates**: View updated markets by time period and track update frequency
- **Resolution Detection**: Track resolved markets and outcome distribution
- **Market Status Overview**: Get overall statistics and status distribution
- **Performance Metrics**: Analyze update frequency, volume, and liquidity trends
- **Data Quality Checks**: Identify missing data and invalid values
- **Alerting Queries**: Detect stale markets and overdue cron jobs

### Quick Monitoring Commands

**Check Cron Job Status**:
```sql
SELECT * FROM cron.job WHERE jobname = 'market-updater-hourly';
```

**View Recent Executions**:
```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'market-updater-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

**View Recent Market Updates**:
```sql
SELECT 
  condition_id,
  question,
  status,
  market_probability,
  volume_24h,
  liquidity,
  updated_at
FROM markets
WHERE updated_at > NOW() - INTERVAL '2 hours'
ORDER BY updated_at DESC;
```

**Track Resolution Detection**:
```sql
SELECT 
  condition_id,
  question,
  status,
  resolved_outcome,
  updated_at
FROM markets
WHERE status = 'resolved' 
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;
```

### Monitor Function Logs

View edge function logs in the Supabase Dashboard:

1. Navigate to **Edge Functions** > **market-updater**
2. Click on the **Logs** tab
3. Filter by time range and log level

Or use the CLI:

```bash
supabase functions logs market-updater
```

For more detailed monitoring queries, see [`MONITORING.sql`](./MONITORING.sql).

## Troubleshooting

### Function Not Running

1. **Check cron job exists**:
```sql
SELECT * FROM cron.job WHERE jobname = 'market-updater-hourly';
```

2. **Check cron extension is enabled**:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

3. **Verify service role key is set**:
```sql
SELECT current_setting('app.settings.service_role_key', true);
```

### High Failure Rate

1. **Check Polymarket API status**: Verify the CLOB API is accessible
2. **Review error messages**: Check the `errors` array in function responses
3. **Verify condition_ids**: Ensure markets have valid Polymarket condition IDs

### Slow Execution

1. **Check active market count**: Large numbers of active markets increase execution time
2. **Review API rate limits**: Polymarket may throttle requests
3. **Check database performance**: Slow queries can impact overall execution

### Missing Updates

1. **Verify market status**: Only markets with status 'active' are updated
2. **Check cron schedule**: Ensure the cron job is running hourly
3. **Review function logs**: Look for errors or exceptions

## Performance Considerations

- **Execution Time**: Typically completes in 2-5 seconds for 10-50 active markets
- **API Rate Limits**: Respects Polymarket rate limits with exponential backoff
- **Database Load**: Minimal impact with efficient queries and connection pooling
- **Memory Usage**: Low memory footprint (~50MB) suitable for edge runtime

## Data Flow

1. **Initialization**: Function starts, initializes Supabase and Polymarket clients
2. **Discovery**: Queries database for all markets with status 'active'
3. **Fetching**: For each market, fetches current data from Polymarket API
4. **Comparison**: Compares fetched data with database records
5. **Update**: Updates only changed fields in the database
6. **Resolution**: Detects resolved markets and updates status accordingly
7. **Summary**: Returns execution summary with counts and errors

## API Response Format

### Success Response (200)

```json
{
  "total_markets": 15,
  "updated": 12,
  "resolved": 2,
  "failed": 1,
  "duration_ms": 3456,
  "errors": [
    "0x123abc: Market not found on Polymarket"
  ]
}
```

### Error Response (500)

```json
{
  "total_markets": 0,
  "updated": 0,
  "resolved": 0,
  "failed": 0,
  "duration_ms": 123,
  "errors": [
    "Failed to connect to database: connection refused"
  ]
}
```

## Database Schema

The function interacts with the `markets` table:

```sql
CREATE TABLE markets (
  id UUID PRIMARY KEY,
  condition_id TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'active', 'inactive', 'resolved'
  market_probability NUMERIC,
  volume_24h NUMERIC,
  liquidity NUMERIC,
  resolved_outcome TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security

- **Service Role Access**: Function uses service role key for full database access
- **Environment Variables**: Sensitive credentials stored as Supabase secrets
- **Read-Only Polymarket**: No private key required for read-only API access
- **Input Validation**: All external data validated before database updates

## Future Enhancements

- **Batch Processing**: Process markets in parallel batches for improved performance
- **Incremental Updates**: Only fetch data for markets not recently updated
- **Webhook Support**: Real-time updates via Polymarket webhooks
- **Analytics Dashboard**: Track update frequency and API success rates
- **Smart Scheduling**: Adjust frequency based on market activity

## Support

For issues or questions:
- Check the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions)
- Review the [Polymarket CLOB API documentation](https://docs.polymarket.com/)
- Open an issue in the TradeWizard repository
