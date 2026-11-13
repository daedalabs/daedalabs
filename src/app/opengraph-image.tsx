import { ImageResponse } from 'next/og';

export const alt = 'Daedalabs — a repository of open-source systems and tools';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '10px',
            height: '10px',
            backgroundColor: '#e4b363',
            borderRadius: '9999px',
          }}
        />
        <span style={{ fontSize: '30px', fontWeight: 600, letterSpacing: '-0.03em' }}>
          daedalabs
        </span>
        <span style={{ fontSize: '18px', color: '#8a867c' }}>
          — an open-source workshop
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: '62px',
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            maxWidth: '960px',
          }}
        >
          open-source systems &amp; useful tools
        </div>
        <div
          style={{
            fontSize: '22px',
            color: '#b4b0a6',
            marginTop: '22px',
            maxWidth: '820px',
            lineHeight: 1.45,
          }}
        >
          Build-your-own experiments, CLI utilities, and software systems. Free and open
          source, forever.
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
        <span>daedalabs.org</span>
        <span>free for everyone / build from source</span>
      </div>
    </div>,
    { ...size }
  );
}
