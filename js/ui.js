/* Helper tampilan: format, modal, toast, cetak nota, CSV */
const $=(s,r=document)=>r.querySelector(s);
const rp=n=>(n<0?'-':'')+'Rp'+Math.round(Math.abs(n)).toLocaleString('id-ID');
const nf=n=>(+n).toLocaleString('id-ID',{maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dfmt=d=>new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
const dshort=d=>new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
const UI={
  toast(m,err){const t=$('#toast');t.textContent=m;t.className='toast show'+(err?' err':'');clearTimeout(UI._t);UI._t=setTimeout(()=>t.className='toast',3000)},
  modal(title,html,onSubmit,okText='Simpan'){
    $('#mt').textContent=title;
    $('#mf').innerHTML=html+`<div class="btns"><button type="button" class="btn ghost" data-act="close">Batal</button><button class="btn gold">${okText}</button></div>`;
    $('#modal').classList.add('open');UI._submit=onSubmit;const f=$('#mf input,#mf select');f&&f.focus();
  },
  close(){$('#modal').classList.remove('open');UI._submit=null},
  csv(name,rows){const c=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');UI.download(name,'\ufeff'+c,'text/csv')},
  download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)},
  phone(p){p=String(p||'').replace(/\D/g,'');return p.startsWith('0')?'62'+p.slice(1):p},
  receipt(o){
    const w=window.open('','_blank','width=420,height=640');if(!w)return UI.toast('Izinkan pop-up untuk mencetak nota',1);
    w.document.write(`<title>Nota ${esc(o.id)}</title><body style="font-family:Arial;padding:24px;max-width:340px;margin:auto"><h2 style="margin:0">Glint ✦</h2><small>Screen N Lens Cleaner 50 ml</small><hr><p><b>${esc(o.id)}</b><br>${dfmt(o.date)}<br>Pelanggan: ${esc(o.customer)}</p><table style="width:100%"><tr><td>Glint 50 ml x${o.qty}</td><td style="text-align:right">${rp(o.total)}</td></tr></table><hr><p style="font-size:18px"><b>Total ${rp(o.total)}</b></p><small>Terima kasih. Clean. Clear. Glint.</small><script>setTimeout(()=>print(),300)<\/script></body>`);w.document.close();
  }
};
