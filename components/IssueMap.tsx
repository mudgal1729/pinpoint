// Schematic SVG of the pin vs landmark mismatch. Not a real map tile;
// intentional. Cool-grey palette to sit inside the operator-console card.

export function IssueMap() {
  return (
    <svg
      viewBox="0 0 480 220"
      role="img"
      aria-label="Stylised map showing the typed address near Pannadhay Circle and the dropped pin in Pratapnagar Sector 6, about 2 km apart."
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
    >
      <defs>
        <pattern
          id="pinpoint-map-grid"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M56 0H0V56"
            fill="none"
            stroke="oklch(0.915 0.006 262)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="480" height="220" fill="oklch(0.962 0.005 255)" />
      <rect width="480" height="220" fill="url(#pinpoint-map-grid)" />

      {/* Roads */}
      <path
        d="M0 150 L480 120"
        stroke="oklch(0.928 0.007 255)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M150 0 L180 220"
        stroke="oklch(0.928 0.007 255)"
        strokeWidth="10"
        fill="none"
      />
      <path
        d="M340 0 L360 220"
        stroke="oklch(0.94 0.006 255)"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M0 70 L480 55"
        stroke="oklch(0.94 0.006 255)"
        strokeWidth="6"
        fill="none"
      />

      {/* Dashed connector */}
      <path
        d="M120 152 Q260 152 370 80"
        stroke="oklch(0.575 0.170 26)"
        strokeWidth="2"
        strokeDasharray="6 7"
        fill="none"
        opacity="0.8"
      />

      {/* Typed address (correct) */}
      <g transform="translate(120 152)">
        <circle r="20" fill="oklch(0.595 0.108 155 / 0.13)" />
        <circle
          r="8"
          fill="oklch(0.595 0.108 155)"
          stroke="#fff"
          strokeWidth="2.5"
        />
      </g>

      {/* Fulfilling store */}
      <g transform="translate(80 188)">
        <rect
          x="-7"
          y="-7"
          width="14"
          height="14"
          rx="3"
          fill="oklch(0.235 0.020 264)"
          stroke="#fff"
          strokeWidth="2.5"
        />
      </g>

      {/* Dropped pin (wrong) */}
      <g transform="translate(370 80)">
        <circle r="20" fill="oklch(0.575 0.170 26 / 0.13)" />
        <path
          d="M0 -14C-6 -14 -11 -9 -11 -3 -11 5 0 14 0 14s11 -9 11 -17C11 -9 6 -14 0 -14z"
          fill="oklch(0.575 0.170 26)"
          stroke="#fff"
          strokeWidth="2.2"
        />
        <circle cy="-3" r="3.5" fill="#fff" />
      </g>
    </svg>
  );
}
