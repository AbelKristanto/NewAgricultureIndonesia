import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

async function getLogoMarkDataUrl() {
  const file = await readFile(join(process.cwd(), 'public', 'logo-mark.png'));
  return `data:image/png;base64,${file.toString('base64')}`;
}

function BrandIcon({ src }: { src: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #047857 0%, #065f46 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '8%',
          display: 'flex',
          borderRadius: '32%',
          background:
            'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.18), transparent 52%)',
        }}
      />
      <img
        src={src}
        alt="Serenagri"
        style={{
          width: '86%',
          height: '86%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 22px 36px rgba(0,0,0,0.2))',
        }}
      />
    </div>
  );
}

export default async function Icon() {
  const src = await getLogoMarkDataUrl();

  return new ImageResponse(<BrandIcon src={src} />, {
    ...size,
  });
}
