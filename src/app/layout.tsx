import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://daedalabs.org'
  ),
  title: {
    default: 'daedalabs',
    template: '%s · daedalabs',
  },
  description:
    'A repository of open tools by juhenes: build-your-own experiments, CLI utilities, and software systems.',
  keywords: [
    'daedalabs',
    'open source',
    'developer tools',
    'cli tools',
    'software systems',
    'build your own',
    'experiments',
    'juhenes',
    'programming',
  ],
  authors: [{ name: 'juhenes', url: 'https://github.com/juhenes' }],
  creator: 'juhenes',
  publisher: 'daedalabs',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'daedalabs',
    description:
      'A repository of open tools by juhenes: build-your-own experiments, CLI utilities, and software systems.',
    siteName: 'daedalabs',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'daedalabs',
    description:
      'A repository of open tools by juhenes: build-your-own experiments, CLI utilities, and software systems.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-canvas text-ink antialiased`}
    >
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="daedalabs RSS Feed"
          href="/feed.xml"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('daedalabs-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme='dark';}}catch(e){}})();",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-canvas">
        {children}
      </body>
    </html>
  );
}
