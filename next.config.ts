import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Author portraits via unavatar
      { protocol: "https", hostname: "unavatar.io" },
      // YouTube channel/video thumbnails
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      // Common blog/OG image hosts we'll pull thumbnails from
      { protocol: "https", hostname: "miro.medium.com" },
      { protocol: "https", hostname: "cdn-images-1.medium.com" },
      { protocol: "https", hostname: "blog.samaltman.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "*.aboutamazon.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.cloudfront.net" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "substackcdn.com" },
      { protocol: "https", hostname: "substack-post-media.s3.amazonaws.com" },
   ],
  },
  async redirects() {
    return [
      {
        source: "/newsletter",
        destination: "https://startupwisdom.beehiiv.com/",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
