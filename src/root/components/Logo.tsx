export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="LC Dashboard logo"
    >
      <title>LC Dashboard logo</title>
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#logo-grad)" />
      <text
        x="50"
        y="62"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="40"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-1"
      >
        LC
      </text>
    </svg>
  );
}
