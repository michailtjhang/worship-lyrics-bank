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
  const id = idToUuid(process.env.NOTION_PAGE_ID)

  const response = await api.getPage(id)

  const collection = Object.values(response.collection ?? {})[0]?.value
  const collectionQuery = response.collection_query
  const block = response.block
  const schema = collection?.schema

  const rawMetadata = block[id]?.value

  // Debug logging to help diagnose API response differences across Node versions
  console.log(`[getAllPosts] pageId: ${id}`)
  console.log(`[getAllPosts] rawMetadata.type: ${rawMetadata?.type}`)
  console.log(`[getAllPosts] collection found: ${!!collection}`)

  // Use collection presence as the primary check (more robust than rawMetadata.type)
  // rawMetadata.type can vary between Node.js versions / Notion API response shapes
  const isDatabase =
    collection != null ||
    rawMetadata?.type === 'collection_view_page' ||
    rawMetadata?.type === 'collection_view'

  if (!isDatabase) {
    console.log(`[getAllPosts] pageId "${id}" is not a database — skipping`)
    return []
  }

  // Log schema keys so we know the actual field names in this Notion database
  console.log(`[getAllPosts] schema keys: ${schema ? Object.values(schema).map(s => s.name).join(', ') : 'N/A'}`)

  // Construct Data
  const pageIds = getAllPageIds(collectionQuery)
  console.log(`[getAllPosts] found ${pageIds.length} page(s)`)
  const data = []
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const properties = (await getPageProperties(id, block, schema)) || null

    if (!properties) continue

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

  // Debug: log first post to see what fields were extracted
  if (data.length > 0) {
    console.log(`[getAllPosts] sample post[0] keys: ${Object.keys(data[0]).join(', ')}`)
    console.log(`[getAllPosts] sample post[0] type: ${JSON.stringify(data[0].type)}`)
    console.log(`[getAllPosts] sample post[0] status: ${JSON.stringify(data[0].status)}`)
    console.log(`[getAllPosts] sample post[0] title: ${data[0].title}`)
    console.log(`[getAllPosts] sample post[0] slug: ${data[0].slug}`)
  }

  // remove all the the items doesn't meet requirements
  const posts = filterPublishedPosts({ posts: data, includePages })
  console.log(`[getAllPosts] after filter: ${posts.length} post(s) (includePages=${includePages})`)

  // Sort by date
  if (BLOG.sortByDate) {
    posts.sort((a, b) => b.date - a.date)
  }
  return posts
}
