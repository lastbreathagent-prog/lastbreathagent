// Lastbreath mark (logo C): a white breath orb on blue; the pulse turns blue inside it and leaves as a flatline.
export default function Logo({ size = 40, id = 'lb', className = '', title = 'Lastbreath' }) {
  const path = 'M40 210 H118 l10 -12 l10 12 h8 l14 -80 l18 140 l14 -60 h12 l14 -18 l14 18 H360';
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 400 400" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#0a2a9e" />
        </linearGradient>
        <clipPath id={`${id}-circle`}>
          <circle cx="200" cy="200" r="200" />
        </clipPath>
        <clipPath id={`${id}-orb`}>
          <circle cx="200" cy="200" r="104" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-circle)`}>
        <rect width="400" height="400" fill={`url(#${id}-bg)`} />
        <circle cx="200" cy="200" r="104" fill="#fff" />
        <path d={path} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} clipPath={`url(#${id}-orb)`} fill="none" stroke="#1f5bff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
