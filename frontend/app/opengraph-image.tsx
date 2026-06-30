import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Intelliquery – Query your data in plain English';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Blue glow — matches landing page */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: 1200, height: 420,
            background: 'radial-gradient(ellipse at 600px -60px, rgba(37,99,235,0.10) 0%, transparent 65%)',
          }}
        />

        {/* Nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 1200,
            height: 64,
            padding: '0 72px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 9,
                backgroundColor: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              </svg>
            </div>
            <span style={{ color: '#0f172a', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
              Intelliquery
            </span>
          </div>
        </div>

        {/* Centered hero — 566px tall (630 - 64 nav) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: 1200,
            height: 566,
            paddingTop: 128,
          }}
        >
          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <span
              style={{
                color: '#0f172a',
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: '-3px',
                lineHeight: 1.08,
              }}
            >
              Query your data
            </span>
            <span
              style={{
                color: '#2563eb',
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: '-3px',
                lineHeight: 1.08,
              }}
            >
              in plain English
            </span>
          </div>

          {/* Tagline */}
          <span
            style={{
              color: '#8a95a8',
              fontSize: 19,
              lineHeight: 1.5,
              marginBottom: 44,
            }}
          >
            Connect any database and get instant SQL with AI-powered insights
          </span>

          {/* DB pills */}
          <div style={{ display: 'flex', gap: 10 }}>
            {['PostgreSQL', 'MySQL', 'BigQuery', 'SQLite', 'Snowflake'].map((db) => (
              <div
                key={db}
                style={{
                  display: 'flex',
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  color: '#8a95a8',
                  fontSize: 13,
                  backgroundColor: '#f7f8fa',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}
              >
                {db}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
