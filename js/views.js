/* Tampilan tiap modul */
const kpi=(l,v,s,c='')=>`<div class="kpi ${c}"><span>${l}</span><b>${v}</b><small>${s||''}</small></div>`;
const card=(t,b,x='')=>`<div class="card ${x}">${t?`<h4>${t}</h4>`:''}${b}</div>`;
const chip=s=>`<span class="chip ${{Selesai:'ok',Batal:'bad',Dikirim:'info',Diproses:'warn',Baru:'warn'}[s]||''}">${s}</span>`;
const empty=t=>`<p class="empty">${t}</p>`;
const VIEW={filter:'Semua',q:''};

function revBars(){
  const S=DB.S,days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d)}
  const vals=days.map(d=>S.orders.filter(o=>o.status==='Selesai').filter(o=>{const x=new Date(o.doneAt||o.date);x.setHours(0,0,0,0);return +x===+d}).reduce((a,o)=>a+o.total,0));
  const mx=Math.max(...vals,1);
  return `<div class="bars">${vals.map((v,i)=>`<div><em>${v?Math.round(v/1000)+'rb':''}</em><i style="height:${Math.max(3,v/mx*100)}%"></i><span>${days[i].toLocaleDateString('id-ID',{weekday:'short'})}</span></div>`).join('')}</div>`;
}
function ordersRows(list,full){
  if(!list.length)return `<tr><td colspan="8">${empty('Belum ada pesanan.')}</td></tr>`;
  return list.map(o=>{const nx=DB.FLOW[DB.FLOW.indexOf(o.status)+1];
    return `<tr><td><b>${esc(o.id)}</b></td><td>${dshort(o.date)}</td><td>${esc(o.customer)}<small>${esc(o.channel)}${o.note?' · '+esc(o.note):''}</small></td><td>${o.qty}</td><td>${rp(o.total)}</td><td>${chip(o.status)}</td>${full?`<td class="acts">${nx?`<button class="btn sm gold" data-act="adv" data-id="${o.id}">→ ${nx}</button>`:''}${o.phone?`<button class="btn sm ghost" data-act="wa" data-id="${o.id}" title="Chat WhatsApp">WA</button>`:''}<button class="btn sm ghost" data-act="rcp" data-id="${o.id}">Nota</button>${nx?`<button class="btn sm red" data-act="can" data-id="${o.id}">Batal</button>`:''}</td>`:''}</tr>`}).join('');
}
function ordersTable(){
  let l=DB.S.orders;if(VIEW.filter!=='Semua')l=l.filter(o=>o.status===VIEW.filter);
  const q=VIEW.q.toLowerCase();if(q)l=l.filter(o=>(o.customer+o.id+o.channel).toLowerCase().includes(q));
  return `<table><tr><th>ID</th><th>Tgl</th><th>Pelanggan</th><th>Botol</th><th>Total</th><th>Status</th><th></th></tr>${ordersRows(l,true)}</table>`;
}

const V={
dash(){
  const S=DB.S,m=DB.metrics(),st={};S.orders.forEach(o=>st[o.status]=(st[o.status]||0)+1);
  const low=S.mat.filter(x=>x.stock<=x.min);
  const tot=S.orders.length||1,cols={Baru:'#d6b25e',Diproses:'#e8c36a',Dikirim:'#5b8dd6',Selesai:'#2e9f7a',Batal:'#c4565e'};
  let acc=0;const conic=Object.keys(st).length?Object.keys(st).map(k=>{const a=acc;acc+=st[k]/tot*100;return `${cols[k]} ${a}% ${acc}%`}).join(','):'#e7e1cf 0 100%';
  return `<div class="kpis">${kpi('Pendapatan',rp(m.rev),m.sold+' botol terjual')}${kpi('Laba bersih',rp(m.net),'setelah HPP & biaya',m.net<0?'neg':'')}${kpi('Stok barang jadi',S.fg+' botol','kapasitas produksi: '+DB.maxProd()+' botol')}${kpi('Pesanan aktif',m.active,'belum selesai')}</div>
  <div class="grid2">${card('Pendapatan 7 hari terakhir',revBars())}${card('Status pesanan',`<div class="donut-w"><div class="donut" style="background:conic-gradient(${conic})"><b>${S.orders.length}</b></div><ul class="legend">${Object.keys(st).map(k=>`<li><i style="background:${cols[k]}"></i>${k} <b>${st[k]}</b></li>`).join('')||'<li>Belum ada pesanan</li>'}</ul></div>`)}</div>
  <div class="grid2">${card('Stok bahan',S.mat.map(x=>{const p=Math.min(100,x.stock/(x.min*4)*100);return `<div class="srow"><span>${x.name}</span><div class="meter ${x.stock<=x.min?'low':''}"><i style="width:${p}%"></i></div><b>${nf(x.stock)} ${x.unit}</b></div>`}).join('')+(low.length?low.map(x=>`<div class="alert">⚠ ${x.name} menipis (min. ${x.min} ${x.unit})</div>`).join(''):''))}
  ${card('Balik modal',`<p class="muted">Total pengeluaran ${rp(m.out)} (modal ${rp(m.modal)} + biaya ${rp(m.opex)})</p><div class="meter big"><i style="width:${m.recover*100}%"></i></div><p><b>${Math.round(m.recover*100)}%</b> tertutup pendapatan · BEP sekitar <b>${m.bep} botol</b> dari modal</p>`)}</div>
  ${card('Pesanan terbaru',`<table><tr><th>ID</th><th>Tgl</th><th>Pelanggan</th><th>Botol</th><th>Total</th><th>Status</th></tr>${ordersRows(S.orders.slice(0,5),false)}</table>`,'scroll')}`;
},
sales(){
  const f=['Semua',...DB.FLOW,'Batal'];
  return `<div class="toolbar"><div class="tabs">${f.map(x=>`<button class="${VIEW.filter===x?'on':''}" data-act="flt" data-v="${x}">${x}</button>`).join('')}</div><input id="q" type="search" placeholder="Cari pelanggan / ID" value="${esc(VIEW.q)}"></div>
  ${card('',`<div id="otbl">${ordersTable()}</div><p class="muted s">Alur: Baru → Diproses → Dikirim (stok jadi berkurang) → Selesai (tercatat sebagai pendapatan & HPP).</p>`,'scroll')}`;
},
prod(){
  const S=DB.S,h=DB.hpp();
  return `<div class="grid2">${card('Resep (BOM) per botol 50 ml',S.bom.map(b=>{const x=DB.mat(b.id);return `<div class="fr"><span>${x.name}</span><b>${nf(b.q)} ${x.unit} · ${rp(b.q*x.cost)}</b></div>`}).join('')+`<div class="fr tot"><span>HPP per botol</span><b>${rp(h)}</b></div><div class="fr"><span>Harga jual</span><b>${rp(S.set.price)}</b></div><div class="fr"><span>Laba kotor per botol</span><b>${rp(S.set.price-h)} (${Math.round((S.set.price-h)/S.set.price*100)}%)</b></div>`)}
  ${card('Kapasitas produksi',`<div class="big-n">${DB.maxProd()}<small> botol</small></div><p class="muted">Dihitung dari stok bahan yang paling terbatas.</p>${S.bom.map(b=>{const x=DB.mat(b.id),n=Math.floor(x.stock/b.q+1e-9);return `<div class="fr"><span>${x.name}</span><b class="${n===DB.maxProd()?'gold-t':''}">${n} botol</b></div>`}).join('')}<p style="margin-top:16px"><button class="btn gold" data-act="mkprod">+ Produksi batch</button></p>`)}</div>
  ${card('Riwayat produksi',S.prod.length?`<table><tr><th>ID</th><th>Tanggal</th><th>Jumlah</th><th>Biaya bahan</th></tr>${S.prod.map(p=>`<tr><td>${p.id}</td><td>${dfmt(p.date)}</td><td>${p.qty} botol</td><td>${rp(p.cost)}</td></tr>`).join('')}</table>`:empty('Belum ada produksi.'),'scroll')}`;
},
inv(){
  const S=DB.S;
  return `${card('Stok bahan & kemasan',`<table><tr><th>Bahan</th><th>Stok</th><th>Min.</th><th>Harga/unit</th><th>Nilai</th><th>Status</th><th></th></tr>${S.mat.map(x=>`<tr><td>${x.name}</td><td>${nf(x.stock)} ${x.unit}</td><td>${x.min}</td><td>${rp(x.cost)}</td><td>${rp(x.stock*x.cost)}</td><td>${x.stock<=x.min?'<span class="chip bad">Menipis</span>':'<span class="chip ok">Aman</span>'}</td><td><button class="btn sm gold" data-act="buy" data-id="${x.id}">+ Beli</button></td></tr>`).join('')}</table><p class="muted s">Barang jadi: <b>${S.fg} botol</b> · Nilai persediaan total: <b>${rp(DB.metrics().stockVal)}</b></p>`,'scroll')}
  <div class="grid2">${card('Riwayat pembelian',`<table><tr><th>Tgl</th><th>Bahan</th><th>Jumlah</th><th>Total</th></tr>${S.purchases.slice(0,12).map(p=>`<tr><td>${dshort(p.date)}</td><td>${DB.mat(p.mat).name}<small>${esc(p.supplier)}</small></td><td>${nf(p.qty)}</td><td>${rp(p.total)}</td></tr>`).join('')}</table>`,'scroll')}
  ${card('Peralatan (aset)',`<table><tr><th>Tgl</th><th>Nama</th><th>Biaya</th></tr>${S.assets.map(a=>`<tr><td>${dshort(a.date)}</td><td>${esc(a.name)}</td><td>${rp(a.cost)}</td></tr>`).join('')}</table><p style="margin-top:14px"><button class="btn ghost" data-act="asset">+ Tambah alat</button></p>`,'scroll')}</div>`;
},
fin(){
  const m=DB.metrics(),L=DB.ledger();
  return `<div class="kpis">${kpi('Pendapatan',rp(m.rev))}${kpi('Laba kotor',rp(m.gross),'pendapatan - HPP')}${kpi('Laba bersih',rp(m.net),'setelah biaya '+rp(m.opex),m.net<0?'neg':'')}${kpi('Arus kas bersih',rp(m.cash),'masuk - keluar',m.cash<0?'neg':'')}</div>
  <div class="grid2">${card('Laba rugi',`<div class="fr"><span>Pendapatan</span><b>${rp(m.rev)}</b></div><div class="fr"><span>HPP barang terjual</span><b>- ${rp(m.cogs)}</b></div><div class="fr tot"><span>Laba kotor</span><b>${rp(m.gross)}</b></div><div class="fr"><span>Biaya (iklan, ongkir, dll)</span><b>- ${rp(m.opex)}</b></div><div class="fr tot"><span>Laba bersih</span><b>${rp(m.net)}</b></div>`)}
  ${card('Modal & balik modal',`<div class="fr"><span>Pembelian bahan</span><b>${rp(m.buys)}</b></div><div class="fr"><span>Peralatan</span><b>${rp(m.assets)}</b></div><div class="fr tot"><span>Total modal</span><b>${rp(m.modal)}</b></div><div class="meter big"><i style="width:${m.recover*100}%"></i></div><p class="muted s">Pendapatan menutup ${Math.round(m.recover*100)}% dari total pengeluaran. BEP modal sekitar ${m.bep} botol.</p>`)}</div>
  ${card('Buku kas',L.length?`<table><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th class="r">Masuk</th><th class="r">Keluar</th></tr>${L.map(e=>`<tr><td>${dshort(e.date)}</td><td>${e.cat}</td><td>${esc(e.desc)}</td><td class="r in">${e.type==='in'?rp(e.amt):''}</td><td class="r out">${e.type==='out'?rp(e.amt):''}</td></tr>`).join('')}</table>`:empty('Belum ada transaksi.'),'scroll')}`;
},
cus(){
  const mp={};DB.S.orders.forEach(o=>{if(o.status==='Batal')return;const c=mp[o.customer]=mp[o.customer]||{n:0,b:0,t:0,ph:o.phone,last:o.date};c.n++;c.b+=o.qty;c.t+=o.total;if(o.phone)c.ph=o.phone});
  const k=Object.keys(mp).sort((a,b)=>mp[b].t-mp[a].t);
  return card('Daftar pelanggan',k.length?`<table><tr><th>Nama</th><th>Telepon</th><th>Pesanan</th><th>Botol</th><th>Total belanja</th><th></th></tr>${k.map(n=>`<tr><td><b>${esc(n)}</b>${mp[n].n>1?' <span class="chip ok">Langganan</span>':''}</td><td>${esc(mp[n].ph||'-')}</td><td>${mp[n].n}</td><td>${mp[n].b}</td><td>${rp(mp[n].t)}</td><td>${mp[n].ph?`<a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/${UI.phone(mp[n].ph)}">WA</a>`:''}</td></tr>`).join('')}</table>`:empty('Belum ada pelanggan.'),'scroll');
},
rep(){
  return `<div class="grid2">${card('Ekspor laporan (CSV)',`<p class="muted">Buka di Excel atau Google Sheets.</p><div class="stack"><button class="btn ghost" data-act="csv-s">Penjualan</button><button class="btn ghost" data-act="csv-k">Buku kas</button><button class="btn ghost" data-act="csv-i">Inventori</button></div>`)}
  ${card('Cadangan data',`<p class="muted">Data tersimpan di browser ini. Simpan cadangan sebelum ganti perangkat.</p><div class="stack"><button class="btn gold" data-act="bk">Unduh cadangan (JSON)</button><label class="btn ghost">Pulihkan cadangan<input type="file" id="imp" accept=".json" hidden></label></div>`)}</div>`;
},
set(){
  const S=DB.S;
  return `<div class="grid2">${card('Harga paket',`<form id="pf">${S.set.packs.map((p,i)=>`<div class="fr"><span>${p.n} (${p.b} botol)</span><input name="p${i}" type="number" min="0" value="${p.p}"></div>`).join('')}<p style="margin-top:14px"><button class="btn gold">Simpan harga</button></p></form>`)}
  ${card('Data',`<p class="muted">Perhatian: reset menghapus semua data ERP di browser ini.</p><div class="stack"><button class="btn ghost" data-act="demo">Muat data demo</button><button class="btn red" data-act="reset">Reset ke data awal</button></div>`)}</div>`;
}};
