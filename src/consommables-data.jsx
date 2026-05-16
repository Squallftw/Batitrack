// Consommables — seed data
// Each window.X is either the user's persisted data or, in demo mode, the seed.
// For first-time authenticated users every list starts empty.
const __cnPick = (key, empty, demo) =>
  (typeof __batiPick === 'function') ? __batiPick(key, empty, demo) : demo;

window.CONSOMM_CATEGORIES = {
  granulats:     { label: 'Granulats',     color: '#7C5E2A', soft: '#EBE3CC' },
  acier:         { label: 'Acier',         color: '#5B6E7F', soft: '#E0E5EA' },
  maconnerie:    { label: 'Maçonnerie',    color: '#C25B3F', soft: '#F2DCD3' },
  bois:          { label: 'Bois',          color: '#8A5114', soft: '#EDE0CB' },
  electricite:   { label: 'Électricité',   color: '#C58122', soft: '#FBEBD3' },
  plomberie:     { label: 'Plomberie',     color: '#0E5460', soft: '#D8E5E7' },
  finition:      { label: 'Finition',      color: '#7B6685', soft: '#E5DCEA' },
  quincaillerie: { label: 'Quincaillerie', color: '#5C5C5C', soft: '#E2E2E2' },
  peinture:      { label: 'Peinture',      color: '#2E9152', soft: '#DCEEE0' },
  securite:      { label: 'Sécurité',      color: '#E0832E', soft: '#FBE3DC' },
  carburant:     { label: 'Carburant',     color: '#1F2421', soft: '#D8D6D4' },
  autre:         { label: 'Autre',         color: '#A8A09B', soft: '#EFECE8' }
};

window.CONSOMM_UNITS = ['kg', 'tonne', 'm³', 'm²', 'm', 'litre', 'pièce', 'sac', 'rouleau', 'lot'];

const __SUPPLIERS_DEMO = [
  { id: 's-1', name: 'Lafarge Holcim',       type: 'Cimentier',     phone: '+212 522 95 80 00', city: 'Casablanca' },
  { id: 's-2', name: 'Aciers du Maroc',      type: 'Sidérurgie',    phone: '+212 522 67 12 00', city: 'Casablanca' },
  { id: 's-3', name: 'Matériaux Drissi',     type: 'Distributeur',  phone: '+212 661 23 45 67', city: 'Casablanca' },
  { id: 's-4', name: 'Sotraco Casablanca',   type: 'Multi-produits',phone: '+212 522 30 12 50', city: 'Casablanca' },
  { id: 's-5', name: 'Briqueterie Khouribga',type: 'Briques',       phone: '+212 523 56 78 90', city: 'Khouribga' },
  { id: 's-6', name: 'Bois & Mat. Settat',   type: 'Bois',          phone: '+212 523 40 21 33', city: 'Settat' },
  { id: 's-7', name: 'Sonasid',              type: 'Sidérurgie',    phone: '+212 522 67 88 00', city: 'Casablanca' }
];
window.SUPPLIERS = __cnPick('suppliers', [], __SUPPLIERS_DEMO);

const __CONSOMM_ITEMS_DEMO = [
  { id:'c-1',  name:'Ciment CPJ 45',                cat:'maconnerie',    unit:'sac',     price: 75,   supplier:'s-1', threshold:50,  hasExpiry:true,  notes:'Sac de 50 kg' },
  { id:'c-2',  name:'Sable de carrière',            cat:'granulats',     unit:'m³',      price: 120,  supplier:'s-3', threshold:10 },
  { id:'c-3',  name:'Gravier 5/15',                 cat:'granulats',     unit:'m³',      price: 180,  supplier:'s-3', threshold:10 },
  { id:'c-4',  name:'Gravier 15/25',                cat:'granulats',     unit:'m³',      price: 180,  supplier:'s-3', threshold:10 },
  { id:'c-5',  name:'Acier HA Ø8',                  cat:'acier',         unit:'tonne',   price: 8500, supplier:'s-2', threshold:1 },
  { id:'c-6',  name:'Acier HA Ø10',                 cat:'acier',         unit:'tonne',   price: 8500, supplier:'s-2', threshold:1 },
  { id:'c-7',  name:'Acier HA Ø12',                 cat:'acier',         unit:'tonne',   price: 8500, supplier:'s-7', threshold:1 },
  { id:'c-8',  name:'Briques creuses 7T',           cat:'maconnerie',    unit:'pièce',   price: 2.5,  supplier:'s-5', threshold:500 },
  { id:'c-9',  name:'Briques pleines',              cat:'maconnerie',    unit:'pièce',   price: 3.5,  supplier:'s-5', threshold:500 },
  { id:'c-10', name:'Hourdis 16×20×60',             cat:'maconnerie',    unit:'pièce',   price: 8.5,  supplier:'s-5', threshold:100 },
  { id:'c-11', name:'Plâtre prêt à l\'emploi',      cat:'finition',      unit:'sac',     price: 55,   supplier:'s-4', threshold:30 },
  { id:'c-12', name:'Carrelage grès 60×60',         cat:'finition',      unit:'m²',      price: 120,  supplier:'s-4', threshold:30 },
  { id:'c-13', name:'Peinture émulsion blanche',    cat:'peinture',      unit:'litre',   price: 45,   supplier:'s-4', threshold:50 },
  { id:'c-14', name:'Peinture façade',              cat:'peinture',      unit:'litre',   price: 60,   supplier:'s-4', threshold:30 },
  { id:'c-15', name:'Câble électrique 2.5mm²',      cat:'electricite',   unit:'rouleau', price: 480,  supplier:'s-4', threshold:5 },
  { id:'c-16', name:'Disjoncteur 16A',              cat:'electricite',   unit:'pièce',   price: 35,   supplier:'s-4', threshold:20 },
  { id:'c-17', name:'Tube PVC évacuation 100mm',    cat:'plomberie',     unit:'m',       price: 25,   supplier:'s-4', threshold:50 },
  { id:'c-18', name:'Robinet d\'arrêt',             cat:'plomberie',     unit:'pièce',   price: 65,   supplier:'s-4', threshold:10 },
  { id:'c-19', name:'Madrier 8×23',                 cat:'bois',          unit:'m',       price: 55,   supplier:'s-6', threshold:50 },
  { id:'c-20', name:'Coffrage contreplaqué 18mm',   cat:'bois',          unit:'m²',      price: 95,   supplier:'s-6', threshold:30 },
  { id:'c-21', name:'Clous 100mm',                  cat:'quincaillerie', unit:'kg',      price: 18,   supplier:'s-4', threshold:20 },
  { id:'c-22', name:'Casques de chantier',          cat:'securite',      unit:'pièce',   price: 35,   supplier:'s-4', threshold:10 },
  { id:'c-23', name:'Gasoil',                       cat:'carburant',     unit:'litre',   price: 14.5, supplier:'s-4', threshold:200 }
];
window.CONSOMM_ITEMS = __cnPick('consommItems', [], __CONSOMM_ITEMS_DEMO);

// Locations: 'dépôt' is the central warehouse + each chantier id
window.CONSOMM_LOCATIONS = [
  { id: 'depot', name: 'Dépôt central', isWarehouse: true },
  ...(window.CHANTIERS || []).map(c => ({ id: c.id, name: c.name, color: c.color, isWarehouse: false }))
];

// Helper to generate purchases & consumption with deterministic dates
function dateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// Generate purchases: spread over the last 6 months ending around TODAY (15 mai 2026)
const __PURCHASES_DEMO = [
  // April 2026
  { id:'p-1',  date:'2026-04-02', supplier:'s-1', items:[ { itemId:'c-1', qty:200, unitPrice:75 } ], invoice:'F-2026-0412', location:'depot', payment:'paid' },
  { id:'p-2',  date:'2026-04-05', supplier:'s-3', items:[ { itemId:'c-2', qty:40, unitPrice:120 }, { itemId:'c-3', qty:30, unitPrice:180 } ], invoice:'BL-3287', location:'ch-1', payment:'paid' },
  { id:'p-3',  date:'2026-04-10', supplier:'s-2', items:[ { itemId:'c-5', qty:3, unitPrice:8400 }, { itemId:'c-6', qty:4, unitPrice:8400 } ], invoice:'AM-2026-0089', location:'ch-2', payment:'paid' },
  { id:'p-4',  date:'2026-04-15', supplier:'s-5', items:[ { itemId:'c-8', qty:5000, unitPrice:2.4 } ], invoice:'BK-1287', location:'ch-2', payment:'paid' },
  { id:'p-5',  date:'2026-04-20', supplier:'s-4', items:[ { itemId:'c-11', qty:80, unitPrice:54 }, { itemId:'c-12', qty:120, unitPrice:118 } ], invoice:'SOT-2026-1145', location:'ch-1', payment:'paid' },
  { id:'p-6',  date:'2026-04-22', supplier:'s-4', items:[ { itemId:'c-23', qty:300, unitPrice:14.5 } ], invoice:'SOT-2026-1167', location:'depot', payment:'paid' },
  // May 2026
  { id:'p-7',  date:'2026-05-02', supplier:'s-1', items:[ { itemId:'c-1', qty:150, unitPrice:76 } ], invoice:'F-2026-0518', location:'ch-2', payment:'paid' },
  { id:'p-8',  date:'2026-05-04', supplier:'s-7', items:[ { itemId:'c-7', qty:5, unitPrice:8600 } ], invoice:'SNS-887', location:'ch-1', payment:'pending' },
  { id:'p-9',  date:'2026-05-06', supplier:'s-3', items:[ { itemId:'c-2', qty:25, unitPrice:125 }, { itemId:'c-3', qty:15, unitPrice:185 } ], invoice:'BL-3321', location:'ch-3', payment:'paid' },
  { id:'p-10', date:'2026-05-08', supplier:'s-4', items:[ { itemId:'c-13', qty:120, unitPrice:46 }, { itemId:'c-14', qty:60, unitPrice:62 } ], invoice:'SOT-2026-1234', location:'ch-1', payment:'paid' },
  { id:'p-11', date:'2026-05-10', supplier:'s-4', items:[ { itemId:'c-15', qty:8, unitPrice:485 }, { itemId:'c-16', qty:30, unitPrice:35 } ], invoice:'SOT-2026-1240', location:'ch-2', payment:'partial' },
  { id:'p-12', date:'2026-05-12', supplier:'s-6', items:[ { itemId:'c-19', qty:120, unitPrice:55 }, { itemId:'c-20', qty:40, unitPrice:95 } ], invoice:'BM-2026-077', location:'ch-1', payment:'paid' },
  { id:'p-13', date:'2026-05-13', supplier:'s-1', items:[ { itemId:'c-1', qty:100, unitPrice:78 } ], invoice:'F-2026-0529', location:'ch-3', payment:'pending' }
];
window.PURCHASES_SEED = __cnPick('purchases', [], __PURCHASES_DEMO);

// Consumption: realistic per-chantier per-task entries
const __CONSUMPTION_DEMO = [
  // Villa Anfa — DALLAGES (t5) done in late Nov / early Dec 2025; ENDUITS (t9) in May 2026
  { id:'u-1',  date:'2026-04-15', itemId:'c-1',  qty:60,   chantierId:'ch-1', taskId:'t8',  recordedBy:'Karim El Idrissi',  notes:'Maçonneries 1er étage' },
  { id:'u-2',  date:'2026-04-18', itemId:'c-2',  qty:8,    chantierId:'ch-1', taskId:'t8',  recordedBy:'Karim El Idrissi',  notes:'' },
  { id:'u-3',  date:'2026-04-22', itemId:'c-8',  qty:1200, chantierId:'ch-1', taskId:'t8',  recordedBy:'Hassan Benali',     notes:'' },
  { id:'u-4',  date:'2026-05-04', itemId:'c-1',  qty:80,   chantierId:'ch-1', taskId:'t9',  recordedBy:'Mohamed Lahlou',    notes:'Enduits façade Sud' },
  { id:'u-5',  date:'2026-05-04', itemId:'c-11', qty:30,   chantierId:'ch-1', taskId:'t9',  recordedBy:'Mohamed Lahlou',    notes:'' },
  { id:'u-6',  date:'2026-05-06', itemId:'c-2',  qty:10,   chantierId:'ch-1', taskId:'t9',  recordedBy:'Mohamed Lahlou',    notes:'' },
  { id:'u-7',  date:'2026-05-08', itemId:'c-13', qty:25,   chantierId:'ch-1', taskId:'t10', recordedBy:'Hassan Benali',     notes:'Poses + retouches' },
  { id:'u-8',  date:'2026-05-11', itemId:'c-12', qty:45,   chantierId:'ch-1', taskId:'t10', recordedBy:'Hassan Benali',     notes:'Carrelage salon' },
  { id:'u-9',  date:'2026-05-12', itemId:'c-23', qty:60,   chantierId:'ch-1', taskId:'t10', recordedBy:'Hassan Benali',     notes:'Pleins groupes électrogènes' },
  // Hay Riad
  { id:'u-10', date:'2026-04-12', itemId:'c-1',  qty:120,  chantierId:'ch-2', taskId:'h8',  recordedBy:'Hicham Fassi',      notes:'' },
  { id:'u-11', date:'2026-04-14', itemId:'c-5',  qty:2,    chantierId:'ch-2', taskId:'h8',  recordedBy:'Hicham Fassi',      notes:'Ferraillage chaînage' },
  { id:'u-12', date:'2026-04-15', itemId:'c-8',  qty:4000, chantierId:'ch-2', taskId:'h8',  recordedBy:'Hicham Fassi',      notes:'' },
  { id:'u-13', date:'2026-04-20', itemId:'c-3',  qty:20,   chantierId:'ch-2', taskId:'h8',  recordedBy:'Hicham Fassi',      notes:'' },
  { id:'u-14', date:'2026-05-05', itemId:'c-1',  qty:90,   chantierId:'ch-2', taskId:'h9',  recordedBy:'Karim El Idrissi',  notes:'Enduits intérieurs' },
  { id:'u-15', date:'2026-05-09', itemId:'c-2',  qty:15,   chantierId:'ch-2', taskId:'h9',  recordedBy:'Karim El Idrissi',  notes:'' },
  { id:'u-16', date:'2026-05-11', itemId:'c-15', qty:6,    chantierId:'ch-2', taskId:'h9',  recordedBy:'Hicham Fassi',      notes:'Pré-installation gaines' },
  // Riad Marrakech
  { id:'u-17', date:'2026-04-08', itemId:'c-1',  qty:25,   chantierId:'ch-3', taskId:'m7',  recordedBy:'Said Bouazza',      notes:'Tadelakt sous-couche' },
  { id:'u-18', date:'2026-04-25', itemId:'c-11', qty:15,   chantierId:'ch-3', taskId:'m7',  recordedBy:'Said Bouazza',      notes:'' },
  { id:'u-19', date:'2026-05-03', itemId:'c-14', qty:30,   chantierId:'ch-3', taskId:'m8',  recordedBy:'Mustapha Belkadi',  notes:'Peinture chaux salon' },
  { id:'u-20', date:'2026-05-10', itemId:'c-14', qty:25,   chantierId:'ch-3', taskId:'m8',  recordedBy:'Mustapha Belkadi',  notes:'2ème couche' },
  // Adjustments — loss
  { id:'u-21', date:'2026-05-07', itemId:'c-13', qty:5,    chantierId:'ch-1', taskId:'t10', recordedBy:'Hassan Benali',     notes:'Casse — pot renversé', isLoss:true }
];
window.CONSUMPTION_SEED = __cnPick('consumption', [], __CONSUMPTION_DEMO);

// Stock transfers (between locations)
const __TRANSFERS_DEMO = [
  { id: 'tr-1', date: '2026-05-02', itemId: 'c-1', qty: 30, from: 'depot', to: 'ch-1', notes: 'Réappro chantier' },
  { id: 'tr-2', date: '2026-05-09', itemId: 'c-23', qty: 100, from: 'depot', to: 'ch-2', notes: 'Carburant générateurs' }
];
window.TRANSFERS_SEED = __cnPick('transfers', [], __TRANSFERS_DEMO);

// Audit log seed
const __CONSOMM_AUDIT_DEMO = [
  { id:'ca-1', ts: Date.now() - 1000*60*60*3,  user: 'Youssef Berrada (Patron)', action: 'created',  entity: 'purchase', label: 'Achat de 100 sacs ciment chez Lafarge Holcim — chantier Riad Marrakech' },
  { id:'ca-2', ts: Date.now() - 1000*60*60*8,  user: 'Hicham Fassi (Conducteur)', action: 'created', entity: 'consumption', label: 'Sortie de 6 rouleaux câble 2.5mm² — Hay Riad / Enduits' },
  { id:'ca-3', ts: Date.now() - 1000*60*60*20, user: 'Youssef Berrada (Patron)', action: 'edited',   entity: 'item', label: 'Tarif "Acier HA Ø12" mis à jour: 8 400 → 8 500 DH' }
];
window.CONSOMM_AUDIT_SEED = __cnPick('consommAudit', [], __CONSOMM_AUDIT_DEMO);
