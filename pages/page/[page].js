import { config } from '@/lib/server/config'

import Container from '@/components/Container'
import BlogPost from '@/components/BlogPost'
import Pagination from '@/components/Pagination'
import { getAllPosts } from '@/lib/notion'

const Page = ({ postsToShow, page, showNext }) => {
  return (
    <Container>
      {postsToShow &&
        postsToShow.map(post => <BlogPost key={post.id} post={post} />)}
      <Pagination page={page} showNext={showNext} />
    </Container>
  )
}

export async function getStaticProps (context) {
  const { page } = context.params
  let postsToShow = []
  let showNext = false
  try {
    const posts = await getAllPosts({ includePages: false })
    postsToShow = posts.slice(
      config.postsPerPage * (page - 1),
      config.postsPerPage * page
    )
    const totalPosts = posts.length
    showNext = page * config.postsPerPage < totalPosts
  } catch (err) {
    console.error('[page] Failed to load posts:', err.message)
  }
  return {
    props: {
      page,
      postsToShow,
      showNext
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

export default Page
