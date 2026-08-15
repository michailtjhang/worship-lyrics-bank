import api from '@/lib/server/notion-api'

const blockCache = new Map()
const BLOCK_CACHE_TTL = process.env.NEXT_PHASE === 'phase-production-build' ? 1000 * 60 * 60 : 60 * 1000

export async function getPostBlocks (id) {
  const now = Date.now()
  const cached = blockCache.get(id)

  if (cached && now - cached.time < BLOCK_CACHE_TTL) {
    return cached.data
  }

  let retries = 2
  while (retries >= 0) {
    try {
      const pageBlock = await api.getPage(id)
      blockCache.set(id, { data: pageBlock, time: Date.now() })
      return pageBlock
    } catch (err) {
      console.error(`[getPostBlocks] Error fetching blocks for ${id} (retries left: ${retries}):`, err.message || err)
      if (retries === 0) {
        if (cached?.data) {
          return cached.data
        }
        throw err
      }
      retries--
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}
