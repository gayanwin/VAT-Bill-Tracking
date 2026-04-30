// ═══════════════════════════════════════════════════════════════
// FUELTRACK PRO — APP LOGIC v5
// Features: partial invoices, multi-invoice, PIN delete,
//           center notifications, auto-status, Update Invoice page
// ═══════════════════════════════════════════════════════════════

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DELETE_PIN = '1234'; // default PIN

// ── STORE ──────────────────────────────────────────────────────
const gR = () => S.get('r');
const gP = () => S.get('p');
const gV = () => S.get('v');
const sR = d => S.set('r', d);
const sP = d => S.set('p', d);
const sV = d => S.set('v', d);

// ── UTILS ──────────────────────────────────────────────────────
const fmtN = v => {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtK = v => { const n = parseFloat(v); if (!n) return '0'; return Math.round(n).toLocaleString('en-LK'); };

// ── STATUS LOGIC ───────────────────────────────────────────────
// pending  = no invoice at all
// partial  = has invoice but VAT bill total < reimp (meaningful gap > 0.5)
// received = has invoice AND VAT bill >= reimp (settled / rounding)
function getStatus(rec) {
  const hasInv = (rec.invoices || []).some(i => i.num && i.num.trim());
  if (!hasInv) return 'pending';
  const bal = (rec.reimp || 0) - (rec.vatBill || 0);
  return bal > 0.5 ? 'partial' : 'received';
}

function autoStatus(reimp, vatBill, hasInv) {
  if (!hasInv || !vatBill) return 'pending';
  return (reimp - vatBill) > 0.5 ? 'partial' : 'received';
}

function statusPill(s) {
  if (s === 'received') return `<span class="sp sp-rcv"><span class="sp-dot"></span>Received</span>`;
  if (s === 'partial')  return `<span class="sp sp-prt"><span class="sp-dot"></span>Partial</span>`;
  return `<span class="sp sp-pnd"><span class="sp-dot"></span>Pending</span>`;
}

// ── BALANCE CELL ───────────────────────────────────────────────
// pending = full reimp RED (▼)
// partial = remaining balance ORANGE (▲)
// received with tiny diff = GREEN small
// received, settled = —
function balanceCell(rec) {
  const status = getStatus(rec);
  if (status === 'pending') {
    return `<td class="tbal-rd">▼ ${fmtN(rec.reimp)}</td>`;
  }
  const bal = parseFloat((rec.reimp - rec.vatBill).toFixed(2));
  if (status === 'partial') {
    return `<td class="tbal-or">▲ ${fmtN(bal)}</td>`;
  }
  // received — check rounding
  if (bal < -0.01) {
    // vatBill slightly MORE than reimp (overpaid/rounding) → show green small
    return `<td class="tbal-gn" title="Slight overpayment (rounding)">+${fmtN(Math.abs(bal))}</td>`;
  }
  if (bal > 0.01 && bal <= 0.5) {
    return `<td class="tbal-gn" title="Small rounding diff">${fmtN(bal)}</td>`;
  }
  return `<td class="tmn" style="color:var(--tx3);">—</td>`;
}

// ── NOTIFICATIONS ──────────────────────────────────────────────
function showNotif(icon, title, msg, type = 'ok') {
  document.getElementById('notifIcon').textContent = icon;
  document.getElementById('notifTtl').textContent = title;
  document.getElementById('notifMsg').textContent = msg;
  document.getElementById('notifBox').className = `notif-box notif-${type}-type`;
  document.getElementById('notifOverlay').style.display = 'flex';
}
function closeNotif(e) {
  if (!e || e.target === document.getElementById('notifOverlay') || e.currentTarget === document.getElementById('notifOk')) {
    document.getElementById('notifOverlay').style.display = 'none';
  }
}

function toast(msg, t = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = (t === 'ok' ? '✓ ' : t === 'warn' ? '⚠ ' : '✗ ') + msg;
  el.className = 'toast show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 3000);
}

// ── FILTER HELPERS ─────────────────────────────────────────────
function getMonthList() {
  const seen = new Set(), list = [];
  gR().forEach(r => {
    const k = r.month + ' ' + r.year;
    if (!seen.has(k)) { seen.add(k); list.push({ month: r.month, year: r.year, k }); }
  });
  return list.sort((a, b) => a.year !== b.year ? a.year - b.year : MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
}

function getSiteList() {
  const map = new Map();
  gR().forEach(r => { const k = r.code + '||' + r.site; if (!map.has(k)) map.set(k, { code: r.code, site: r.site }); });
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function fillFilters() {
  const months = getMonthList(), persons = gP(), sites = getSiteList();
  ['dMon','rMon','iuMon'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cv = el.value;
    el.innerHTML = '<option value="">All Months</option>';
    months.forEach(m => el.innerHTML += `<option value="${m.k}" ${m.k===cv?'selected':''}>${m.month} ${m.year}</option>`);
  });
  ['dPer','rPer','iuPer'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cv = el.value;
    el.innerHTML = '<option value="">All Persons</option>';
    persons.forEach(p => el.innerHTML += `<option value="${p.id}" ${p.id===cv?'selected':''}>${p.name}</option>`);
  });
  ['dSite','rSite'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cv = el.value;
    el.innerHTML = '<option value="">All Sites</option>';
    sites.forEach(s => { const k = s.code+'||'+s.site; el.innerHTML += `<option value="${k}" ${k===cv?'selected':''}>${s.code} — ${s.site}</option>`; });
  });
  // Update sidebar pending badge
  const pendCount = gR().filter(r => getStatus(r) !== 'received').length;
  const badge = document.getElementById('pendBadge');
  if (badge) { badge.textContent = pendCount; badge.dataset.n = pendCount; }
}

// ── NAVIGATION ─────────────────────────────────────────────────
function go(name) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  document.getElementById('pg-' + name).classList.add('active');
  const ni = document.querySelector(`[data-p="${name}"]`);
  if (ni) ni.classList.add('active');
  fillFilters();
  if (name === 'dash') renderDash();
  if (name === 'rec') renderRec();
  if (name === 'invupdate') renderInvUpdate();
  if (name === 'per') renderPer();
  if (name === 'veh') renderVeh();
  if (name === 'add') { resetAddForm(); fillAddSels(); }
}

// ── DASHBOARD ──────────────────────────────────────────────────
function getDFilter() {
  const mon = document.getElementById('dMon')?.value || '';
  const per = document.getElementById('dPer')?.value || '';
  const sk  = document.getElementById('dSite')?.value || '';
  let r = gR();
  if (mon) { const [m,y]=mon.split(' '); r=r.filter(x=>x.month===m&&x.year==y); }
  if (per) r = r.filter(x => x.personId === per);
  if (sk)  { const [c,s]=sk.split('||'); r=r.filter(x=>x.code===c&&x.site===s); }
  return r.map(rec => ({ ...rec, status: getStatus(rec) }));
}

function renderDash() {
  const recs = getDFilter();
  const pending  = recs.filter(r => r.status === 'pending');
  const partial  = recs.filter(r => r.status === 'partial');
  const received = recs.filter(r => r.status === 'received');
  const totalReimp = recs.reduce((s,r) => s+(r.reimp||0), 0);
  const totalVB    = recs.reduce((s,r) => s+(r.vatBill||0), 0);
  const totalTax   = recs.reduce((s,r) => s+(r.taxInv||0), 0);
  const totalVAT   = recs.reduce((s,r) => s+(r.vat||0), 0);
  const pendBal    = pending.reduce((s,r) => s+(r.reimp||0), 0);
  const partBal    = partial.reduce((s,r) => s+(r.reimp-(r.vatBill||0)), 0);
  const totalBal   = pendBal + partBal;

  // Header
  document.getElementById('hdrStats').innerHTML = `
    <div class="hstat"><div class="hstat-v">${fmtK(totalReimp)}</div><div class="hstat-l">Total Reimb.</div></div>
    <div class="hstat"><div class="hstat-v">${pending.length}</div><div class="hstat-l">No Invoice</div></div>
    <div class="hstat"><div class="hstat-v">${partial.length}</div><div class="hstat-l">Partial</div></div>
    <div class="hstat"><div class="hstat-v">${fmtK(totalBal)}</div><div class="hstat-l">Balance Due</div></div>`;

  // KPI
  document.getElementById('krow').innerHTML = `
    <div class="kpi k-bl"><div class="k-lbl">Total Records</div><div class="k-val bl">${recs.length}</div><div class="k-sub">${received.length} complete</div></div>
    <div class="kpi k-gn"><div class="k-lbl">Total Reimb.</div><div class="k-val gn">${fmtK(totalReimp)}</div><div class="k-sub">LKR paid out</div></div>
    <div class="kpi k-bl"><div class="k-lbl">VAT Bill Total</div><div class="k-val bl">${fmtK(totalVB)}</div><div class="k-sub">Invoices received</div></div>
    <div class="kpi k-am"><div class="k-lbl">No Invoice</div><div class="k-val am">${pending.length}</div><div class="k-sub">${fmtK(pendBal)} pending</div></div>
    <div class="kpi k-or"><div class="k-lbl">Partial Invoice</div><div class="k-val or">${partial.length}</div><div class="k-sub">${fmtK(partBal)} balance</div></div>
    <div class="kpi k-pu"><div class="k-lbl">VAT Amount</div><div class="k-val" style="color:var(--pu)">${fmtK(totalVAT)}</div><div class="k-sub">18% portion</div></div>`;

  // VAT Panel
  const pctRcv = totalReimp > 0 ? Math.round((totalVB/totalReimp)*100) : 0;
  const pctPnd = totalReimp > 0 ? Math.round((pendBal/totalReimp)*100) : 0;
  const pctPrt = totalReimp > 0 ? Math.round((partBal/totalReimp)*100) : 0;
  document.getElementById('vcard').innerHTML = `
    <div class="vb"><div class="vb-l">VAT Bill Received</div><div class="vb-v gn">${fmtK(totalVB)}</div><div class="vb-s">${received.length} complete records</div>
      <div class="pb"><div class="pb-labels"><span>Invoice coverage</span><span>${pctRcv}%</span></div><div class="pb-track"><div class="pb-fill pf-gn" style="width:${pctRcv}%"></div></div></div></div>
    <div class="vb"><div class="vb-l">Tax Invoice (÷1.18)</div><div class="vb-v bl">${fmtK(totalTax)}</div><div class="vb-s">Excl. VAT base</div></div>
    <div class="vb"><div class="vb-l">VAT Amount</div><div class="vb-v" style="color:var(--pu)">${fmtK(totalVAT)}</div><div class="vb-s">18% portion</div></div>
    <div class="vb"><div class="vb-l">⏳ No Invoice Pending</div><div class="vb-v am">${fmtK(pendBal)}</div><div class="vb-s">${pending.length} records awaiting invoice</div>
      <div class="pb"><div class="pb-labels"><span>Pending ratio</span><span>${pctPnd}%</span></div><div class="pb-track"><div class="pb-fill pf-am" style="width:${pctPnd}%"></div></div></div></div>
    <div class="vb"><div class="vb-l">⚠ Partial Balance Due</div><div class="vb-v or">${fmtK(partBal)}</div><div class="vb-s">${partial.length} records — invoice incomplete</div>
      <div class="pb"><div class="pb-labels"><span>Partial ratio</span><span>${pctPrt}%</span></div><div class="pb-track"><div class="pb-fill pf-or" style="width:${pctPrt}%"></div></div></div></div>`;

  // Pending list
  document.getElementById('nPend').textContent = pending.length;
  document.getElementById('listPend').innerHTML = pending.length
    ? pending.map(r => `
      <div class="sli">
        <div class="sli-ico sli-ico-am">⏳</div>
        <div class="sli-info"><div class="sli-nm">${r.name}</div><div class="sli-meta">${r.code} · ${r.site} · ${r.month} ${r.year}</div></div>
        <div class="sli-r">
          <div class="sli-amt">${fmtN(r.reimp)}</div>
          <div class="sli-bal rd">▼ ${fmtN(r.reimp)}</div>
          <button class="mark-btn" onclick="openInvMod('${r.id}')">+ Invoice</button>
        </div>
      </div>`).join('')
    : '<div style="text-align:center;padding:20px;color:var(--tx3);font-size:12px;">🎉 No pending invoices!</div>';

  // Partial list
  document.getElementById('nPart').textContent = partial.length;
  document.getElementById('listPart').innerHTML = partial.length
    ? partial.map(r => {
        const bal = parseFloat((r.reimp - r.vatBill).toFixed(2));
        return `<div class="sli">
          <div class="sli-ico sli-ico-or">⚠️</div>
          <div class="sli-info"><div class="sli-nm">${r.name}</div><div class="sli-meta">${r.code} · ${r.site} · ${r.month} ${r.year}</div></div>
          <div class="sli-r">
            <div class="sli-amt">Reimp: ${fmtN(r.reimp)}</div>
            <div class="sli-bal or">▲ ${fmtN(bal)}</div>
            <button class="mark-btn mark-btn-or" onclick="openInvMod('${r.id}')">+ More Invoice</button>
          </div>
        </div>`;
      }).join('')
    : '<div style="text-align:center;padding:20px;color:var(--tx3);font-size:12px;">✓ No partial invoices!</div>';

  // Summary table
  document.getElementById('dashTb').innerHTML = recs.map(r => {
    const inv0 = (r.invoices||[]).filter(i=>i.num&&i.num.trim());
    const invDisplay = inv0.length ? inv0.map(i=>`<span class="inv-tag">${i.num}</span>`).join('') : '—';
    const firstDate = inv0[0]?.date || '—';
    return `<tr>
      <td class="tnm">${r.name}${r.isTempV?` <span class="badge b-or">🚗 ${r.vehicle}</span>`:''}</td>
      <td class="tco">${r.code}</td>
      <td>${r.site}</td>
      <td>${r.month} ${r.year}</td>
      <td style="font-size:11px;">${invDisplay}</td>
      <td class="tmn">${firstDate}</td>
      <td class="tmn">${fmtN(r.reimp)}</td>
      <td class="tmn">${fmtN(r.vatBill)}</td>
      <td class="tmn" style="color:${(r.woVat||0)<0?'var(--rd)':'var(--tx2)'};">${r.woVat?fmtN(r.woVat):'—'}</td>
      <td class="tmn">${fmtN(r.taxInv)}</td>
      <td class="tmn">${fmtN(r.vat)}</td>
      <td class="tmn" style="font-weight:700;color:var(--tx);">${fmtN(r.total)}</td>
      ${balanceCell(r)}
      <td>${statusPill(r.status)}</td>
    </tr>`;
  }).join('');

  const tR=recs.reduce((s,r)=>s+r.reimp,0),tVB=recs.reduce((s,r)=>s+r.vatBill,0);
  const tTx=recs.reduce((s,r)=>s+r.taxInv,0),tVt=recs.reduce((s,r)=>s+r.vat,0);
  document.getElementById('dashFt').innerHTML=`<tr>
    <td colspan="6">TOTALS — ${recs.length} records</td>
    <td>${fmtK(tR)}</td><td>${fmtK(tVB)}</td><td></td>
    <td>${fmtK(tTx)}</td><td>${fmtK(tVt)}</td><td>${fmtK(tVB)}</td>
    <td style="color:var(--or);">${totalBal>0?fmtK(totalBal):'—'}</td><td></td>
  </tr>`;
}

// ── ALL RECORDS ────────────────────────────────────────────────
function renderRec() {
  const srch = (document.getElementById('rSrch')?.value||'').toLowerCase();
  const mon  = document.getElementById('rMon')?.value||'';
  const stat = document.getElementById('rStat')?.value||'';
  const per  = document.getElementById('rPer')?.value||'';
  const sk   = document.getElementById('rSite')?.value||'';
  let recs = gR().map(r => ({...r, status: getStatus(r)}));
  if (srch) recs=recs.filter(r=>r.name.toLowerCase().includes(srch)||r.site.toLowerCase().includes(srch)||r.code.includes(srch)||(r.invoices||[]).some(i=>(i.num||'').toLowerCase().includes(srch)));
  if (mon)  { const[m,y]=mon.split(' ');recs=recs.filter(r=>r.month===m&&r.year==y); }
  if (stat) recs=recs.filter(r=>r.status===stat);
  if (per)  recs=recs.filter(r=>r.personId===per);
  if (sk)   { const[c,s]=sk.split('||');recs=recs.filter(r=>r.code===c&&r.site===s); }

  const bn=document.getElementById('balNotice');
  const pend=recs.filter(r=>r.status==='pending');
  const part=recs.filter(r=>r.status==='partial');
  const bal=pend.reduce((s,r)=>s+r.reimp,0)+part.reduce((s,r)=>s+(r.reimp-r.vatBill),0);
  if (bal>0&&(per||sk||mon||stat)) {
    bn.style.display='flex';
    bn.innerHTML=`<div class="bn-ico">⚠️</div><div><div class="bn-ttl">Balance Due: LKR ${fmtK(bal)}</div><div class="bn-sub">${pend.length} no invoice · ${part.length} partial — tax invoices still awaited.</div></div>`;
  } else bn.style.display='none';

  const tbody=document.getElementById('recTb');
  if (!recs.length) { tbody.innerHTML=`<tr><td colspan="14" style="text-align:center;padding:28px;color:var(--tx3);">No records found.</td></tr>`; return; }
  tbody.innerHTML=recs.map(r=>{
    const inv0=(r.invoices||[]).filter(i=>i.num&&i.num.trim());
    const invD=inv0.length?inv0.map(i=>`<span class="inv-tag">${i.num}</span>`).join(''):'—';
    return `<tr>
      <td class="tnm">${r.name}</td>
      <td class="tco">${r.code}</td>
      <td>${r.site}${r.isTempV?` <span class="badge b-or" style="font-size:10px;">Temp</span>`:''}</td>
      <td>${r.vehicle?`<span class="badge b-bl">🚗 ${r.vehicle}</span>`:'—'}</td>
      <td>${r.month} ${r.year}</td>
      <td class="tmn">${fmtN(r.reimp)}</td>
      <td class="tmn">${fmtN(r.vatBill)}</td>
      <td class="tmn">${fmtN(r.taxInv)}</td>
      <td class="tmn">${fmtN(r.vat)}</td>
      <td class="tmn" style="font-weight:700;color:var(--tx);">${fmtN(r.total)}</td>
      ${balanceCell(r)}
      <td style="font-size:11px;">${invD}</td>
      <td>${statusPill(r.status)}</td>
      <td><div style="display:flex;gap:3px;">
        ${r.status!=='received'?`<button class="tbtn" title="Add invoice" onclick="openInvMod('${r.id}')">📋</button>`:''}
        <button class="tbtn" title="Delete" onclick="askPin('${r.id}')">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ── ADD NEW RECORD ─────────────────────────────────────────────
function fillAddSels() {
  const ps=gP(), vs=gV();
  const psel=document.getElementById('f_per');
  psel.innerHTML='<option value="">Select person...</option>';
  ps.forEach(p=>psel.innerHTML+=`<option value="${p.id}">${p.name} (${p.code})</option>`);
  const vsel=document.getElementById('f_veh');
  vsel.innerHTML='<option value="">None</option>';
  vs.forEach(v=>vsel.innerHTML+=`<option value="${v.num}">${v.num}${v.type?' — '+v.type:''}</option>`);
  document.getElementById('f_mon').value=MONTHS[new Date().getMonth()];
}

function onAddPer() {
  const p=gP().find(x=>x.id===document.getElementById('f_per').value);
  if (p) { document.getElementById('f_code').value=p.code; document.getElementById('f_site').value=p.site; }
}

function calcAmt() {
  const reimp=parseFloat(document.getElementById('f_reimp').value)||0;
  const vb=parseFloat(document.getElementById('f_vat').value)||0;
  const invN=document.getElementById('f_in1').value.trim();
  if (vb>0) {
    const tx=vb/1.18,vat=vb-tx,wo=vb-reimp,bal=reimp-vb;
    document.getElementById('cv_wo').textContent=fmtN(wo);
    document.getElementById('cv_tx').textContent=fmtN(tx);
    document.getElementById('cv_vt').textContent=fmtN(vat);
    document.getElementById('cv_tot').textContent=fmtN(vb);
    if (bal>0.5) { document.getElementById('cv_bal').textContent=fmtN(bal); document.getElementById('cbal').style.display='flex'; }
    else document.getElementById('cbal').style.display='none';
  } else if (reimp>0) {
    ['cv_wo','cv_tx','cv_vt','cv_tot'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('cv_bal').textContent=fmtN(reimp)+' (no invoice)';
    document.getElementById('cbal').style.display='flex';
  } else {
    ['cv_wo','cv_tx','cv_vt','cv_tot','cv_bal'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('cbal').style.display='none';
  }
}

function saveNewRec() {
  const pid=document.getElementById('f_per').value;
  const p=gP().find(x=>x.id===pid);
  if (!p) { setFMsg('Person select karanna!','err'); return; }
  const reimp=parseFloat(document.getElementById('f_reimp').value)||0;
  if (!reimp) { setFMsg('Reimbursement amount denna!','err'); return; }

  const vb=parseFloat(document.getElementById('f_vat').value)||0;
  const tx=vb>0?parseFloat((vb/1.18).toFixed(2)):0;
  const vat=vb>0?parseFloat((vb-tx).toFixed(2)):0;
  const wo=vb>0?parseFloat((vb-reimp).toFixed(2)):0;
  const invNum=document.getElementById('f_in1').value.trim();
  const invDate=document.getElementById('f_id1').value;
  const invoices=invNum?[{num:invNum,date:invDate,vb}]:[];
  const status=autoStatus(reimp,vb,!!invNum);

  const rec={
    id:uid(),personId:pid,name:p.name,code:p.code,
    site:document.getElementById('f_site').value,
    vehicle:document.getElementById('f_veh').value,isTempV:false,
    month:document.getElementById('f_mon').value,
    year:parseInt(document.getElementById('f_yr').value)||2026,
    invoices,reimp,vatBill:vb,woVat:wo,taxInv:tx,vat,total:vb,
    balance:parseFloat((reimp-vb).toFixed(2)),
    status,notes:document.getElementById('f_notes').value
  };

  const recs=gR(); recs.push(rec); sR(recs);
  updateHdrStats(); fillFilters();
  showNotif('✅','Record Saved!',`${p.name} · ${rec.month} ${rec.year} added successfully.`,'ok');
  resetAddForm();
}

function resetAddForm() {
  ['f_per','f_code','f_site','f_veh','f_reimp','f_vat','f_in1','f_id1','f_notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f_yr').value=2026;
  ['cv_wo','cv_tx','cv_vt','cv_tot','cv_bal'].forEach(id=>document.getElementById(id).textContent='—');
  document.getElementById('cbal').style.display='none';
  document.getElementById('fMsg').textContent='';
}

function setFMsg(msg,t){ const el=document.getElementById('fMsg'); el.textContent=msg; el.className='fmsg '+t; }

// ── UPDATE INVOICE PAGE ────────────────────────────────────────
function renderInvUpdate() {
  const srch=(document.getElementById('iuSrch')?.value||'').toLowerCase();
  const mon=document.getElementById('iuMon')?.value||'';
  const stat=document.getElementById('iuStat')?.value||'';
  const per=document.getElementById('iuPer')?.value||'';

  let recs=gR().map(r=>({...r,status:getStatus(r)})).filter(r=>r.status!=='received');
  if (srch) recs=recs.filter(r=>r.name.toLowerCase().includes(srch)||r.site.toLowerCase().includes(srch)||r.code.includes(srch));
  if (mon) { const[m,y]=mon.split(' ');recs=recs.filter(r=>r.month===m&&r.year==y); }
  if (stat) recs=recs.filter(r=>r.status===stat);
  if (per) recs=recs.filter(r=>r.personId===per);

  const pend=recs.filter(r=>r.status==='pending');
  const part=recs.filter(r=>r.status==='partial');
  const pendAmt=pend.reduce((s,r)=>s+r.reimp,0);
  const partBal=part.reduce((s,r)=>s+(r.reimp-r.vatBill),0);

  document.getElementById('iuStats').innerHTML=`
    <div class="ius-card"><div class="ius-val am">${pend.length}</div><div class="ius-lbl">⏳ No Invoice</div></div>
    <div class="ius-card"><div class="ius-val or">${part.length}</div><div class="ius-lbl">⚠ Partial Invoice</div></div>
    <div class="ius-card"><div class="ius-val rd">${fmtK(pendAmt)}</div><div class="ius-lbl">Pending Balance (LKR)</div></div>
    <div class="ius-card"><div class="ius-val or">${fmtK(partBal)}</div><div class="ius-lbl">Partial Balance (LKR)</div></div>`;

  if (!recs.length) {
    document.getElementById('iuCards').innerHTML=`<div class="card" style="padding:40px;text-align:center;"><div style="font-size:40px;margin-bottom:12px;">🎉</div><div style="font-size:15px;font-weight:700;color:var(--tx);">All invoices complete!</div><div style="color:var(--tx3);margin-top:4px;">No pending or partial records found.</div></div>`;
    return;
  }

  document.getElementById('iuCards').innerHTML=recs.map(r=>{
    const isPend=r.status==='pending';
    const bal=isPend?r.reimp:parseFloat((r.reimp-r.vatBill).toFixed(2));
    const existInvs=(r.invoices||[]).filter(i=>i.num&&i.num.trim());
    const balClass=isPend?'rd':'or';
    const avCls=isPend?'iuc-av-am':'iuc-av-or';
    const avIcon=isPend?'⏳':'⚠️';
    return `
    <div class="iuc">
      <div class="iuc-head">
        <div class="iuc-avatar ${avCls}">${avIcon}</div>
        <div class="iuc-meta">
          <div class="iuc-name">${r.name}</div>
          <div class="iuc-sub">${r.code} · ${r.site} · ${r.month} ${r.year}</div>
        </div>
        <div class="iuc-right">
          <div>${statusPill(r.status)}</div>
        </div>
      </div>
      <div class="iuc-body">
        <div class="iuc-row">
          <span class="iuc-lbl">Reimb. Amount</span>
          <span class="iuc-val">${fmtN(r.reimp)}</span>
          <span class="iuc-bal ${balClass}">Balance: ${fmtN(bal)}</span>
        </div>
        ${existInvs.length>0?`
        <div class="iuc-row">
          <span class="iuc-lbl">Invoices so far</span>
          <div class="iuc-invs">${existInvs.map(i=>`<span class="inv-tag prt">${i.num} (${fmtN(i.vb)})</span>`).join('')}</div>
        </div>
        <div class="iuc-row">
          <span class="iuc-lbl">Total VAT paid</span>
          <span class="iuc-val">${fmtN(r.vatBill)}</span>
        </div>`:''}
        ${r.notes?`<div class="iuc-row"><span class="iuc-lbl">Notes</span><span class="iuc-val" style="font-size:11.5px;color:var(--tx3);">${r.notes}</span></div>`:''}
      </div>
      <div class="iuc-foot">
        <div class="iuc-status-area">
          ${r.vehicle?`<span class="badge b-bl">🚗 ${r.vehicle}</span>`:''}
          ${r.notes?`<span style="font-size:11px;color:var(--tx3);">${r.notes.substring(0,40)}${r.notes.length>40?'...':''}</span>`:''}
        </div>
        <button class="btn-pri" onclick="openInvMod('${r.id}')">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4"/><line x1="7" y1="4.5" x2="7" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4.5" y1="7" x2="9.5" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          ${isPend?'Add Invoice':'Add More Invoice'}
        </button>
      </div>
    </div>`;
  }).join('');
}

// ── INVOICE MODAL ──────────────────────────────────────────────
function openInvMod(id) {
  const rec=gR().find(r=>r.id===id); if (!rec) return;
  const status=getStatus(rec);
  const bal=parseFloat((rec.reimp-(rec.vatBill||0)).toFixed(2));
  document.getElementById('mi_id').value=id;
  document.getElementById('mi_num').value='';
  document.getElementById('mi_dt').value='';
  document.getElementById('mi_vb').value='';
  document.getElementById('modTtl').textContent=status==='partial'?'Add More Invoice':'Update Invoice Details';
  document.getElementById('modSub').textContent=`${rec.name} · ${rec.site} · ${rec.month} ${rec.year}`;

  const existInvs=(rec.invoices||[]).filter(i=>i.num&&i.num.trim());
  let infoHtml=`<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--tx3);font-size:12px;">Reimbursement</span><strong>${fmtN(rec.reimp)}</strong></div>`;
  if (existInvs.length>0) {
    infoHtml+=`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--tx3);font-size:12px;">Total VAT so far</span><span style="font-family:var(--mono);color:var(--gn);">${fmtN(rec.vatBill)}</span></div>`;
    infoHtml+=`<div style="display:flex;justify-content:space-between;"><span style="color:var(--tx3);font-size:12px;">Balance still due</span><span style="font-family:var(--mono);color:var(--or);font-weight:700;">${fmtN(bal)}</span></div>`;
    infoHtml+=`<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--brd);display:flex;flex-wrap:wrap;gap:3px;">${existInvs.map(i=>`<span class="inv-tag prt">${i.num}</span>`).join('')}</div>`;
  } else {
    infoHtml+=`<div style="color:var(--am);font-weight:600;font-size:12px;margin-top:4px;">⚠ No invoice received yet — balance: ${fmtN(rec.reimp)}</div>`;
  }
  document.getElementById('modInfo').innerHTML=infoHtml;
  document.getElementById('modCalc').style.display='none';
  document.getElementById('modCalc').innerHTML='';
  document.getElementById('mi_stat').value=bal>500?'partial':'received';
  document.getElementById('invMod').style.display='flex';
  setTimeout(()=>document.getElementById('mi_num').focus(),200);
}

function closeInvMod(e) { if(e.target===document.getElementById('invMod'))document.getElementById('invMod').style.display='none'; }

function modCalc() {
  const id=document.getElementById('mi_id').value;
  const rec=gR().find(r=>r.id===id); if (!rec) return;
  const vb=parseFloat(document.getElementById('mi_vb').value)||0;
  const mc=document.getElementById('modCalc');
  if (!vb) { mc.style.display='none'; return; }
  const tx=vb/1.18,vat=vb-tx,wo=vb-rec.reimp;
  const newTotalVB=(rec.vatBill||0)+vb;
  const newBal=rec.reimp-newTotalVB;
  mc.style.display='block';
  mc.innerHTML=`
    <div class="mc-r"><span class="mc-l">Without VAT</span><span class="mc-v">${fmtN(wo)}</span></div>
    <div class="mc-r"><span class="mc-l">Tax Invoice (÷1.18)</span><span class="mc-v">${fmtN(tx)}</span></div>
    <div class="mc-r"><span class="mc-l">VAT Amount</span><span class="mc-v">${fmtN(vat)}</span></div>
    <div class="mc-r" style="border-top:1px solid var(--brd2);padding-top:5px;margin-top:3px;">
      <span class="mc-l" style="color:var(--tx);font-weight:700;">New Total VAT Bill</span>
      <span class="mc-v" style="color:var(--bl);font-weight:700;">${fmtN(newTotalVB)}</span>
    </div>
    ${newBal>0.5?`<div class="mc-r"><span class="mc-l" style="color:var(--or);font-weight:700;">Balance Remaining</span><span class="mc-v" style="color:var(--or);font-weight:700;">${fmtN(newBal)}</span></div>`
    :`<div class="mc-r"><span class="mc-l" style="color:var(--gn);font-weight:700;">✓ Fully Settled</span><span class="mc-v" style="color:var(--gn);">Balance cleared</span></div>`}`;
  document.getElementById('mi_stat').value=newBal>0.5?'partial':'received';
}

function saveMod() {
  const id=document.getElementById('mi_id').value;
  const num=document.getElementById('mi_num').value.trim();
  if (!num) { toast('Invoice number denna!','warn'); return; }
  const dt=document.getElementById('mi_dt').value;
  const vb=parseFloat(document.getElementById('mi_vb').value)||0;
  const newStatus=document.getElementById('mi_stat').value;

  const recs=gR();
  const i=recs.findIndex(r=>r.id===id); if (i<0) return;
  const r=recs[i];

  const existInvs=(r.invoices||[]).filter(inv=>inv.num&&inv.num.trim());
  existInvs.push({num,date:dt,vb});
  const newTotalVB=existInvs.reduce((s,inv)=>s+(parseFloat(inv.vb)||0),0);
  const tx=newTotalVB>0?parseFloat((newTotalVB/1.18).toFixed(2)):0;
  const vat=newTotalVB>0?parseFloat((newTotalVB-tx).toFixed(2)):0;
  const wo=newTotalVB>0?parseFloat((newTotalVB-r.reimp).toFixed(2)):0;
  const bal=parseFloat((r.reimp-newTotalVB).toFixed(2));

  recs[i]={...r,invoices:existInvs,vatBill:newTotalVB,woVat:wo,taxInv:tx,vat,total:newTotalVB,balance:bal,status:newStatus};
  sR(recs);
  document.getElementById('invMod').style.display='none';
  updateHdrStats(); fillFilters();
  renderDash(); renderRec();
  if (document.getElementById('pg-invupdate').classList.contains('active')) renderInvUpdate();

  if (newStatus==='received') {
    showNotif('✅','Invoice Complete!',`${r.name} · ${r.month} ${r.year} — Invoice ${num} saved. Record fully settled.`,'ok');
  } else {
    showNotif('⚠️','Partial Invoice Saved',`${r.name} · ${r.month} ${r.year} — Invoice ${num} added. Balance remaining: LKR ${fmtN(bal)}`,'warn');
  }
}

// ── DELETE WITH PIN ────────────────────────────────────────────
let _pinTarget = null;
function askPin(id) {
  _pinTarget=id;
  document.getElementById('pinInput').value='';
  document.getElementById('pinErr').style.display='none';
  renderPinDots(0);
  document.getElementById('pinRecId').value=id;
  document.getElementById('pinMod').style.display='flex';
  setTimeout(()=>document.getElementById('pinInput').focus(),200);
}

function renderPinDots(n) {
  const max=4;
  document.getElementById('pinDots').innerHTML=Array.from({length:max},(_,i)=>
    `<div class="pin-dot${i<n?' filled':''}"></div>`).join('');
}

function checkPin() {
  const val=document.getElementById('pinInput').value;
  renderPinDots(val.length);
  if (val.length<4) { document.getElementById('pinErr').style.display='none'; return; }
  if (val===DELETE_PIN) {
    const id=document.getElementById('pinRecId').value;
    sR(gR().filter(r=>r.id!==id));
    closePinMod();
    updateHdrStats(); fillFilters();
    renderRec();
    if (document.getElementById('pg-invupdate').classList.contains('active')) renderInvUpdate();
    showNotif('🗑️','Record Deleted','The record has been permanently removed.','err');
  } else {
    document.getElementById('pinErr').style.display='block';
    document.getElementById('pinInput').value='';
    renderPinDots(0);
    // Shake animation
    const dots=document.getElementById('pinDots');
    dots.style.animation='none'; dots.offsetHeight;
    dots.style.animation='shake .3s ease';
  }
}

function closePinMod() { document.getElementById('pinMod').style.display='none'; document.getElementById('pinInput').value=''; }

// ── PERSONS ────────────────────────────────────────────────────
function savePer() {
  const nm=document.getElementById('pn_nm').value.trim();
  const code=document.getElementById('pn_code').value.trim();
  if (!nm||!code) { toast('Name & site code denna!','warn'); return; }
  const ps=gP();
  ps.push({id:uid(),name:nm,code,site:document.getElementById('pn_site').value.trim(),nic:document.getElementById('pn_nic').value.trim()});
  sP(ps);
  ['pn_nm','pn_code','pn_site','pn_nic'].forEach(id=>document.getElementById(id).value='');
  toggleEl('pFrm'); renderPer(); toast('Person saved!');
}

function renderPer() {
  const ps=gP(),recs=gR();
  document.getElementById('perTb').innerHTML=ps.map((p,i)=>{
    const cnt=recs.filter(r=>r.personId===p.id).length;
    const pend=recs.filter(r=>r.personId===p.id&&getStatus(r)==='pending').length;
    const part=recs.filter(r=>r.personId===p.id&&getStatus(r)==='partial').length;
    return `<tr><td>${i+1}</td><td class="tnm">${p.name}</td><td class="tco">${p.code}</td><td>${p.site||'—'}</td><td>${p.nic||'—'}</td>
      <td><span class="badge b-bl">${cnt}</span>${pend?` <span class="badge b-am">${pend}⏳</span>`:''}${part?` <span class="badge b-or">${part}⚠</span>`:''}</td>
      <td><button class="tbtn" onclick="delPer('${p.id}')">🗑</button></td></tr>`;
  }).join('');
}

function delPer(id) {
  if(!confirm('Delete?'))return;
  sP(gP().filter(p=>p.id!==id)); renderPer(); toast('Deleted.','err');
}

// ── VEHICLES ───────────────────────────────────────────────────
function openAddVeh() {
  const ps=gP(), sel=document.getElementById('vn_own');
  sel.innerHTML='<option value="">No owner</option>';
  ps.forEach(p=>sel.innerHTML+=`<option value="${p.id}">${p.name}</option>`);
  toggleEl('vFrm');
}

function saveVeh() {
  const num=document.getElementById('vn_num').value.trim();
  if (!num) { toast('Vehicle number denna!','warn'); return; }
  const vs=gV();
  vs.push({id:uid(),num,type:document.getElementById('vn_type').value.trim(),ownerId:document.getElementById('vn_own').value,notes:document.getElementById('vn_note').value.trim()});
  sV(vs);
  ['vn_num','vn_type','vn_note'].forEach(id=>document.getElementById(id).value='');
  toggleEl('vFrm'); renderVeh(); toast('Vehicle saved!');
}

function renderVeh() {
  const vs=gV(),ps=gP(),recs=gR();
  const tb=document.getElementById('vehTb');
  if (!vs.length) { tb.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--tx3);">No vehicles registered.</td></tr>`; return; }
  tb.innerHTML=vs.map((v,i)=>{
    const own=ps.find(p=>p.id===v.ownerId);
    const cnt=recs.filter(r=>r.vehicle===v.num).length;
    return `<tr><td>${i+1}</td><td class="tco" style="font-size:13px;font-weight:700;">${v.num}</td><td>${v.type||'—'}</td><td>${own?own.name:'—'}</td><td style="font-size:11.5px;color:var(--tx3);">${v.notes||'—'}</td><td><span class="badge b-bl">${cnt}</span></td><td><button class="tbtn" onclick="delVeh('${v.id}')">🗑</button></td></tr>`;
  }).join('');
}

function delVeh(id) { if(!confirm('Delete?'))return; sV(gV().filter(v=>v.id!==id)); renderVeh(); toast('Deleted.','err'); }

// ── EXPORT ─────────────────────────────────────────────────────
function exportCSV() {
  const mon=document.getElementById('dMon')?.value||'';
  let recs=gR().map(r=>({...r,status:getStatus(r)}));
  if (mon) { const[m,y]=mon.split(' ');recs=recs.filter(r=>r.month===m&&r.year==y); }
  const hdr=['Name','Code','Site','Vehicle','Month','Year','Invoice Numbers','Dates','Reimp','VAT Bill','W/O VAT','Tax Inv','VAT','Total','Balance','Status','Notes'];
  const rows=recs.map(r=>{
    const invs=(r.invoices||[]).filter(i=>i.num&&i.num.trim());
    const bal=r.status==='pending'?r.reimp:r.status==='partial'?r.reimp-r.vatBill:0;
    return[r.name,r.code,r.site,r.vehicle,r.month,r.year,
      invs.map(i=>i.num).join(' | '),invs.map(i=>i.date).join(' | '),
      r.reimp,r.vatBill,r.woVat,(r.taxInv||0).toFixed(2),(r.vat||0).toFixed(2),r.total,bal,r.status,r.notes
    ].map(v=>`"${v??''}"`).join(',');
  });
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([[hdr.join(','),...rows].join('\n')],{type:'text/csv'}));
  a.download=`fueltrack-${mon||'all'}.csv`.replace(/ /g,'-');
  a.click(); toast('CSV exported!');
}

// ── HELPERS ────────────────────────────────────────────────────
function toggleEl(id){const el=document.getElementById(id);el.style.display=el.style.display==='none'?'block':'none';}

function confirmReset(){
  if(!confirm('ALL data delete karala reset wenawa — sure da?'))return;
  ['ftp3_r','ftp3_p','ftp3_v'].forEach(k=>localStorage.removeItem(k));
  location.reload();
}

function updateHdrStats() {
  const recs=gR().map(r=>({...r,status:getStatus(r)}));
  const pend=recs.filter(r=>r.status==='pending');
  const part=recs.filter(r=>r.status==='partial');
  const total=recs.reduce((s,r)=>s+(r.reimp||0),0);
  const bal=pend.reduce((s,r)=>s+r.reimp,0)+part.reduce((s,r)=>s+(r.reimp-r.vatBill),0);
  document.getElementById('hdrStats').innerHTML=`
    <div class="hstat"><div class="hstat-v">${fmtK(total)}</div><div class="hstat-l">Total Reimb.</div></div>
    <div class="hstat"><div class="hstat-v">${pend.length}</div><div class="hstat-l">No Invoice</div></div>
    <div class="hstat"><div class="hstat-v">${part.length}</div><div class="hstat-l">Partial</div></div>
    <div class="hstat"><div class="hstat-v">${fmtK(bal)}</div><div class="hstat-l">Balance Due</div></div>`;
  const mnths=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('hdrPill').textContent=mnths[new Date().getMonth()]+' '+new Date().getFullYear();
  // Update sidebar badge
  const pendBadge=document.getElementById('pendBadge');
  if (pendBadge){pendBadge.textContent=pend.length+part.length;pendBadge.dataset.n=pend.length+part.length;}
}

// ── SHAKE ANIMATION ────────────────────────────────────────────
const shakeStyle=document.createElement('style');
shakeStyle.textContent=`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`;
document.head.appendChild(shakeStyle);

// ── INIT ───────────────────────────────────────────────────────
function init() {
  seed();
  fillFilters();
  updateHdrStats();
  renderDash();
}
init();
