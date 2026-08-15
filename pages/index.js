import { clientConfig } from '@/lib/server/config'

import Container from '@/components/Container'
import BlogPost from '@/components/BlogPost'
import Pagination from '@/components/Pagination'
import { getAllPosts } from '@/lib/notion'
import { useConfig } from '@/lib/config'

export async function getStaticProps () {
  let postsToShow = []
  let showNext = false
  try {
    const posts = await getAllPosts({ includePages: false })
    postsToShow = posts.slice(0, clientConfig.postsPerPage)
    const totalPosts = posts.length
    showNext = totalPosts > clientConfig.postsPerPage
  } catch (err) {
    console.error('[index] Failed to load posts:', err.message)
  }
  return {
    props: {
      page: 1,
      postsToShow,
      showNext
    },
    revalidate: 1
  }
}

export default function Blog ({ postsToShow, page, showNext }) {
  const { title, description } = useConfig()

  return (
    <Container title={title} description={description}>
      {postsToShow.map(post => (
        <BlogPost key={post.id} post={post} />
      ))}
      {showNext && <Pagination page={page} showNext={showNext} />}
    </Container>
  )
}
