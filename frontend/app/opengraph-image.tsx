import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Intelliquery – Query your data in plain English';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Light mode design tokens
const NAV_H    = 52;
const HERO_H   = 248;
const BROWSER_H = 330;  // 630 - NAV_H - HERO_H = 330
const CHROME_H  = 36;
const SHELL_H   = BROWSER_H - CHROME_H; // 294
const SIDEBAR_W = 60;
const CHAT_HDR_H = 40;
const INPUT_H    = 52;
const MSGS_H     = SHELL_H - CHAT_HDR_H - INPUT_H; // 202

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
        {/* Blue glow at top — single radial-gradient (Satori-safe) */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: 1200, height: 360,
            background: 'radial-gradient(ellipse at 600px 0px, rgba(37,99,235,0.09) 0%, transparent 70%)',
          }}
        />

        {/* ── Nav ── h=52 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 1200,
            height: NAV_H,
            padding: '0 64px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 30, height: 30, borderRadius: 8,
                backgroundColor: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              </svg>
            </div>
            <span style={{ color: '#0f172a', fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>
              Intelliquery
            </span>
          </div>
        </div>

        {/* ── Hero ── h=248 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: 1200,
            height: HERO_H,
            paddingTop: 26,
            flexShrink: 0,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.09)',
              padding: '5px 14px',
              backgroundColor: '#f7f8fa',
              marginBottom: 16,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#2563eb' }} />
            <span style={{ color: '#8a95a8', fontSize: 12, fontWeight: 500, letterSpacing: '0.01em' }}>
              AI-powered SQL analytics
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: '#0f172a', fontSize: 56, fontWeight: 700, letterSpacing: '-2.5px', lineHeight: 1.1 }}>
              Query your data
            </span>
            <span style={{ color: '#2563eb', fontSize: 56, fontWeight: 700, letterSpacing: '-2.5px', lineHeight: 1.1 }}>
              in plain English
            </span>
          </div>

          {/* Tagline */}
          <span style={{ color: '#8a95a8', fontSize: 15, lineHeight: 1.5 }}>
            Connect any database and get instant SQL with AI-powered insights
          </span>
        </div>

        {/* ── Browser chrome — floats up from bottom ── h=330 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 1120,
            height: BROWSER_H,
            marginLeft: 40,
            borderRadius: '12px 12px 0 0',
            border: '1px solid rgba(0,0,0,0.09)',
            borderBottom: 'none',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.09)',
            flexShrink: 0,
          }}
        >
          {/* Title bar h=36 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: 1120,
              height: CHROME_H,
              padding: '0 14px',
              backgroundColor: '#f7f8fa',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
              flexShrink: 0,
            }}
          >
            {/* Traffic lights */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#e6e9ef' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#e6e9ef' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#e6e9ef' }} />
            </div>
            {/* URL bar — centered */}
            <div
              style={{
                display: 'flex', alignItems: 'center',
                position: 'absolute',
                left: '50%',
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '3px 14px', borderRadius: 6,
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: '#ffffff',
                }}
              >
                <span style={{ color: '#8a95a8', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                  app.intelliquery.com
                </span>
              </div>
            </div>
          </div>

          {/* App shell h=294 */}
          <div style={{ display: 'flex', width: 1120, height: SHELL_H }}>

            {/* Sidebar w=60 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: SIDEBAR_W,
                height: SHELL_H,
                padding: '12px 0',
                gap: 4,
                backgroundColor: '#f7f8fa',
                borderRight: '1px solid rgba(0,0,0,0.07)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                </svg>
              </div>
              {/* Active: chat */}
              <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              {/* Inactive: charts */}
              <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a95a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
            </div>

            {/* Chat area w=1060 h=294 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 1120 - SIDEBAR_W,
                height: SHELL_H,
                backgroundColor: '#ffffff',
              }}
            >
              {/* Chat header h=40 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 1120 - SIDEBAR_W,
                  height: CHAT_HDR_H,
                  padding: '0 16px',
                  backgroundColor: '#f7f8fa',
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 600 }}>Chat</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.08)', backgroundColor: '#ffffff', marginLeft: 'auto' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#15803d' }} />
                  <span style={{ color: '#8a95a8', fontSize: 11 }}>production_db</span>
                </div>
              </div>

              {/* Messages h=202 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: 1120 - SIDEBAR_W,
                  height: MSGS_H,
                  padding: '16px 20px',
                  gap: 12,
                  overflow: 'hidden',
                }}
              >
                {/* User bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      backgroundColor: '#2563eb',
                      borderRadius: '14px 14px 3px 14px',
                      padding: '9px 15px',
                      display: 'flex',
                    }}
                  >
                    <span style={{ color: '#ffffff', fontSize: 13, lineHeight: 1.5 }}>
                      Show me revenue by product category for last quarter
                    </span>
                  </div>
                </div>

                {/* AI response */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: 'rgba(37,99,235,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                    </svg>
                  </div>

                  {/* SQL block */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: 560,
                      border: '1px solid rgba(0,0,0,0.09)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        height: 28,
                        padding: '0 12px',
                        backgroundColor: '#f0f2f5',
                        borderBottom: '1px solid rgba(0,0,0,0.07)',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: '#8a95a8', fontSize: 10.5 }}>Generated SQL</span>
                      <span style={{ color: '#8a95a8', fontSize: 10.5 }}>Copy</span>
                    </div>
                    <div
                      style={{
                        display: 'flex', flexDirection: 'column',
                        padding: '10px 14px', gap: 2,
                        backgroundColor: '#f7f8fa',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        fontSize: 12, lineHeight: 1.7,
                      }}
                    >
                      <div style={{ display: 'flex' }}>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>SELECT</span>
                        <span style={{ color: '#3d4966' }}>{' category, '}</span>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>SUM</span>
                        <span style={{ color: '#3d4966' }}>{`(revenue) `}</span>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>AS</span>
                        <span style={{ color: '#3d4966' }}>{' total'}</span>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>FROM</span>
                        <span style={{ color: '#3d4966' }}>{' orders '}</span>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>WHERE</span>
                        <span style={{ color: '#3d4966' }}>{' order_date >= '}</span>
                        <span style={{ color: '#dc2626' }}>{"'2025-01-01'"}</span>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>GROUP BY</span>
                        <span style={{ color: '#3d4966' }}>{' category '}</span>
                        <span style={{ color: '#1d4ed8', fontWeight: 600 }}>ORDER BY</span>
                        <span style={{ color: '#3d4966' }}>{' total DESC'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar h=52 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: 1120 - SIDEBAR_W,
                  height: INPUT_H,
                  padding: '0 16px',
                  borderTop: '1px solid rgba(0,0,0,0.07)',
                  backgroundColor: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.09)',
                    padding: '9px 14px',
                    backgroundColor: '#f7f8fa',
                  }}
                >
                  <span style={{ color: '#8a95a8', fontSize: 13 }}>Ask anything about your data…</span>
                  <div style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
