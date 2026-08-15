import { config as BLOG } from '@/lib/server/config'

import { idToUuid } from 'notion-utils'
import dayjs from 'dayjs'
import api from '@/lib/server/notion-api'
import getAllPageIds from './getAllPageIds'
import getPageProperties from './getPageProperties'
import filterPublishedPosts from './filterPublishedPosts'

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */
const getDataValue = (obj) => {
  if (!obj) return null
  let res = obj
  // Aggressively unwrap 'value' layers (some API versions/responses nest them twice)
  if (res.value) res = res.value
  if (res.value) res = res.value
  return res
}

let cache = null
let cacheTime = 0
// 1 hour TTL during next build to prevent Notion 403 rate limits, 60s at runtime for ISR
const CACHE_TTL = process.env.NEXT_PHASE === 'phase-production-build' ? 1000 * 60 * 60 : 60 * 1000

export async function getAllPosts({ includePages = false }) {
  let id = idToUuid(process.env.NOTION_PAGE_ID)
  id = id.trim()

  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL) {
    const posts = filterPublishedPosts({ posts: cache, includePages })
    if (BLOG.sortByDate) {
      posts.sort((a, b) => b.date - a.date)
    }
    return posts
  }

  try {
    const response = await api.getPage(id)

    const block = response.block || {}
    const rawMetadata = getDataValue(block[id])

    // Search for schema in any collection in the response
    let schema = null
    const collections = response.collection || {}
    const collectionKeys = Object.keys(collections)

    for (const cId of collectionKeys) {
      const c = getDataValue(collections[cId])
      if (c?.schema) {
        schema = c.schema
        break
      }
    }

    // A database is found if we have a schema or a collection or a specific block type
    const isDatabase = schema != null || rawMetadata?.type === 'collection_view_page' || rawMetadata?.type === 'collection_view'

    if (!isDatabase) {
      console.log(`[getAllPosts] ERROR: No database found for ID ${id}`)
      return cache ? filterPublishedPosts({ posts: cache, includePages }) : []
    }

    const collectionQuery = response.collection_query
    const pageIds = getAllPageIds(collectionQuery)

    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const pid = pageIds[i]
      const properties = (await getPageProperties(pid, block, schema)) || null

      if (!properties || Object.keys(properties).length <= 1) continue

      const pBlock = getDataValue(block[pid])

      // Add missing properties
      properties.fullWidth = pBlock?.format?.page_full_width ?? false
      properties.date = (
        properties.date?.start_date
          ? dayjs.tz(properties.date?.start_date)
          : dayjs(pBlock?.created_time)
      ).valueOf()

      data.push(properties)
    }

    cache = data
    cacheTime = Date.now()
    const posts = filterPublishedPosts({ posts: data, includePages })

    if (BLOG.sortByDate) {
      posts.sort((a, b) => b.date - a.date)
    }
    return posts
  } catch (err) {
    console.error('[getAllPosts] Notion API error:', err.message || err)
    if (cache) {
      const posts = filterPublishedPosts({ posts: cache, includePages })
      if (BLOG.sortByDate) {
        posts.sort((a, b) => b.date - a.date)
      }
      return posts
    }
    return []
  }
}
