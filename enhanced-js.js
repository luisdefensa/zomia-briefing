const DB='zomiaBriefingDB', STORE='drafts', KEY='briefing-v2';
const SERVER_ENDPOINT='https://script.google.com/macros/s/AKfycbxpbgVpFp-WSk5g4d6QWGl420QkKjSsmSnPk-ZyzWSxwPJHrE7_KZMjpBd1-L5Ptm0H/exec';
const form=document.getElementById('briefing');
const bar=document.getElementById('bar'), pct=document.getElementById('pct');
const status=document.getElementById('draftText'), notice=document.getElementById('success');
let timer=null, dirty=false;

function openDB(){return new Promise((ok,bad)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>bad(r.error)})}
async function idbPut(data){try{const db=await openDB();return new Promise((ok,bad)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put({data,at:Date.now()},KEY);t.oncomplete=ok;t.onerror=()=>bad(t.error)})}catch(e){}}
async function idbGet(){try{const db=await openDB();return new Promise((ok,bad)=>{const r=db.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>bad(r.error)})}catch(e){return null}}
async function idbDel(){try{const db=await openDB();return new Promise(ok=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(KEY);t.oncomplete=ok})}catch(e){}}
function lsPut(d){try{localStorage.setItem(KEY,JSON.stringify({data:d,at:Date.now()}))}catch(e){}}
function lsGet(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
function lsDel(){try{localStorage.removeItem(KEY)}catch(e){}}

function snap(){
 const d={};
 [...form.elements].forEach(x=>{if(!x.name)return;if(x.type==='checkbox'){d[x.name]??=[];if(x.checked)d[x.name].push(x.value)}else d[x.name]=x.value});
 return d;
}
function meaningful(d){return d&&Object.values(d).some(v=>Array.isArray(v)?v.length:String(v||'').trim())}
function apply(d){
 if(!d)return;
 [...form.elements].forEach(x=>{if(!x.name)return;if(x.type==='checkbox')x.checked=Array.isArray(d[x.name])&&d[x.name].includes(x.value);else if(d[x.name]!==undefined)x.value=d[x.name]});
 progress();
}
async function save(){
 const d=snap(); if(!meaningful(d))return;
 await idbPut(d); lsPut(d); dirty=true;
 status.innerHTML='<span style="color:#63e4ac;font-weight:700">✓ Borrador guardado automáticamente</span>';
}
function queue(){clearTimeout(timer);timer=setTimeout(save,300);progress()}
function progress(){
 const req=[...form.querySelectorAll('[required]')], a=req.filter(x=>x.value.trim()).length/Math.max(1,req.length);
 const checks=form.querySelectorAll('input[type=checkbox]:checked').length;
 const p=Math.min(100,Math.round(a*45+(checks?20:0)));
 bar.style.width=p+'%';pct.textContent=p+'%';
}
async function clearDraft(){await idbDel();lsDel();dirty=false}
async function restore(){
 const a=await idbGet(), b=lsGet(), best=a&&b?(a.at>=b.at?a:b):(a||b);
 if(best&&meaningful(best.data)){
   apply(best.data);
   const m=document.getElementById('modal'); if(m)m.classList.add('show');
 }
}
function noticeMsg(msg,ok=false){
 const n=document.getElementById('notice')||document.getElementById('success');
 if(!n)return;
 n.style.display='block';n.className='notice '+(ok?'ok':'err');n.innerHTML=msg;
}

// PDF Export Function
async function generatePDF() {
  const data = snap();
  if (!meaningful(data)) {
    noticeMsg('<b>⚠️ El formulario está vacío.</b><br>Completa al menos algunos campos antes de descargar.', false);
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(16);
    doc.setTextColor(45, 168, 255); // --blue color
    doc.text('ZomIA · Briefing Comercial', margin, yPosition);
    yPosition += 12;

    // Timestamp
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
    yPosition += 10;

    // Add a line separator
    doc.setDrawColor(113, 229, 255); // --cyan color
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Content sections
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    const sections = [
      { title: 'Datos Básicos', fields: ['empresa', 'contacto', 'telefono', 'email', 'localidad'] },
      { title: 'Servicios', fields: ['servicios'] },
      { title: 'Clientes', fields: ['clientes'] },
      { title: 'Zona de Trabajo', fields: ['zona_trabajo', 'zona_busqueda', 'recogida', 'in_situ', 'urgencias'] },
      { title: 'Diferenciación', fields: ['marcas', 'frecuentes', 'diferencia', 'garantia'] },
      { title: 'Objetivos', fields: ['objetivo', 'cliente_ideal', 'promocionar', 'no_publicar'] },
      { title: 'Observaciones', fields: ['observaciones'] }
    ];

    for (const section of sections) {
      // Section title
      doc.setFontSize(12);
      doc.setTextColor(45, 168, 255);
      doc.text(section.title, margin, yPosition);
      yPosition += 7;

      // Section content
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);

      for (const field of section.fields) {
        const value = data[field];
        if (value && String(value).trim()) {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          const fieldValue = Array.isArray(value) ? value.join(', ') : String(value);

          const splitText = doc.splitTextToSize(`${fieldName}: ${fieldValue}`, contentWidth - 10);
          for (const line of splitText) {
            if (yPosition + 5 > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          }
          yPosition += 2;
        }
      }

      if (yPosition + 8 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      } else {
        yPosition += 5;
      }
    }

    // Save PDF
    const empresa = data.empresa || 'briefing';
    const filename = `ZomIA_Briefing_${empresa.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(filename);

    noticeMsg(`<b>✅ PDF descargado correctamente.</b><br>Archivo: ${filename}`, true);
  } catch (err) {
    console.error('PDF Error:', err);
    noticeMsg(`<b>❌ Error al generar PDF.</b><br>${err.message}`, false);
  }
}

form.addEventListener('input',queue);form.addEventListener('change',queue);

const newBtn=document.getElementById('newBtn');
if(newBtn)newBtn.onclick=async()=>{if(confirm('¿Borrar el borrador y empezar de nuevo?')){await clearDraft();form.reset();progress()}};
const mc=document.getElementById('modalContinue'), mn=document.getElementById('modalNew');
if(mc)mc.onclick=()=>document.getElementById('modal').classList.remove('show');
if(mn)mn.onclick=async()=>{await clearDraft();form.reset();document.getElementById('modal').classList.remove('show');progress()};

// PDF Button Handler
const pdfBtn = document.getElementById('pdfBtn');
if (pdfBtn) {
  pdfBtn.onclick = async (e) => {
    e.preventDefault();
    await generatePDF();
  };
}

form.addEventListener('submit',async e=>{
 e.preventDefault(); await save();
 if(!form.reportValidity())return;
 if(!SERVER_ENDPOINT){
   noticeMsg('<b>El formulario está listo, pero aún falta conectar el destino de recepción.</b><br>Tus datos siguen guardados y no se han perdido.','err'); return;
 }
 try{
   const r=await fetch(SERVER_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(snap())});
   if(!r.ok)throw Error('HTTP '+r.status);
   await clearDraft();form.reset();progress();
   noticeMsg('<b>✅ Briefing enviado correctamente.</b><br>Hemos recibido la información.','ok');
 }catch(err){
   noticeMsg('<b>❌ No hemos podido enviar el briefing.</b><br>Tus respuestas siguen guardadas. Puedes volver a intentarlo sin rellenar el formulario de nuevo.','err');
 }
});
window.addEventListener('pagehide',()=>{if(meaningful(snap()))lsPut(snap())});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
restore();progress();
