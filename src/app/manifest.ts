import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'daedalabs',
    short_name: 'daedalabs',
    description:
      'A repository of open tools by juhenes: build-your-own experiments, CLI utilities, and software systems.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a09',
    theme_color: '#0a0a09',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/logo-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
