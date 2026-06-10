import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://smart-seller-tools.vercel.app',
      lastModified: new Date(),
    },
    {
      url: 'https://smart-seller-tools.vercel.app/tools',
      lastModified: new Date(),
    },
  ]
}