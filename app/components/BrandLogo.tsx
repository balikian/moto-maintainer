import Image from 'next/image';

type BrandLogoProps = {
  /** Sets the height (e.g. "h-12"); the width follows the logo's shape. */
  className?: string;
  /** For pages that always use light "paper" colors (print and share views). */
  lightOnly?: boolean;
};

/** The SwingArm logo and tagline, in the version that fits the current theme. */
export default function BrandLogo({ className = 'h-12', lightOnly = false }: BrandLogoProps) {
  const size = `${className} w-auto`;
  const light = (
    <Image
      src="/brand/swingarm-logo-light-bg.svg"
      alt="SwingArm"
      width={259}
      height={64}
      loading="eager"
      className={lightOnly ? size : `${size} dark:hidden`}
    />
  );
  if (lightOnly) return light;

  return (
    <>
      {light}
      <Image
        src="/brand/swingarm-logo-dark-bg.svg"
        alt="SwingArm"
        width={259}
        height={64}
        loading="eager"
        className={`${size} hidden dark:block`}
      />
    </>
  );
}
