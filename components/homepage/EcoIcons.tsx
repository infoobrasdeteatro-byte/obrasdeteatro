/**
 * Iconos inline (SVG, stroke-based) para el bloque "El pulso del ecosistema".
 * Mismo estilo que los iconos ya usados en app/page.tsx (24x24 viewBox,
 * stroke="currentColor", sin dependencia externa de Tabler).
 */
type IconProps = { className?: string }

const base = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

export function IconDashboard({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

export function IconUser({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.5 4.2-5.5 7.5-5.5s6.3 2 7.5 5.5" />
    </svg>
  )
}

export function IconTheater({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5h16l-2 6a6 6 0 0 1-12 0Z" />
      <path d="M10 17v2M14 17v2M8 21h8" />
    </svg>
  )
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M19 20a6.4 6.4 0 0 0-3.5-5.7" />
    </svg>
  )
}

export function IconBookmark({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3.5h12v17l-6-4-6 4Z" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </svg>
  )
}

export function IconMap({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function IconCalendarEvent({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
    </svg>
  )
}

export function IconSparkles({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z" />
    </svg>
  )
}

export function IconTool({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14.5 6.5a3.5 3.5 0 0 1-4.6 4.6L4.5 16.5a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3.5 3.5 0 0 1 4.6-4.6l-2.3 2.3-1.4-1.4Z" />
    </svg>
  )
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
    </svg>
  )
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconTrendingUp({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </svg>
  )
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function IconRoute({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M5 8v3a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4" />
    </svg>
  )
}

export function IconStar({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4 5.9-.7Z" />
    </svg>
  )
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  )
}

export function IconMic({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  )
}

export function IconPencil({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20Z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </svg>
  )
}

export function IconVideo({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="M15 10l6-3v10l-6-3Z" />
    </svg>
  )
}

export function IconBulb({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4.9 1 .9 1.6v.5h5.2v-.5c0-.6.3-1.2.9-1.6A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

export function IconMapPin({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

export function IconSend({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" />
      <path d="M12.5 13 21 3" />
    </svg>
  )
}
