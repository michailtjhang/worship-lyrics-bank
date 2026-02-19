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
const getDataValue = (obj) => obj?.value || obj

export async function getAllPosts({ includePages = false }) {
  let id = idToUuid(process.env.NOTION_PAGE_ID)
  id = id.trim()

  const response = await api.getPage(id)

  // Diagnostics
  console.log(`[getAllPosts] === DIAGNOSTIC START ===`)
  console.log(`[getAllPosts] target ID: ${id}`)

  const block = response.block || {}
  const rawMetadata = getDataValue(block[id])
  console.log(`[getAllPosts] target block type: ${rawMetadata?.type}`)

  // Search for schema in any collection in the response
  let schema = null
  const collections = response.collection || {}
  const collectionKeys = Object.keys(collections)

  for (const cId of collectionKeys) {
    const c = getDataValue(collections[cId])
    if (c?.schema) {
      schema = c.schema
      console.log(`[getAllPosts] found schema in collection: ${cId}`)
      break
    }
  }

  console.log(`[getAllPosts] schema found: ${!!schema}`)
  if (schema) {
    console.log(`[getAllPosts] schema fields: ${Object.values(schema).map(s => s.name).join(', ')}`)
  }

  // A database is found if we have a schema or a collection or a specific block type
  const isDatabase = schema != null || rawMetadata?.type === 'collection_view_page' || rawMetadata?.type === 'collection_view'

  if (!isDatabase) {
    console.log(`[getAllPosts] ERROR: No database found for ID ${id}`)
    return []
  }

  const collectionQuery = response.collection_query
  const pageIds = getAllPageIds(collectionQuery)
  console.log(`[getAllPosts] found ${pageIds.length} page ID(s)`)

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

  console.log(`[getAllPosts] extracted ${data.length} post(s) before filtering`)
  const posts = filterPublishedPosts({ posts: data, includePages })
  console.log(`[getAllPosts] AFTER FILTER: ${posts.length} post(s)`)
  console.log(`[getAllPosts] === DIAGNOSTIC END ===`)

  if (BLOG.sortByDate) {
    posts.sort((a, b) => b.date - a.date)
  }
  return posts
}
