import { getAllPosts, getAllTagsFromPosts } from '@/lib/notion'
import SearchLayout from '@/layouts/search'

export default function Tag ({ tags, posts, currentTag }) {
  return <SearchLayout tags={tags} posts={posts} currentTag={currentTag} />
}

export async function getStaticProps ({ params }) {
  const currentTag = params.tag
  let tags = {}
  let filteredPosts = []
  try {
    const posts = await getAllPosts({ includePages: false })
    tags = getAllTagsFromPosts(posts)
    filteredPosts = posts.filter(
      post => post && post.tags && post.tags.includes(currentTag)
    )
  } catch (err) {
    console.error('[tag] Failed to load posts:', err.message)
  }
  return {
    props: {
      tags,
      posts: filteredPosts,
      currentTag
    },
    revalidate: 1
  }
}

export async function getStaticPaths () {
  return {
    paths: [],
    fallback: 'blocking'
  }
}
