/* Data & logika bisnis Glint ERP (tanpa framework). Disimpan di localStorage. */
const DB=(function(){
  const K='glintERP_standalone_v1';
  const iso=(off=0)=>{const d=new Date();d.setDate(d.getDate()-off);return d.toISOString()};
  const RAW=[['ipa','IPA 70%','ml',250,20000,50],['aq','Aquadest','ml',1000,13000,200],['btl','Botol spray 50 ml','pcs',4,16602,2],['mf','Kain microfiber','pcs',6,7690,2],['lbl','Label stiker','pcs',41,10500,4]];
  const seed=()=>({
    set:{price:19000,packs:[{n:'Satuan',b:1,p:19000},{n:'Duo',b:2,p:35000},{n:'Trio',b:3,p:50000}]},
    mat:RAW.map(r=>({id:r[0],name:r[1],unit:r[2],stock:r[3],cost:r[4]/r[3],min:r[5]})),
    bom:[{id:'ipa',q:25},{id:'aq',q:25},{id:'btl',q:1},{id:'mf',q:1},{id:'lbl',q:2}],
    fg:0,
    purchases:RAW.map((r,i)=>({id:'PB-00'+(i+1),date:iso(),supplier:'Pembelian awal',mat:r[0],qty:r[3],total:r[4]})),
    assets:[{id:'AS-001',date:iso(),name:'Spuit (alat takar)',cost:10000}],
    expenses:[],prod:[],orders:[],seq:1
  });
  let S=load();
  function load(){try{const s=JSON.parse(localStorage.getItem(K));return s&&s.mat?s:seed()}catch(e){return seed()}}
  const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
  const uid=p=>p+'-'+String(S.seq++).padStart(4,'0');
  const mat=id=>S.mat.find(m=>m.id===id);
  const hpp=()=>S.bom.reduce((a,b)=>a+b.q*mat(b.id).cost,0);
  const maxProd=()=>Math.min(...S.bom.map(b=>Math.floor(mat(b.id).stock/b.q+1e-9)));
  const FLOW=['Baru','Diproses','Dikirim','Selesai'];

  function buy(id,qty,total,supplier,date){
    const m=mat(id);m.cost=(m.stock*m.cost+total)/(m.stock+qty);m.stock+=qty;
    S.purchases.unshift({id:uid('PB'),date:date||iso(),supplier:supplier||'-',mat:id,qty,total});save();
  }
  function produce(qty,date){
    const miss=S.bom.filter(b=>mat(b.id).stock<b.q*qty-1e-9).map(b=>mat(b.id).name);
    if(miss.length)return {ok:false,msg:'Bahan kurang: '+miss.join(', ')};
    const cost=qty*hpp();S.bom.forEach(b=>mat(b.id).stock-=b.q*qty);S.fg+=qty;
    S.prod.unshift({id:uid('PR'),date:date||iso(),qty,cost});save();return {ok:true,msg:qty+' botol berhasil diproduksi'};
  }
  function addOrder(o){S.orders.unshift({id:uid('ORD'),date:o.date||iso(),customer:o.customer,phone:o.phone||'',qty:o.qty,total:o.total,status:'Baru',channel:o.channel||'WhatsApp',note:o.note||'',ded:0});save()}
  function advance(id){
    const o=S.orders.find(x=>x.id===id),n=FLOW[FLOW.indexOf(o.status)+1];if(!n)return {ok:false,msg:'Sudah selesai'};
    if(n==='Dikirim'&&!o.ded){if(S.fg<o.qty)return {ok:false,msg:'Stok jadi kurang ('+S.fg+' botol). Produksi dulu.'};S.fg-=o.qty;o.ded=1}
    if(n==='Selesai'){o.cogs=o.qty*hpp();o.doneAt=iso()}
    o.status=n;save();return {ok:true,msg:'Status: '+n};
  }
  function cancel(id){const o=S.orders.find(x=>x.id===id);if(o.status==='Selesai')return {ok:false,msg:'Pesanan selesai tidak bisa dibatalkan'};if(o.ded){S.fg+=o.qty;o.ded=0}o.status='Batal';save();return {ok:true,msg:'Pesanan dibatalkan'}}
  function addExpense(cat,desc,amount,date){S.expenses.unshift({id:uid('EX'),date:date||iso(),cat,desc,amount});save()}

  function metrics(){
    const done=S.orders.filter(o=>o.status==='Selesai');
    const rev=done.reduce((a,o)=>a+o.total,0),cogs=done.reduce((a,o)=>a+(o.cogs||0),0);
    const buys=S.purchases.reduce((a,p)=>a+p.total,0),assets=S.assets.reduce((a,x)=>a+x.cost,0),opex=S.expenses.reduce((a,x)=>a+x.amount,0);
    const modal=buys+assets,out=modal+opex;
    return {rev,cogs,gross:rev-cogs,opex,net:rev-cogs-opex,buys,assets,modal,out,cash:rev-out,
      sold:done.reduce((a,o)=>a+o.qty,0),active:S.orders.filter(o=>FLOW.indexOf(o.status)<3&&o.status!=='Batal').length,
      stockVal:S.mat.reduce((a,m)=>a+m.stock*m.cost,0)+S.fg*hpp(),bep:Math.ceil(modal/S.set.price),recover:Math.min(1,rev/Math.max(1,out))};
  }
  function ledger(){
    const L=[];
    S.purchases.forEach(p=>L.push({date:p.date,type:'out',cat:'Pembelian bahan',desc:mat(p.mat).name+' x'+p.qty+' ('+p.supplier+')',amt:p.total}));
    S.assets.forEach(a=>L.push({date:a.date,type:'out',cat:'Peralatan',desc:a.name,amt:a.cost}));
    S.expenses.forEach(e=>L.push({date:e.date,type:'out',cat:e.cat,desc:e.desc,amt:e.amount}));
    S.orders.filter(o=>o.status==='Selesai').forEach(o=>L.push({date:o.doneAt||o.date,type:'in',cat:'Penjualan',desc:o.id+' · '+o.customer,amt:o.total}));
    return L.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }
  function demo(){
    S=seed();buy('btl',6,24900,'Toko kemasan');buy('mf',4,5127,'Toko kain');buy('lbl',20,5000,'Percetakan');produce(10);
    [['Rina','08123450001',2,35000,'Selesai',5,'WhatsApp'],['Dimas','08123450002',1,19000,'Selesai',4,'Kampus'],['Salsa','08123450003',3,50000,'Selesai',3,'Website'],['Bagas','08123450004',2,35000,'Selesai',2,'WhatsApp'],['Nadia','08123450005',1,19000,'Dikirim',1,'Marketplace'],['Fajar','08123450006',2,35000,'Diproses',0,'WhatsApp'],['Putri','08123450007',1,19000,'Baru',0,'Website']].forEach(r=>{
      addOrder({customer:r[0],phone:r[1],qty:r[2],total:r[3],channel:r[6]});const o=S.orders[0];
      while(o.status!==r[4])advance(o.id);o.date=iso(r[5]);if(o.doneAt)o.doneAt=iso(r[5]);
    });
    addExpense('Iklan','Iklan Instagram',15000,iso(3));save();
  }
  return {get S(){return S},set S(v){S=v;save()},save,seed,load:()=>{S=load()},mat,hpp,maxProd,FLOW,buy,produce,addOrder,advance,cancel,addExpense,metrics,ledger,demo,reset:()=>{S=seed();save()},iso};
})();
