/**
 * app/icon.tsx — TuCancha browser favicon (32×32 PNG)
 * Next.js App Router auto-serves this as /icon.png and injects
 * the <link rel="icon"> tag in every page.
 */
import { ImageResponse } from 'next/og';

export const size        = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Zap / lightning bolt — matches the in-app logo mark */}
        <svg
          width="18"
          height="21"
          viewBox="0 0 18 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.5 1L1 12.5h7.5L7 20 17 8.5H9.5L10.5 1Z"
            fill="#D7FF00"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
