// ═══════════════════════════════════════════════════════════════
// FUELTRACK PRO v5 — DATA LAYER
// All data verified from Excel VAT Summery sheet
// ═══════════════════════════════════════════════════════════════

const S = {
  get: k => JSON.parse(localStorage.getItem('ftp5_' + k) || '[]'),
  set: (k, v) => localStorage.setItem('ftp5_' + k, JSON.stringify(v))
};
const gR = () => S.get('r');
const gP = () => S.get('p');
const gV = () => S.get('v');
const sR = d => S.set('r', d);
const sP = d => S.set('p', d);
const sV = d => S.set('v', d);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── STATUS LOGIC ──────────────────────────────────────────────
// pending  = no invoice number at all
// partial  = has invoice but totalVatBill < reimp (balance > 0.5)
// received = has invoice AND totalVatBill >= reimp
function getStatus(rec) {
  const hasInv = (rec.invoices || []).some(i => i.num && i.num.trim());
  if (!hasInv) return 'pending';
  const bal = (rec.reimp || 0) - (rec.vatBill || 0);
  return bal > 0.5 ? 'partial' : 'received';
}

// ── SEED ──────────────────────────────────────────────────────
function seed() {
  if (gP().length > 0) return;

  const persons = [
    { id: 'p01', name: 'W.M.N Wijekoon',          code: '09200', site: 'Work Shop',          nic: '' },
    { id: 'p02', name: 'S.M Hinnawala',            code: '09200', site: 'Regional Lab',        nic: '' },
    { id: 'p03', name: 'B.A.I.S Wijesingha',       code: '09200', site: 'De Office',           nic: '' },
    { id: 'p04', name: 'A.H.M.I.S Abeysingha',     code: '09207', site: 'Galgamuwa W.S.S',    nic: '' },
    { id: 'p05', name: 'M.R.K.M Medagoda',         code: '09208', site: 'Giriulla W.S.S',      nic: '' },
    { id: 'p06', name: 'Vajira Thilakarathne',      code: '09211', site: 'Kurunegala Zone 03',  nic: '' },
    { id: 'p07', name: 'T.M.C Thennakoon',         code: '09213', site: 'Nikawaratiya W.S.S', nic: '' },
    { id: 'p08', name: 'S.M.A Samarakoon',         code: '09217', site: 'Polgahawela',         nic: '' },
    { id: 'p09', name: 'K.R Lakmal',               code: '09217', site: 'Polgahawela W.T.P',  nic: '' },
    { id: 'p10', name: 'N.A.S Kulathialaka',       code: '09224', site: 'Wariyapola W.S.S',   nic: '' },
    { id: 'p11', name: 'W.P.C.C.K Weerasooriya',  code: '09233', site: 'Narammala W.S.S',     nic: '' },
    { id: 'p12', name: 'S.M.T.M Premasiri',        code: '09239', site: 'Ibbagamuwa W.S.S',   nic: '' },
    { id: 'p13', name: 'H.M.Y.N Herath',           code: '09240', site: 'Deduru Oya W.T.P',   nic: '' },
    { id: 'p14', name: 'E.M.S.K Ekanayake',        code: '09241', site: 'Polpithigama W.S.S', nic: '' },
    { id: 'p15', name: 'A.M.N.P.K Athapaththu',   code: '09242', site: 'Maho W.S.S',          nic: '' },
  ];
  sP(persons);

  const vehicles = [
    { id: 'v01', num: '42-7079',  type: 'Motor Vehicle', ownerId: 'p01', notes: 'W.M.N Wijekoon — Galgamuwa temp use' },
    { id: 'v02', num: 'LN-8238',  type: 'Motor Vehicle', ownerId: 'p01', notes: 'W.M.N Wijekoon' },
    { id: 'v03', num: 'PF-8100',  type: 'Motor Vehicle', ownerId: 'p01', notes: 'W.M.N Wijekoon' },
    { id: 'v04', num: 'PI-3914',  type: 'Motor Vehicle', ownerId: 'p01', notes: 'W.M.N Wijekoon' },
    { id: 'v05', num: 'PF-8095',  type: 'Motor Vehicle', ownerId: 'p01', notes: 'W.M.N Wijekoon' },
    { id: 'v06', num: 'TF-3487',  type: 'Motorbike',     ownerId: 'p02', notes: 'S.M Hinnawala' },
    { id: 'v07', num: 'PF-7567',  type: 'Motor Vehicle', ownerId: 'p03', notes: 'B.A.I.S Wijesingha' },
    { id: 'v08', num: '253-5482', type: 'Motor Vehicle', ownerId: 'p04', notes: 'A.H.M.I.S Abeysingha' },
    { id: 'v09', num: '113-4204', type: 'Motorbike',     ownerId: 'p05', notes: 'M.R.K.M Medagoda' },
    { id: 'v10', num: '252-3119', type: 'Motor Vehicle', ownerId: 'p05', notes: 'M.R.K.M Medagoda' },
    { id: 'v11', num: 'PW-7975',  type: 'Motor Vehicle', ownerId: 'p06', notes: 'Vajira Thilakarathne' },
    { id: 'v12', num: 'MJ-4557',  type: 'Motorbike',     ownerId: 'p06', notes: 'Vajira Thilakarathne' },
    { id: 'v13', num: '93-3208',  type: 'Motor Vehicle', ownerId: 'p07', notes: 'T.M.C Thennakoon' },
    { id: 'v14', num: 'TR-7843',  type: 'Motor Vehicle', ownerId: 'p07', notes: 'T.M.C Thennakoon' },
    { id: 'v15', num: 'BHF-3889', type: 'Motor Vehicle', ownerId: 'p08', notes: 'S.M.A Samarakoon' },
    { id: 'v16', num: 'PK-6828',  type: 'Motor Vehicle', ownerId: 'p08', notes: 'S.M.A Samarakoon' },
    { id: 'v17', num: 'PK-6829',  type: 'Motor Vehicle', ownerId: 'p09', notes: 'K.R Lakmal' },
    { id: 'v18', num: 'BHF-3800', type: 'Motorbike',     ownerId: 'p09', notes: 'K.R Lakmal' },
    { id: 'v19', num: '250-4906', type: 'Motor Vehicle', ownerId: 'p10', notes: 'N.A.S Kulathialaka' },
    { id: 'v20', num: 'MJ-4564',  type: 'Motorbike',     ownerId: 'p10', notes: 'N.A.S Kulathialaka' },
    { id: 'v21', num: 'TF-3486',  type: 'Motorbike',     ownerId: 'p11', notes: 'W.P.C.C.K Weerasooriya' },
    { id: 'v22', num: 'MJ-4952',  type: 'Motorbike',     ownerId: 'p12', notes: 'S.M.T.M Premasiri' },
    { id: 'v23', num: 'GF-8017',  type: 'Motor Vehicle', ownerId: 'p12', notes: 'S.M.T.M Premasiri' },
    { id: 'v24', num: '50-7445',  type: 'Motor Vehicle', ownerId: 'p13', notes: 'H.M.Y.N Herath' },
    { id: 'v25', num: 'BHF-3819', type: 'Motorbike',     ownerId: 'p14', notes: 'E.M.S.K Ekanayake' },
    { id: 'v26', num: '252-6186', type: 'Motor Vehicle', ownerId: 'p14', notes: 'E.M.S.K Ekanayake' },
    { id: 'v27', num: 'LL-0985',  type: 'Motor Vehicle', ownerId: 'p15', notes: 'A.M.N.P.K Athapaththu' },
    { id: 'v28', num: 'JF-8454',  type: 'Motorbike',     ownerId: 'p15', notes: 'A.M.N.P.K Athapaththu' },
  ];
  sV(vehicles);

  // Helper: build record from invoices array
  // invoices = [{num, date, vb}] — vb = this invoice's VAT bill
  function mk(pid, name, code, site, veh, mon, yr, invoices, reimp, notes, isTempV) {
    const totalVB = invoices.reduce((s, i) => s + (parseFloat(i.vb) || 0), 0);
    const hasInv = invoices.some(i => i.num && i.num.trim());
    const status = !hasInv ? 'pending' : (reimp - totalVB > 0.5 ? 'partial' : 'received');
    const tx = totalVB > 0 ? parseFloat((totalVB / 1.18).toFixed(2)) : 0;
    const vat = totalVB > 0 ? parseFloat((totalVB - tx).toFixed(2)) : 0;
    const wo = totalVB > 0 ? parseFloat((totalVB - reimp).toFixed(2)) : 0;
    return {
      id: uid(), personId: pid, name, code, site,
      vehicle: veh || '', isTempV: !!isTempV,
      month: mon, year: yr, invoices,
      reimp, vatBill: totalVB,
      woVat: wo, taxInv: tx, vat, total: totalVB,
      balance: parseFloat((reimp - totalVB).toFixed(2)),
      status, notes: notes || ''
    };
  }

  const records = [
    // ═══ JANUARY 2026 ═══════════════════════════════════════
    mk('p01','W.M.N Wijekoon','09200','Work Shop','LN-8238','January',2026,
       [{num:'1021802601008 / 1021812601009',date:'2026-01-31',vb:320000}],
       325000,'LN-8238,PI-3914,PF-8100,PF-8095'),

    mk('p01','W.M.N Wijekoon','09200','Galgamuwa','42-7079','January',2026,
       [{num:'',date:'',vb:0}],80000,'42-7079 temp vehicle - Galgamuwa',true),

    mk('p03','B.A.I.S Wijesingha','09200','De Office','PF-7567','January',2026,
       [{num:'1022062601034',date:'2026-01-31',vb:50000}],50000,'PF-7567'),

    mk('p05','M.R.K.M Medagoda','09208','Giriulla W.S.S','252-3119','January',2026,
       [{num:'3471 / 3343',date:'2026-01-31',vb:35999.92}],55674,'252-3119, 113-4204'),

    mk('p06','Vajira Thilakarathne','09211','Kurunegala Zone 03','PW-7975','January',2026,
       [{num:'00669/740',date:'2026-01-31',vb:28798}],30798,'PW-7975, MJ-4557'),

    mk('p07','T.M.C Thennakoon','09213','Nikawaratiya W.S.S','93-3208','January',2026,
       [{num:'346',date:'2026-01-31',vb:16250}],16250,'TR-7843, 93-3208'),

    mk('p08','S.M.A Samarakoon','09217','Polgahawela','PK-6828','January',2026,
       [{num:'323',date:'2026-01-31',vb:94250.73}],94252,'PK-6828, BHF-3889'),

    mk('p08','S.M.A Samarakoon','09217','Alawwa W.S.S','','January',2026,
       [{num:'WB/INV/03',date:'2026-01-31',vb:17200}],17200,'Alawwa W.S.S'),

    mk('p09','K.R Lakmal','09217','Polgahawela W.T.P','PK-6829','January',2026,
       [{num:'328',date:'2026-01-31',vb:60296.96}],60300,'PK-6829, BHF-3800'),

    mk('p10','N.A.S Kulathialaka','09224','Wariyapola W.S.S','250-4906','January',2026,
       [{num:'',date:'',vb:0}],26000,'250-4906, MJ-4564'),

    mk('p11','W.P.C.C.K Weerasooriya','09233','Narammala W.S.S','TF-3486','January',2026,
       [{num:'6489',date:'2026-01-31',vb:12936}],12936,'TF-3486'),

    mk('p12','S.M.T.M Premasiri','09239','Ibbagamuwa W.S.S','GF-8017','January',2026,
       [{num:'1',date:'2026-01-31',vb:54500}],73763,'GF-8017, BAN-4167'),

    mk('p13','H.M.Y.N Herath','09240','Deduru Oya W.T.P','50-7445','January',2026,
       [{num:'W/F/S 000319',date:'2026-01-31',vb:64110}],64110,'50-7445'),

    mk('p14','E.M.S.K Ekanayake','09241','Polpithigama W.S.S','252-6186','January',2026,
       [{num:'',date:'',vb:0}],90500,'BHF-3819, 252-6186'),

    // ═══ FEBRUARY 2026 ══════════════════════════════════════
    mk('p01','W.M.N Wijekoon','09200','Work Shop','LN-8238','February',2026,
       [{num:'1022162602002',date:'2026-02-28',vb:267000}],267000,'LN-8238, PI-3914, PF-8100, PF-8095'),

    mk('p01','W.M.N Wijekoon','09200','Galgamuwa','42-7079','February',2026,
       [{num:'',date:'',vb:0}],85000,'42-7079 temp Galgamuwa Feb',true),

    mk('p03','B.A.I.S Wijesingha','09200','De Office','PF-7567','February',2026,
       [{num:'',date:'',vb:30000}],30000,'PF-7567'),

    mk('p05','M.R.K.M Medagoda','09208','Giriulla W.S.S','252-3119','February',2026,
       [{num:'',date:'',vb:56910.64}],56900,'252-3119, 113-4204'),

    mk('p06','Vajira Thilakarathne','09211','Kurunegala Zone 03','PW-7975','February',2026,
       [{num:'685',date:'2026-02-28',vb:19530}],22030,'PW-7975, MJ-4557'),

    mk('p07','T.M.C Thennakoon','09213','Nikawaratiya W.S.S','93-3208','February',2026,
       [{num:'355',date:'2026-02-28',vb:15400}],15400,'TR-7843, 93-3208'),

    mk('p08','S.M.A Samarakoon','09217','Polgahawela','PK-6828','February',2026,
       [{num:'337',date:'2026-02-28',vb:85395.58}],85400,'PK-6828, BHF-3889'),

    mk('p08','S.M.A Samarakoon','09217','Alawwa W.S.S','','February',2026,
       [{num:'WB/INV/04',date:'2026-02-28',vb:16500}],16500,'Alawwa W.S.S'),

    mk('p09','K.R Lakmal','09217','Polgahawela W.T.P','PK-6829','February',2026,
       [{num:'342',date:'2026-02-28',vb:55995.73}],56000,'PK-6829, BHF-3800'),

    mk('p10','N.A.S Kulathialaka','09224','Wariyapola W.S.S','250-4906','February',2026,
       [{num:'',date:'',vb:0}],32500,'250-4906, MJ-4564'),

    mk('p11','W.P.C.C.K Weerasooriya','09233','Narammala W.S.S','TF-3486','February',2026,
       [{num:'',date:'',vb:8760}],8760,'TF-3486'),

    mk('p12','S.M.T.M Premasiri','09239','Ibbagamuwa W.S.S','GF-8017','February',2026,
       [{num:'2',date:'2026-02-28',vb:58500.04}],59200,'GF-8017, BAN-4167, MJ-4952'),

    mk('p13','H.M.Y.N Herath','09240','Deduru Oya W.T.P','50-7445','February',2026,
       [{num:'',date:'',vb:63710}],63710,'50-7445'),

    mk('p14','E.M.S.K Ekanayake','09241','Polpithigama W.S.S','252-6186','February',2026,
       [{num:'',date:'',vb:80997.84}],81000,'BHF-3819, 252-6186'),

    mk('p15','A.M.N.P.K Athapaththu','09242','Maho W.S.S','LL-0985','February',2026,
       [{num:'',date:'',vb:0}],45000,'LL-0985, JF-8454'),

    // ═══ MARCH 2026 ═════════════════════════════════════════
    mk('p01','W.M.N Wijekoon','09200','Work Shop','LN-8238','March',2026,
       [{num:'',date:'',vb:240635}],276635,'LN-8238, PF-8100, PF-8095, PI-3914'),

    mk('p01','W.M.N Wijekoon','09200','Work Shop (42-7079)','42-7079','March',2026,
       [{num:'1022162602002',date:'',vb:46070}],173090,'42-7079 temp use March',true),

    mk('p03','B.A.I.S Wijesingha','09200','De Office','PF-7567','March',2026,
       [{num:'',date:'',vb:61000}],61000,'PF-7567'),

    mk('p05','M.R.K.M Medagoda','09208','Giriulla W.S.S','252-3119','March',2026,
       [{num:'4533/4532/4536/4534/3489/4539',date:'2026-03-31',vb:61179.77}],61180,'252-3119, 113-4204'),

    mk('p06','Vajira Thilakarathne','09211','Kurunegala Zone 03','PW-7975','March',2026,
       [{num:'',date:'2026-03-31',vb:37500}],39500,'PW-7975, MJ-4557'),

    mk('p07','T.M.C Thennakoon','09213','Nikawaratiya W.S.S','93-3208','March',2026,
       [{num:'368',date:'2026-03-31',vb:13100}],13100,'TR-7843, 93-3208'),

    mk('p08','S.M.A Samarakoon','09217','Alawwa W.S.S','','March',2026,
       [{num:'',date:'',vb:24000}],24000,'Alawwa W.S.S'),

    mk('p09','K.R Lakmal','09217','Polgahawela W.T.P','PK-6829','March',2026,
       [{num:'',date:'',vb:51990.39}],60000,'PK-6829, BHF-3800'),

    mk('p10','N.A.S Kulathialaka','09224','Wariyapola W.S.S','250-4906','March',2026,
       [{num:'',date:'',vb:0}],41590,'250-4906, MJ-4564'),

    mk('p11','W.P.C.C.K Weerasooriya','09233','Narammala W.S.S','TF-3486','March',2026,
       [{num:'',date:'',vb:0}],14468,'TF-3486'),

    mk('p12','S.M.T.M Premasiri','09239','Ibbagamuwa W.S.S','GF-8017','March',2026,
       [{num:'2',date:'',vb:72700.12}],72700,'GF-8017, BAN-4167, MJ-4952'),

    mk('p13','H.M.Y.N Herath','09240','Deduru Oya W.T.P','50-7445','March',2026,
       [{num:'',date:'',vb:54270}],54270,'50-7445'),

    mk('p14','E.M.S.K Ekanayake','09241','Polpithigama W.S.S','252-6186','March',2026,
       [{num:'',date:'',vb:20612.72}],93006,'BHF-3819, 252-6186'),

    mk('p02','S.M Hinnawala','09200','Regional Lab','TF-3487','March',2026,
       [{num:'',date:'',vb:0}],2500,'TF-3487'),

    mk('p04','A.H.M.I.S Abeysingha','09207','Galgamuwa W.S.S','253-5482','March',2026,
       [{num:'',date:'',vb:0}],80000,'253-5482'),

    // ═══ APRIL 2026 ══════════════════════════════════════════
    mk('p01','W.M.N Wijekoon','09200','Work Shop','LN-8238','April',2026,
       [{num:'',date:'',vb:0}],133485,'PF-8095, LN-8238, PI-3914'),
  ];
  sR(records);
}
