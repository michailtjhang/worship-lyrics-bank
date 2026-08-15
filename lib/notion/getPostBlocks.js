import api from '@/lib/server/notion-api'

const blockCache = new Map()

export async function getPostBlocks (id) {
  try {
    const pageBlock = await api.getPage(id)
    if (pageBlock && pageBlock.block && Object.keys(pageBlock.block).length > 0) {
      blockCache.set(id, pageBlock)
      return pageBlock
    }
  } catch (err) {
    console.error(`[getPostBlocks] Error fetching blocks for ${id}:`, err.message || err)
  }

  if (blockCache.has(id)) {
    return blockCache.get(id)
  }

  return await api.getPage(id)
}
