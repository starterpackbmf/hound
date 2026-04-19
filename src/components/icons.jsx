// Lucide-style minimal stroke icons, 20px default.
// Uses currentColor so they inherit text color.
import React from 'react'

export const Icon = ({ size = 20, stroke = 1.5, children, style, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}
    {...rest}
  >{children}</svg>
)

export const IHome = (p) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></Icon>
export const IBook = (p) => <Icon {...p}><path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M20 4h-4a3 3 0 0 0-3 3v13h7z"/></Icon>
export const IPlay = (p) => <Icon {...p}><polygon points="6 4 20 12 6 20 6 4"/></Icon>
export const IZap = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>
export const IEye = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/></Icon>
export const IPencil = (p) => <Icon {...p}><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></Icon>
export const ISparkles = (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></Icon>
export const IStar = (p) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>
export const ISearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>
export const ISend = (p) => <Icon {...p}><path d="m3 11 18-8-8 18-2-8z"/></Icon>
export const IArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>
export const IArrowLeft = (p) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></Icon>
export const IChevronRight = (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>
export const IChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>
export const IPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>
export const IX = (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>
export const ICheck = (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>
export const ICircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/></Icon>
export const ICheckCircle = (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>
export const IPlayCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8"/></Icon>
export const IFile = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>
export const IDownload = (p) => <Icon {...p}><path d="M12 3v12M6 11l6 6 6-6M4 21h16"/></Icon>
export const IExternalLink = (p) => <Icon {...p}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></Icon>
export const ICalendar = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>
export const ISettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/></Icon>
export const ILogOut = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Icon>
export const ITrendingUp = (p) => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>
export const ITrendingDown = (p) => <Icon {...p}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></Icon>
export const IAttach = (p) => <Icon {...p}><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.49-8.49a4 4 0 0 1 5.66 5.66l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.78-7.78"/></Icon>
export const IMessage = (p) => <Icon {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>
export const ITarget = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></Icon>
export const IClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></Icon>
export const IUsers = (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>
export const IMenu = (p) => <Icon {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Icon>
export const IGlobe = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Icon>

// Matilha custom glyphs
export const GTriangle = (p) => <Icon {...p}><polygon points="12 3 22 20 2 20 12 3"/></Icon>
export const GDiamond = (p) => <Icon {...p}><polygon points="12 2 22 12 12 22 2 12"/></Icon>
export const GYinYang = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></Icon>
