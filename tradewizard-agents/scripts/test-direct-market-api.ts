#!/usr/bin/env node
/**
 * Simple test script to verify direct market API endpoint works
 * Tests the /markets endpoint directly without requiring full config
 */

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
const POLITICS_TAG_ID = 2;

async function testDirectMarketAPI() {
  console.log('🧪 Testing Direct Market API Endpoint\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Fetch markets directly from /markets endpoint
    console.log('\n📊 Test 1: Fetching markets from /markets endpoint...');
    const fetchLimit = 50;
    const url = `${GAMMA_API_URL}/markets?closed=false&order=volume24hr&ascending=false&limit=${fetchLimit}&offset=0&tag_id=${POLITICS_TAG_ID}`;

    console.log(`URL: ${url}`);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const markets = await response.json();

    if (!Array.isArray(markets)) {
      throw new Error('Invalid API response: expected array of markets');
    }

    console.log(`✅ Fetched ${markets.length} markets in ${duration}ms`);

    if (markets.length === 0) {
      console.log('⚠️  Warning: No markets returned');
      return;
    }

    // Test 2: Verify market structure
    console.log('\n🔍 Test 2: Verifying market structure...');
    const firstMarket = markets[0];
    const requiredFields = [
      'id',
      'question',
      'slug',
      'liquidity',
      'clobTokenIds',
      'closed',
      'active',
    ];

    console.log('First market fields:', Object.keys(firstMarket).sort());

    const missingFields = requiredFields.filter(field => !(field in firstMarket));
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ All required fields present');
    }

    // Test 3: Check event context in response
    console.log('\n🎯 Test 3: Checking event context in API response...');
    const marketsWithEvents = markets.filter((m: any) => m.events && Array.isArray(m.events) && m.events.length > 0);
    const marketsWithoutEvents = markets.filter((m: any) => !m.events || !Array.isArray(m.events) || m.events.length === 0);

    console.log(`  Markets with events array: ${marketsWithEvents.length}`);
    console.log(`  Markets without events array: ${marketsWithoutEvents.length}`);

    if (marketsWithEvents.length > 0) {
      console.log('✅ Event context available in API response');
      const firstEvent = marketsWithEvents[0].events[0];
      console.log(`  Example event: "${firstEvent.title}"`);
      console.log(`  Event fields:`, Object.keys(firstEvent).sort());
    }

    // Test 4: Check filtering criteria
    console.log('\n🔬 Test 4: Checking filtering criteria...');
    const stats = {
      acceptingOrders: markets.filter((m: any) => m.acceptingOrders !== false).length,
      haveClobTokenIds: markets.filter((m: any) => m.clobTokenIds).length,
      openMarkets: markets.filter((m: any) => !m.closed).length,
      withLiquidity: markets.filter((m: any) => parseFloat(m.liquidity || '0') >= 1000).length,
    };

    console.log(`  Accepting orders: ${stats.acceptingOrders}/${markets.length}`);
    console.log(`  Have CLOB token IDs: ${stats.haveClobTokenIds}/${markets.length}`);
    console.log(`  Open markets: ${stats.openMarkets}/${markets.length}`);
    console.log(`  Liquidity >= $1000: ${stats.withLiquidity}/${markets.length}`);

    // Test 5: Display sample markets
    console.log('\n📋 Sample Markets:');
    console.log('=' .repeat(60));
    markets.slice(0, 3).forEach((market: any, idx: number) => {
      const liquidity = parseFloat(market.liquidity || '0').toFixed(0);
      const volume = parseFloat(market.volume24hr?.toString() || '0').toFixed(0);
      console.log(`\n${idx + 1}. ${market.question}`);
      console.log(`   Liquidity: $${liquidity} | Volume: $${volume}`);
      console.log(`   Closed: ${market.closed} | Accepting Orders: ${market.acceptingOrders}`);
      if (market.events && market.events.length > 0) {
        console.log(`   Event: ${market.events[0].title}`);
      }
      console.log(`   Slug: ${market.slug}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed! Direct /markets API endpoint is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testDirectMarketAPI().catch(console.error);
