// Inline SVG icons — minimal stroke style, 1.5 weight
const Icon = ({ d, size = 18, className = '', fill = 'none', viewBox = '0 0 24 24' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox}
       fill={fill} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
       className={className}>
    {d}
  </svg>
);

const Icons = {
  Dashboard: (p)   => <Icon {...p} d={<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>} />,
  Pointage:  (p)   => <Icon {...p} d={<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M8 14l2 2 4-4"/></>} />,
  Chantier:  (p)   => <Icon {...p} d={<><path d="M3 21h18M5 21V8l7-4 7 4v13"/><path d="M9 21v-6h6v6"/></>} />,
  Ouvrier:   (p)   => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20c0-2.5 2-4.5 4.5-4.5"/></>} />,
  Paie:      (p)   => <Icon {...p} d={<><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10v.01M18 15v.01"/></>} />,
  Param:     (p)   => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.65 1.65 0 0 0-1.8-.3 1.65 1.65 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.65 1.65 0 0 0 .3-1.8 1.65 1.65 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.65 1.65 0 0 0 1.8.3h0a1.65 1.65 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 1 1.5h0a1.65 1.65 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.65 1.65 0 0 0-.3 1.8v0a1.65 1.65 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.5 1z"/></>} />,
  Search:    (p)   => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>} />,
  Plus:      (p)   => <Icon {...p} d={<><path d="M12 5v14M5 12h14"/></>} />,
  Minus:     (p)   => <Icon {...p} d={<><path d="M5 12h14"/></>} />,
  Check:     (p)   => <Icon {...p} d={<path d="M5 12l5 5L20 7"/>} />,
  X:         (p)   => <Icon {...p} d={<path d="M6 6l12 12M18 6L6 18"/>} />,
  ChevronDown:(p)  => <Icon {...p} d={<path d="m6 9 6 6 6-6"/>} />,
  ChevronLeft:(p)  => <Icon {...p} d={<path d="m15 18-6-6 6-6"/>} />,
  ChevronRight:(p) => <Icon {...p} d={<path d="m9 18 6-6-6-6"/>} />,
  Clock:     (p)   => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  History:   (p)   => <Icon {...p} d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>} />,
  Filter:    (p)   => <Icon {...p} d={<path d="M3 5h18l-7 9v6l-4-2v-4z"/>} />,
  Download:  (p)   => <Icon {...p} d={<><path d="M12 3v14"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/></>} />,
  Print:     (p)   => <Icon {...p} d={<><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M6 14h12v7H6z"/></>} />,
  Edit:      (p)   => <Icon {...p} d={<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>} />,
  Trash:     (p)   => <Icon {...p} d={<><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14"/></>} />,
  Phone:     (p)   => <Icon {...p} d={<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.9 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/>} />,
  User:      (p)   => <Icon {...p} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>} />,
  Calendar:  (p)   => <Icon {...p} d={<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></>} />,
  TrendUp:   (p)   => <Icon {...p} d={<><path d="m3 17 6-6 4 4 8-8"/><path d="M13 7h8v8"/></>} />,
  AlertTri:  (p)   => <Icon {...p} d={<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v5M12 17.5v.01"/></>} />,
  Info:      (p)   => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></>} />,
  Coins:     (p)   => <Icon {...p} d={<><circle cx="9" cy="9" r="6"/><path d="M14 6a6 6 0 1 1-4 9.7"/></>} />,
  Building:  (p)   => <Icon {...p} d={<><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h.01M9 11h.01M9 15h.01M14 7h.01M14 11h.01M14 15h.01"/></>} />,
  Language:  (p)   => <Icon {...p} d={<><path d="M3 5h12M9 3v2M11 5c0 5-4 9-9 9M5 9c0 3 3 6 8 7"/><path d="m13 20 4-9 4 9M14 17h6"/></>} />,
  Menu:      (p)   => <Icon {...p} d={<path d="M4 6h16M4 12h16M4 18h16"/>} />,
  Logo:      (p)   => <Icon {...p} d={<><path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6"/><path d="M12 3v6M8 6h8"/></>} />,
  Pencil:    (p)   => <Icon {...p} d={<><path d="M18 2l4 4-14 14H4v-4z"/><path d="M14 6l4 4"/></>} />,
  Eye:       (p)   => <Icon {...p} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>} />,
  Copy:      (p)   => <Icon {...p} d={<><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/></>} />,
  Arrow:     (p)   => <Icon {...p} d={<path d="M5 12h14M13 5l7 7-7 7"/>} />,
  Star:      (p)   => <Icon {...p} d={<path d="m12 2 3 7 7 .6-5.3 4.6 1.6 6.8L12 17.3 5.7 21l1.6-6.8L2 9.6 9 9z"/>} />,
  Cash:      (p)   => <Icon {...p} d={<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/></>} />,
  Bank:      (p)   => <Icon {...p} d={<><path d="M3 10 12 4l9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/></>} />,
  Doc:       (p)   => <Icon {...p} d={<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></>} />
};

window.Icons = Icons;
window.Icon = Icon;
