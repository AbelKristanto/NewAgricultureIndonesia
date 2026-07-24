import Image from 'next/image';
import clsx from 'clsx';

interface LogoProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
  framed?: boolean;
  priority?: boolean;
  variant?: 'full' | 'mark';
}

export default function Logo({
  alt = 'Serenagri',
  className,
  imageClassName,
  framed = false,
  priority = false,
  variant = 'full',
}: LogoProps) {
  const isMark = variant === 'mark';
  const src = isMark ? '/logo-mark.png' : '/logo.png';

  return (
    <div
      className={clsx(
        'relative shrink-0 overflow-hidden',
        isMark && framed && 'rounded-[28%] bg-gradient-to-br from-[#f8fcf6] via-white to-[#e9f7ef] ring-1 ring-primary-100 shadow-[0_10px_25px_rgba(4,120,87,0.12)]',
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 180px, 280px"
        className={clsx(
          'object-contain',
          isMark && framed ? 'p-[10%] scale-[1.03]' : '',
          imageClassName
        )}
      />
    </div>
  );
}
