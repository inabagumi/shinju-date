#!/usr/bin/env node

/**
 * Simple test script to demonstrate MSW handlers working in Node.js environment
 * Run with: node test-msw-integration.js
 */

import { startServer, stopServer } from '../packages/msw-handlers/src/server.js'

async function testSupabaseHandlers() {
  console.log('\n📦 Testing Supabase handlers...')

  try {
    // Test basic videos query
    const response = await fetch(
      'http://localhost:3000/rest/v1/videos?select=id,title&limit=5',
    )
    const data = await response.json()

    console.log('✅ Videos query successful:', data.length, 'videos found')
    console.log('📄 Sample video:', data[0])

    // Test query with filters
    const filteredResponse = await fetch(
      'http://localhost:3000/rest/v1/videos?select=*&id.in.(1,2)',
    )
    const filteredData = await filteredResponse.json()

    console.log(
      '✅ Filtered query successful:',
      filteredData.length,
      'videos found',
    )

    // Test with nested relations
    const relatedResponse = await fetch(
      'http://localhost:3000/rest/v1/videos?select=id,title,thumbnails(path,blur_data_url)',
    )
    const relatedData = await relatedResponse.json()

    console.log('✅ Related data query successful')
    console.log('📸 Sample thumbnail:', relatedData[0]?.thumbnails)
  } catch (error) {
    console.error('❌ Supabase handler test failed:', error.message)
  }
}

async function testUpstashHandlers() {
  console.log('\n🔴 Testing Upstash Redis handlers...')

  try {
    // Test PING command
    const pingResponse = await fetch('http://localhost:3000/v2/ping', {
      body: JSON.stringify([]),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const pingData = await pingResponse.json()

    console.log('✅ PING command successful:', pingData.result)

    // Test ZRANGE command
    const zrangeResponse = await fetch('http://localhost:3000/v2/zrange', {
      body: JSON.stringify([
        'videos:clicked:2023-10-23',
        '0',
        '2',
        'REV',
        'WITHSCORES',
      ]),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const zrangeData = await zrangeResponse.json()

    console.log('✅ ZRANGE command successful:', zrangeData.result)

    // Test pipeline commands
    const pipelineResponse = await fetch('http://localhost:3000/v2/pipeline', {
      body: JSON.stringify([
        ['PING'],
        ['ZRANGE', 'videos:clicked:2023-10-23', '0', '1', 'REV', 'WITHSCORES'],
      ]),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const pipelineData = await pipelineResponse.json()

    console.log(
      '✅ Pipeline commands successful:',
      pipelineData.length,
      'results',
    )
  } catch (error) {
    console.error('❌ Upstash handler test failed:', error.message)
  }
}

async function main() {
  console.log('🚀 Starting MSW Integration Test')
  console.log('================================')

  // Start MSW server
  startServer()

  // Wait a bit for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Run tests
  await testSupabaseHandlers()
  await testUpstashHandlers()

  console.log('\n✨ Test completed!')
  console.log('================================')

  // Cleanup
  stopServer()
  process.exit(0)
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error)
  stopServer()
  process.exit(1)
})

main().catch((error) => {
  console.error('❌ Test failed:', error)
  stopServer()
  process.exit(1)
})
