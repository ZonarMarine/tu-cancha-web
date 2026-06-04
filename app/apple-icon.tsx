/**
 * app/apple-icon.tsx — iOS home-screen icon (180×180)
 * Larger canvas gives room to add the wordmark below the bolt.
 */
import { ImageResponse } from 'next/og';

export const size        = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 38,
          background: '#0A0A0A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {/* Lightning bolt */}
        <svg
          width="72"
          height="84"
          viewBox="0 0 18 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.5 1L1 12.5h7.5L7 20 17 8.5H9.5L10.5 1Z"
            fill="#D7FF00"
          />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-2px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1,
          }}
        >
          Tu<span style={{ color: '#D7FF00' }}>Cancha</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
