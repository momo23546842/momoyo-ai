// Local test harness - not used in production.
// Sends two test POSTs to the local `/api/vapi/webhook` endpoint:
//  - normal: expects an LLM-backed Momoyo reply
//  - force-llm-fallback: sends `x-force-llm-fail: 1` (honored only in dev)

import fetch from 'node-fetch'

async function run() {
  const base = process.env.WEBHOOK_BASE || 'http://localhost:3000'
  const url = new URL('/api/vapi/webhook', base)
  url.searchParams.set('userId', 'test-user-1')

  const payload = {
    message: {
      type: 'speech-update',
      artifact: {
        messagesOpenAIFormatted: [
          { role: 'system', content: 'You are an assistant.' },
          { role: 'user', content: "Could you tell me your background?" },
        ],
      },
      call: { id: 'test-call-1', type: 'webCall' },
    },
  }

  async function doPost(name: string, extraHeaders: Record<string, string> = {}) {
    console.log(`\n=== Test: ${name} ===`)
    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(payload),
      })

      console.log('HTTP status:', res.status)
      const json = await res.json().catch(() => null)
      console.log('Response JSON:', JSON.stringify(json, null, 2))

      const assistant = json?.messageResponse?.message?.content
      if (assistant) {
        console.log('\nAssistant content:\n', assistant)
      } else {
        console.log('\nNo assistant content found in response.')
      }
    } catch (e) {
      console.error('Request failed:', e)
    }
  }

  // Test A: Normal case
  await doPost('normal')

  // Test B: Force LLM fallback by sending test header that webhook recognizes
  await doPost('force-llm-fallback', { 'x-force-llm-fail': '1' })
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
