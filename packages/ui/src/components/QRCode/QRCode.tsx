import React, { forwardRef, useMemo } from 'react';

export type QRCodeErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export type QRCodeProps = {
  /** The string value to encode into the QR code pattern. */
  value: string;
  /** Width and height in pixels. Default 200. */
  size?: number;
  /** Foreground color for dark modules. Default 'currentColor'. */
  color?: string;
  /** Background color behind the pattern. Default 'transparent'. */
  backgroundColor?: string;
  /**
   * Error correction level hint. Influences the grid density.
   * Default 'M'.
   */
  errorCorrection?: QRCodeErrorCorrection;
  /** Additional CSS class names applied to the root SVG element. */
  className?: string;
};

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Simple 32-bit FNV-1a hash. Deterministic, fast, and zero-dependency.
 * Returns an unsigned 32-bit integer.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Produce a sequence of pseudo-random 32-bit values seeded from the input
 * string. Uses xorshift32 iterated from multiple FNV-1a seeds so the full
 * value string contributes entropy.
 */
function seededRandom(seed: number): () => number {
  let state = seed | 1; // must be non-zero
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

// ─── Grid generation ─────────────────────────────────────────────────────────

/** Error-correction level influences how many modules we fill. */
const EC_DENSITY: Record<QRCodeErrorCorrection, number> = {
  L: 0.38,
  M: 0.42,
  Q: 0.48,
  H: 0.54,
};

/**
 * Grid size is derived from the value length + error correction, loosely
 * modelling how real QR versions grow. Clamped to a sensible range.
 */
function computeGridSize(valueLength: number, ec: QRCodeErrorCorrection): number {
  const ecOffset = { L: 0, M: 2, Q: 4, H: 6 }[ec];
  const base = 21; // QR version 1 is 21x21
  const extra = Math.min(Math.floor(valueLength / 12) * 4, 60);
  return base + extra + ecOffset;
}

/** Draw a 7x7 finder pattern (outer border + inner 3x3 block) at (ox, oy). */
function stampFinderPattern(grid: boolean[][], ox: number, oy: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[oy + r][ox + c] = isOuter || isInner;
    }
  }
}

/** Mark the separator (one-module white border) around a finder pattern. */
function stampSeparator(reserved: boolean[][], grid: boolean[][], ox: number, oy: number, n: number): void {
  for (let i = -1; i <= 7; i++) {
    for (let j = -1; j <= 7; j++) {
      const r = oy + j;
      const c = ox + i;
      if (r >= 0 && r < n && c >= 0 && c < n) {
        reserved[r][c] = true;
        // Only clear the border ring (not the pattern itself)
        if (i === -1 || i === 7 || j === -1 || j === 7) {
          grid[r][c] = false;
        }
      }
    }
  }
}

/** Stamp a single 5x5 alignment pattern centred at (cx, cy). */
function stampAlignmentPattern(grid: boolean[][], reserved: boolean[][], cx: number, cy: number, n: number): void {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = cy + dr;
      const c = cx + dc;
      if (r >= 0 && r < n && c >= 0 && c < n && !reserved[r][c]) {
        const isOuter = Math.abs(dr) === 2 || Math.abs(dc) === 2;
        const isCenter = dr === 0 && dc === 0;
        grid[r][c] = isOuter || isCenter;
        reserved[r][c] = true;
      }
    }
  }
}

/** Add timing patterns (alternating dark/light on row 6 and column 6). */
function stampTimingPatterns(grid: boolean[][], reserved: boolean[][], n: number): void {
  for (let i = 8; i < n - 8; i++) {
    if (!reserved[6][i]) {
      grid[6][i] = i % 2 === 0;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      grid[i][6] = i % 2 === 0;
      reserved[i][6] = true;
    }
  }
}

/**
 * Build the complete boolean grid for a given value + error correction.
 *
 * NOTE: This is a decorative QR-code-like pattern. It includes authentic
 * structural elements (finder patterns, timing patterns, alignment patterns)
 * and fills the data area with a deterministic pseudo-random pattern derived
 * from the input value. The result is NOT scannable by a QR reader. For
 * production QR scanning, use an external encoding library.
 */
function buildGrid(value: string, ec: QRCodeErrorCorrection): boolean[][] {
  const n = computeGridSize(value.length, ec);
  const grid: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  const reserved: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));

  // ── Finder patterns (three corners) ──────────────────────────────────────
  stampFinderPattern(grid, 0, 0);
  stampFinderPattern(grid, n - 7, 0);
  stampFinderPattern(grid, 0, n - 7);

  stampSeparator(reserved, grid, 0, 0, n);
  stampSeparator(reserved, grid, n - 7, 0, n);
  stampSeparator(reserved, grid, 0, n - 7, n);

  // ── Timing patterns ──────────────────────────────────────────────────────
  stampTimingPatterns(grid, reserved, n);

  // ── Alignment patterns (for larger grids) ────────────────────────────────
  if (n >= 25) {
    const pos = n - 7; // simplified; real QR uses a lookup table
    stampAlignmentPattern(grid, reserved, pos, pos, n);
    if (n >= 29) {
      const mid = Math.floor(n / 2);
      stampAlignmentPattern(grid, reserved, mid, pos, n);
      stampAlignmentPattern(grid, reserved, pos, mid, n);
    }
  }

  // ── Data area: fill with deterministic pseudo-random bits ────────────────
  const seed = fnv1a(value + ':' + ec);
  const rand = seededRandom(seed);
  const density = EC_DENSITY[ec];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (reserved[r][c]) {
        continue;
      }
      // Leave a quiet zone inside the finder-pattern rows/cols already set
      if (
        (r < 9 && c < 9) ||
        (r < 9 && c >= n - 8) ||
        (r >= n - 8 && c < 9)
      ) {
        continue;
      }
      const v = rand();
      grid[r][c] = (v / 0xffffffff) < density;
    }
  }

  return grid;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Renders a decorative QR-code-like SVG from an arbitrary string value.
 *
 * The output includes authentic QR structural elements (finder patterns,
 * timing patterns, alignment patterns) with a deterministic pseudo-random
 * data fill. The pattern changes when `value` or `errorCorrection` changes.
 *
 * **Important**: The generated pattern is NOT scannable by a QR reader.
 * For production QR scanning, use an external QR encoding library.
 *
 * @example
 * ```tsx
 * <QRCode value="https://example.com" size={256} />
 * ```
 */
export const QRCode = forwardRef<SVGSVGElement, QRCodeProps>(function QRCode(
  {
    value,
    size = 200,
    color = 'currentColor',
    backgroundColor = 'transparent',
    errorCorrection = 'M',
    className,
  },
  ref,
) {
  const grid = useMemo(() => buildGrid(value, errorCorrection), [value, errorCorrection]);

  const n = grid.length;
  // Each module is 1 unit; viewBox = n x n; size scales it.
  const moduleRects: React.ReactElement[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c]) {
        moduleRects.push(
          <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} />,
        );
      }
    }
  }

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code for: ${value}`}
      className={className}
    >
      {backgroundColor !== 'transparent' && (
        <rect x={0} y={0} width={n} height={n} fill={backgroundColor} />
      )}
      <g fill={color} shapeRendering="crispEdges">
        {moduleRects}
      </g>
    </svg>
  );
});

QRCode.displayName = 'QRCode';
