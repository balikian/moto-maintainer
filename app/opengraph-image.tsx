import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { OG_IMAGE_ALT } from '@/lib/site';

// The picture a link to SwingArm shows in texts, Facebook groups and search
// results. It's made once at build time and used by every page (pages with
// their own openGraph get it through OPEN_GRAPH in lib/site.ts). Colors are
// the dark theme's (app/globals.css); fonts are Manrope's Latin subset, kept
// in assets/fonts.

export const alt = OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  // Literal paths, so the build traces just these files.
  const [logo, extraBold, semiBold] = await Promise.all([
    readFile(join(process.cwd(), 'public/brand/swingarm-logo-dark-bg.svg')),
    readFile(join(process.cwd(), 'assets/fonts/Manrope-ExtraBold-latin.woff')),
    readFile(join(process.cwd(), 'assets/fonts/Manrope-SemiBold-latin.woff')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#141619',
          borderBottom: '14px solid #d63a2c',
          fontFamily: 'Manrope',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain elements */}
        <img src={`data:image/svg+xml;base64,${logo.toString('base64')}`} width={389} height={96} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#f4ece0' }}>
            Know what your bike needs before it’s overdue.
          </div>
          <div style={{ fontSize: 31, fontWeight: 600, color: '#b5ab9c' }}>
            Motorcycle maintenance by miles and months, whichever comes first.
          </div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#ff6b57' }}>swingarm.app</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Manrope', data: extraBold, weight: 800, style: 'normal' },
        { name: 'Manrope', data: semiBold, weight: 600, style: 'normal' },
      ],
    },
  );
}
