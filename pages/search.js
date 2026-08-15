import { getAllPosts, getAllTagsFromPosts } from '@/lib/notion'
import SearchLayout from '@/layouts/search'

export default function search ({ tags, posts }) {
  return <SearchLayout tags={tags} posts={posts} />
}
export async function getStaticProps () {
  let posts = []
  let tags = {}
  try {
    posts = await getAllPosts({ includePages: false })
    tags = getAllTagsFromPosts(posts)
  } catch (err) {
    console.error('[search] Failed to load posts:', err.message)
  }
  return {
    props: {
      tags,
      posts
    },
    revalidate: 1
  }
}
