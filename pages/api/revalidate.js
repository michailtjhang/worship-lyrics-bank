import { clearCache } from '@/lib/notion/getAllPosts'

export default async function handler(req, res) {
  const secret = req.query.secret || req.body?.secret
  const path = req.query.path || '/'

  // Use environment variable REVALIDATE_SECRET or default fallback secret token
  const validSecret = process.env.REVALIDATE_SECRET || 'worship-lyrics-secret'

  if (secret !== validSecret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid secret token'
    })
  }

  try {
    // 1. Clear in-memory posts cache
    clearCache()

    // 2. Trigger Next.js On-Demand Revalidation for requested path
    await res.revalidate(path)

    return res.json({
      success: true,
      revalidated: true,
      path,
      message: `Successfully revalidated path '${path}'`
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error revalidating path',
      error: err.message
    })
  }
}
