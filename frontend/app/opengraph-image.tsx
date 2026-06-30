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
        {/* Blue glow */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: 1200, height: 480,
            background: 'radial-gradient(ellipse at 600px -80px, rgba(37,99,235,0.11) 0%, transparent 65%)',
          }}
        />

        {/* Nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 1200,
            height: 68,
            padding: '0 80px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 9,
                backgroundColor: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              </svg>
            </div>
            <span style={{ color: '#0f172a', fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Intelliquery
            </span>
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: 1200,
            height: 562,
            paddingTop: 96,
          }}
        >
          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ color: '#0f172a', fontSize: 88, fontWeight: 700, letterSpacing: '-4px', lineHeight: 1.07 }}>
              Query your data
            </span>
            <span style={{ color: '#2563eb', fontSize: 88, fontWeight: 700, letterSpacing: '-4px', lineHeight: 1.07 }}>
              in plain English
            </span>
          </div>

          {/* Tagline */}
          <span style={{ color: '#8a95a8', fontSize: 22, lineHeight: 1.5, marginBottom: 52 }}>
            Connect any database and get instant SQL with AI-powered insights
          </span>

          {/* DB strip — single clean line, no pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ color: '#c4cad8', fontSize: 13, letterSpacing: '0.08em', fontWeight: 600 }}>
              WORKS WITH
            </span>
            <div style={{ width: 1, height: 16, backgroundColor: '#e6e9ef' }} />
            {['PostgreSQL', 'MySQL', 'BigQuery', 'SQLite', 'Snowflake', 'SQL Server'].map((db, i, arr) => (
              <div key={db} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ color: '#8a95a8', fontSize: 15, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  {db}
                </span>
                {i < arr.length - 1 && (
                  <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#d8dce6' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
