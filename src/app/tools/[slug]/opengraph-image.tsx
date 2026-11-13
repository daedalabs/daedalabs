import { ImageResponse } from 'next/og';
import { getToolDetail } from '@/lib/tools';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function Image({ params }: PageProps) {
  const { slug } = await params;
  const detail = await getToolDetail(slug);
  const tool = detail?.tool;

  const title = tool?.name || slug;
  const tagline = tool?.tagline || 'Open source tool from daedalabs';
  const category = tool?.category || 'tool';
  const stars = tool?.stargazersCount || 0;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a09',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          color: '#f4f2ec',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px', color: '#8a867c' }}>daedalabs</span>
            <span style={{ fontSize: '26px', color: '#3d3a34' }}>/</span>
            <span
              style={{
                fontSize: '22px',
                color: '#e4b363',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontFamily: 'monospace',
              }}
            >
              {category}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              fontSize: '20px',
              color: '#8a867c',
              fontFamily: 'monospace',
            }}
          >
            {stars > 0 && <span>★ {stars}</span>}
            <span>open source</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '68px',
              fontWeight: 600,
              letterSpacing: '-0.045em',
              lineHeight: 1.05,
              color: '#f4f2ec',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#b4b0a6',
              lineHeight: 1.45,
              marginTop: '22px',
              maxWidth: '940px',
            }}
          >
            {tagline}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #f4f2ec1f',
            paddingTop: '28px',
            fontSize: '17px',
            color: '#8a867c',
            fontFamily: 'monospace',
          }}
        >
          <span>github.com/daedalabs/{slug}</span>
          <span>git clone · build from source</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
