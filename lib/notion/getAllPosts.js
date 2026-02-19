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
export async function getAllPosts({ includePages = false }) {
  let id = idToUuid(process.env.NOTION_PAGE_ID)

  // Clean ID just in case
  id = id.trim()

  const response = await api.getPage(id)

  // Deep Diagnostic Logging
  console.log(`[getAllPosts] === DIAGNOSTIC START ===`)
  console.log(`[getAllPosts] target ID: ${id}`)
  console.log(`[getAllPosts] response keys: ${Object.keys(response || {}).join(', ')}`)

  const blockKeys = Object.keys(response.block || {})
  console.log(`[getAllPosts] block count: ${blockKeys.length}`)
  console.log(`[getAllPosts] block keys (first 5): ${blockKeys.slice(0, 5).join(', ')}`)
  console.log(`[getAllPosts] target block exists: ${!!response.block[id]}`)

  const collectionKeys = Object.keys(response.collection || {})
  console.log(`[getAllPosts] collection count: ${collectionKeys.length}`)
  console.log(`[getAllPosts] collection keys: ${collectionKeys.join(', ')}`)

  // Try multiple ways to find the collection/schema
  let collection = response.collection?.[Object.keys(response.collection || {})[0]]?.value
  if (!collection && collectionKeys.length > 0) {
    // Try without .value if it's missing (unlikely but worth checking)
    collection = response.collection[collectionKeys[0]]
  }

  let schema = collection?.schema
  if (!schema && collectionKeys.length > 0) {
    // Try to find ANY collection with a schema
    for (const cId of collectionKeys) {
      const s = response.collection[cId]?.value?.schema || response.collection[cId]?.schema
      if (s) {
        schema = s
        console.log(`[getAllPosts] found schema in collection: ${cId}`)
        break
      }
    }
  }

  const rawMetadata = response.block[id]?.value
  console.log(`[getAllPosts] rawMetadata.type: ${rawMetadata?.type}`)
  console.log(`[getAllPosts] schema keys: ${schema ? Object.values(schema).map(s => s.name).join(', ') : 'N/A'}`)

  const isDatabase =
    schema != null ||
    collection != null ||
    rawMetadata?.type === 'collection_view_page' ||
    rawMetadata?.type === 'collection_view'

  if (!isDatabase) {
    console.log(`[getAllPosts] ERROR: No database/collection found for ID ${id}`)
    return []
  }

  const collectionQuery = response.collection_query
  const block = response.block

  const pageIds = getAllPageIds(collectionQuery)
  console.log(`[getAllPosts] found ${pageIds.length} page ID(s) from collectionQuery`)

  if (pageIds.length > 0) {
    const firstId = pageIds[0]
    console.log(`[getAllPosts] sample page ID: ${firstId}`)
    console.log(`[getAllPosts] sample page block exists: ${!!block[firstId]}`)
    if (block[firstId]) {
      console.log(`[getAllPosts] sample page block type: ${block[firstId]?.value?.type}`)
      console.log(`[getAllPosts] sample page properties keys: ${Object.keys(block[firstId]?.value?.properties || {}).join(', ')}`)
    }
  }

  const data = []
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    // If block is missing for this ID, we can't get properties from getPage response
    // Sometimes notion-client requires a separate call or has them elsewhere
    const properties = (await getPageProperties(id, block, schema)) || null

    if (!properties || Object.keys(properties).length <= 1) {
      // if only 'id' is present, it's effectively empty
      continue
    }

    // Add fullwidth to properties
    properties.fullWidth = block[id]?.value?.format?.page_full_width ?? false
    // Convert date (with timezone) to unix milliseconds timestamp
    properties.date = (
      properties.date?.start_date
        ? dayjs.tz(properties.date?.start_date)
        : dayjs(block[id]?.value?.created_time)
    ).valueOf()

    data.push(properties)
  }

  console.log(`[getAllPosts] extracted data for ${data.length} post(s) before filtering`)
  if (data.length > 0) {
    console.log(`[getAllPosts] sample final post: ${JSON.stringify(data[0]).slice(0, 200)}...`)
  }

  const posts = filterPublishedPosts({ posts: data, includePages })
  console.log(`[getAllPosts] AFTER FILTER: ${posts.length} post(s)`)
  console.log(`[getAllPosts] === DIAGNOSTIC END ===`)

  if (BLOG.sortByDate) {
    posts.sort((a, b) => b.date - a.date)
  }
  return posts
}
