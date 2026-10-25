/* Router, event, dan aksi */
const PAGES=[['dash','📊','Dashboard','Ringkasan usaha Glint'],['sales','🛒','Penjualan','Pesanan & status pengiriman'],['prod','⚗️','Produksi','Resep, HPP, dan batch'],['inv','📦','Inventori','Stok bahan & pembelian'],['fin','💰','Keuangan','Laba rugi, kas, balik modal'],['cus','👥','Pelanggan','Riwayat pembeli'],['rep','📑','Laporan','Ekspor & cadangan'],['set','⚙️','Pengaturan','Harga paket & data']];
let page=(location.hash||'#dash').slice(1);if(!V[page])page='dash';
function render(){
  const p=PAGES.find(x=>x[0]===page);document.title='Glint ERP · '+p[2];
  $('#title').textContent=p[2];$('#sub').textContent=p[3];
  $('#menu').innerHTML=PAGES.map(x=>`<a href="#${x[0]}" class="${x[0]===page?'on':''}"><span>${x[1]}</span>${x[2]}</a>`).join('');
  $('#actions').innerHTML={dash:'<button class="btn gold" data-act="neworder">+ Pesanan baru</button>',sales:'<button class="btn gold" data-act="neworder">+ Pesanan baru</button>',prod:'<button class="btn gold" data-act="mkprod">+ Produksi batch</button>',inv:'<button class="btn gold" data-act="buy">+ Pembelian</button>',fin:'<button class="btn gold" data-act="exp">+ Catat biaya</button>'}[page]||'';
  $('#view').innerHTML=V[page]();
  const q=$('#q');if(q)q.oninput=e=>{VIEW.q=e.target.value;$('#otbl').innerHTML=ordersTable()};
  const imp=$('#imp');if(imp)imp.onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d.mat||!d.orders)throw 0;DB.S=d;UI.toast('Data dipulihkan');render()}catch(x){UI.toast('File cadangan tidak valid',1)}})};
  const pf=$('#pf');if(pf)pf.onsubmit=e=>{e.preventDefault();DB.S.set.packs.forEach((p,i)=>p.p=+pf['p'+i].value||0);DB.S.set.price=DB.S.set.packs[0].p;DB.save();UI.toast('Harga disimpan');render()};
}
const done=r=>{UI.toast(r.msg,!r.ok);render()};
const field=(l,i)=>`<label>${l}</label>${i}`;
const A={
 close:()=>UI.close(),
 flt:b=>{VIEW.filter=b.dataset.v;render()},
 adv:b=>done(DB.advance(b.dataset.id)),
 can:b=>{if(confirm('Batalkan pesanan ini?'))done(DB.cancel(b.dataset.id))},
 rcp:b=>UI.receipt(DB.S.orders.find(o=>o.id===b.dataset.id)),
 wa:b=>{const o=DB.S.orders.find(x=>x.id===b.dataset.id),t={Baru:'sudah kami terima',Diproses:'sedang kami proses',Dikirim:'sedang dikirim',Selesai:'sudah selesai. Terima kasih!'}[o.status]||'';window.open('https://wa.me/'+UI.phone(o.phone)+'?text='+encodeURIComponent(`Halo ${o.customer}, pesanan Glint Anda (${o.qty} botol, ${rp(o.total)}) ${t}.`),'_blank','noopener')},
 neworder:()=>{
  const P=DB.S.set.packs;
  UI.modal('Pesanan baru',field('Nama pelanggan','<input name="c" required>')+field('Telepon / WhatsApp (opsional)','<input name="ph" inputmode="tel" placeholder="08xxxxxxxxxx">')+field('Paket','<select name="pk">'+P.map((p,i)=>`<option value="${i}">${p.n} · ${p.b} botol · ${rp(p.p)}</option>`).join('')+'</select>')+field('Jumlah paket','<input name="n" type="number" min="1" value="1" required>')+field('Channel','<select name="ch"><option>WhatsApp</option><option>Website</option><option>Kampus/Bazar</option><option>Marketplace</option></select>')+field('Catatan','<input name="note">')+'<p id="tot" class="total"></p>',f=>{
    const p=P[+f.pk],n=+f.n;DB.addOrder({customer:f.c.trim(),phone:f.ph,qty:p.b*n,total:p.p*n,channel:f.ch,note:f.note||p.n+' x'+n});UI.toast('Pesanan dibuat');render()});
  const upd=()=>{const f=$('#mf'),p=P[+f.pk.value],n=+f.n.value||1;$('#tot').innerHTML=`Total <b>${rp(p.p*n)}</b> · ${p.b*n} botol`};
  $('#mf').oninput=upd;upd();
 },
 mkprod:()=>{
  const S=DB.S;
  UI.modal('Produksi batch',field(`Jumlah botol (maks. ${DB.maxProd()})`,'<input name="q" type="number" min="1" value="1" required>')+'<div id="need"></div>',f=>{
    const r=DB.produce(+f.q);if(!r.ok){UI.toast(r.msg,1);return false}UI.toast(r.msg);render()},'Produksi');
  const upd=()=>{const q=+$('#mf').q.value||0;$('#need').innerHTML=S.bom.map(b=>{const x=DB.mat(b.id),n=b.q*q;return `<div class="fr"><span>${x.name}</span><b class="${x.stock<n?'neg-t':''}">${nf(n)} / ${nf(x.stock)} ${x.unit}</b></div>`}).join('')};
  $('#mf').oninput=upd;upd();
 },
 buy:b=>{
  const S=DB.S,sel=b.dataset&&b.dataset.id;
  UI.modal('Pembelian bahan',field('Bahan','<select name="m">'+S.mat.map(x=>`<option value="${x.id}" ${x.id===sel?'selected':''}>${x.name} (${x.unit})</option>`).join('')+'</select>')+field('Jumlah','<input name="q" type="number" step="any" min="0" required>')+field('Total harga (Rp)','<input name="t" type="number" min="0" required>')+field('Pemasok / toko','<input name="s">'),f=>{
    if(!(+f.q>0))return false;DB.buy(f.m,+f.q,+f.t,f.s);UI.toast('Stok bertambah');render()});
 },
 asset:()=>UI.modal('Tambah alat',field('Nama alat','<input name="n" required>')+field('Biaya (Rp)','<input name="c" type="number" min="0" required>'),f=>{DB.S.assets.unshift({id:'AS-'+Date.now(),date:DB.iso(),name:f.n,cost:+f.c});DB.save();UI.toast('Alat ditambahkan');render()}),
 exp:()=>UI.modal('Catat biaya',field('Kategori','<select name="k"><option>Iklan</option><option>Ongkir</option><option>Kemasan tambahan</option><option>Lainnya</option></select>')+field('Keterangan','<input name="d" required>')+field('Jumlah (Rp)','<input name="a" type="number" min="0" required>'),f=>{DB.addExpense(f.k,f.d,+f.a);UI.toast('Biaya dicatat');render()}),
 'csv-s':()=>UI.csv('penjualan-glint.csv',[['ID','Tanggal','Pelanggan','Telepon','Channel','Botol','Total','Status'],...DB.S.orders.map(o=>[o.id,dfmt(o.date),o.customer,o.phone,o.channel,o.qty,o.total,o.status])]),
 'csv-k':()=>UI.csv('buku-kas-glint.csv',[['Tanggal','Tipe','Kategori','Keterangan','Jumlah'],...DB.ledger().map(e=>[dfmt(e.date),e.type==='in'?'Masuk':'Keluar',e.cat,e.desc,e.amt])]),
 'csv-i':()=>UI.csv('inventori-glint.csv',[['Bahan','Satuan','Stok','Min','Harga/unit','Nilai'],...DB.S.mat.map(x=>[x.name,x.unit,x.stock,x.min,Math.round(x.cost),Math.round(x.stock*x.cost)])]),
 bk:()=>UI.download('glint-erp-cadangan.json',JSON.stringify(DB.S,null,2),'application/json'),
 demo:()=>{if(confirm('Ganti semua data dengan data demo?')){DB.demo();UI.toast('Data demo dimuat');render()}},
 reset:()=>{if(confirm('Hapus semua data dan kembali ke data awal?')){DB.reset();UI.toast('Data direset');render()}}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const f=A[b.dataset.act];if(f)f(b)});
$('#mf').addEventListener('submit',e=>{e.preventDefault();if(!UI._submit)return;const o={};new FormData(e.target).forEach((v,k)=>o[k]=v);if(UI._submit(o)!==false)UI.close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')UI.close()});
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(V[h]){page=h;render();scrollTo(0,0)}});
window.addEventListener('storage',()=>{DB.load();render()});
setInterval(()=>{$('#clock').textContent=new Date().toLocaleString('id-ID',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})},1000);
$('#clock').textContent=new Date().toLocaleString('id-ID',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
render();
