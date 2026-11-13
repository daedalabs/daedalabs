import type { SVGProps } from 'react';

export interface DaedalabsMarkProps extends SVGProps<SVGSVGElement> {
  /**
   * When true, renders with two distinct tones.
   * When false (default), renders a solid single-color silhouette using currentColor.
   */
  twoTone?: boolean;
  /** Fill for the structural base / L-stem when twoTone is active. Defaults to #171717. */
  baseColor?: string;
  /** Fill for the forward chevron / D-bow when twoTone is active. Defaults to #F97316. */
  chevronColor?: string;
}

export function DaedalabsMark({
  className = 'h-10 w-10',
  twoTone = false,
  baseColor = '#171717',
  chevronColor = '#F97316',
  ...props
}: DaedalabsMarkProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
      className={className}
      {...props}
    >
      {twoTone ? (
        <>
          {/* Base / L-stem (Graphite / Basalt) */}
          <path
            d="M6 38 L18 6 L18 30 L27 30 L30 38 Z"
            fill={baseColor}
          />
          {/* Chevron / D-bow (Safety Orange) */}
          <path
            d="M18 6 L30 6 L40 22 L30 38 L27 30 L32 22 L27 14 L18 14 Z"
            fill={chevronColor}
          />
        </>
      ) : (
        /* Original solid silhouette using currentColor */
        <path
          d="M6 38 L18 6 L30 6 L40 22 L30 38 Z M18 30 L27 30 L32 22 L27 14 L18 14 Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}
