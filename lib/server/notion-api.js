import { NotionAPI } from 'notion-client'

const { NOTION_ACCESS_TOKEN } = process.env

const client = new NotionAPI({ authToken: NOTION_ACCESS_TOKEN })

const originalFetch = client.fetch.bind(client)
client.fetch = async function (opts) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    ...(opts.headers || {})
  }

  let retries = 3
  while (retries > 0) {
    try {
      return await originalFetch({ ...opts, headers })
    } catch (err) {
      retries--
      if (retries === 0) throw err
      console.warn(`[notion-api] Request failed (${err.message}). Retrying in 1s...`)
      await new Promise(res => setTimeout(res, 1000))
    }
  }
}

export default client
