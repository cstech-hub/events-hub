// Admin Events Management (grid/list, search, dept audience)
import {
  fetchEvents, uploadToBucket, createEvent, updateEvent, deleteEvent
} from '../utils/supabase.js';
import { esc, debounce } from '../utils/dom.js';
import { initAdminPage } from './common.js';
import '../theme.js';

let allEvents = [];
let gridMode = true;

const listEl = document.getElementById('eventsList');
const form = document.getElementById('eventForm');
const searchInput = document.getElementById('adminEventSearch');
const gridBtn = document.getElementById('gridMode');
const listBtn = document.getElementById('listMode');
const msg = document.getElementById('msg');
const audienceSel = document.getElementById('audience_type');
const deptField = document.getElementById('deptField');
const targetDept = document.getElementById('target_department');
const saveBtn = document.getElementById('saveBtn');

document.addEventListener('DOMContentLoaded', async ()=>{
  await initAdminPage('events');
  audienceSel.addEventListener('change',()=> deptField.style.display = audienceSel.value==='department'?'':'none');
  gridBtn.addEventListener('click',()=>{gridMode=true; gridBtn.classList.add('active');listBtn.classList.remove('active'); render();});
  listBtn.addEventListener('click',()=>{gridMode=false; listBtn.classList.add('active');gridBtn.classList.remove('active'); render();});
  searchInput.addEventListener('input', debounce(render,250));
  form.addEventListener('submit', onSubmit);
  document.getElementById('resetBtn').addEventListener('click', ()=>{
    form.reset(); form.event_id.value=''; audienceSel.value='college'; deptField.style.display='none';
  });
  await loadEvents();
});

async function loadEvents(){
  listEl.innerHTML='<div class="loader"></div>';
  try{
    allEvents = await fetchEvents();
    render();
  }catch(e){
    listEl.innerHTML=`<div class="notice err">Failed: ${esc(e.message||'')}</div>`;
  }
}

function filtered(){
  const term=(searchInput.value||'').toLowerCase().trim();
  if(!term) return allEvents;
  return allEvents.filter(e=>
    (e.title||'').toLowerCase().includes(term) ||
    (e.description||'').toLowerCase().includes(term) ||
    (e.location||'').toLowerCase().includes(term) ||
    (e.target_department||'').toLowerCase().includes(term)
  );
}

function render(){
  const list = filtered();
  if(!list.length){
    listEl.innerHTML='<div class="notice ok">No events match.</div>';
    return;
  }
  if(gridMode){
    listEl.className='events-grid-admin';
    listEl.innerHTML = list.map(e=>{
      const badge = e.audience_type==='department'
        ? `<span style="background:linear-gradient(135deg,#ffb347,#ff8d3a);padding:4px 8px;border-radius:10px;font-size:.5rem;font-weight:700;color:#422700">${esc(e.target_department||'Dept')}</span>`
        : `<span style="background:linear-gradient(135deg,#2edb84,#139a59);padding:4px 8px;border-radius:10px;font-size:.5rem;font-weight:700;color:#042012">College</span>`;
      return `<div class="event-box">
        <h4 style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${esc(e.title)} ${badge}</h4>
        <div class="event-meta">
          <span>${new Date(e.event_date).toLocaleDateString()}</span>
          <span>${new Date(e.event_date).toLocaleTimeString()}</span>
          <span>${esc(e.location||'')}</span>
        </div>
        <div class="event-desc">${esc((e.description||'').slice(0,110))}${(e.description||'').length>110?'…':''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-soft btn-small" data-edit="${e.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger btn-small" data-del="${e.id}" data-img="${e.image_path||''}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  } else {
    listEl.className='events-list-admin';
    listEl.innerHTML = list.map(e=>{
      const badge = e.audience_type==='department'
        ? `<span style="background:linear-gradient(135deg,#ffb347,#ff8d3a);padding:4px 8px;border-radius:10px;font-size:.5rem;font-weight:700;color:#422700">${esc(e.target_department||'Dept')}</span>`
        : `<span style="background:linear-gradient(135deg,#2edb84,#139a59);padding:4px 8px;border-radius:10px;font-size:.5rem;font-weight:700;color:#042012">College</span>`;
      return `<div class="row">
        <div style="min-width:220px;display:flex;flex-direction:column;gap:4px">
          <strong style="display:flex;gap:8px;flex-wrap:wrap">${esc(e.title)} ${badge}</strong>
          <div style="color:var(--a-text-faint);font-size:.48rem">${new Date(e.event_date).toLocaleString()} · ${esc(e.location||'')}</div>
        </div>
        <div style="flex:1;font-size:.5rem;color:var(--a-text-dim)">${esc((e.description||'').slice(0,140))}${(e.description||'').length>140?'…':''}</div>
        <div style="display:flex;gap:8px">
          <button class="btn-outline btn-small" data-edit="${e.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger btn-small" data-del="${e.id}" data-img="${e.image_path||''}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  }
  attachRowButtons();
}

function attachRowButtons(){
  listEl.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click',()=>loadIntoForm(Number(b.dataset.edit)));
  });
  listEl.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click',()=>removeEvent(Number(b.dataset.del), b.dataset.img||''));
  });
}

function showMsg(text, ok=true){
  msg.style.display='';
  msg.textContent=text;
  msg.className='notice '+(ok?'ok':'err');
  setTimeout(()=>msg.style.display='none',2500);
}

async function removeEvent(id, imagePath){
  if(!confirm('Delete this event?')) return;
  try{
    await deleteEvent(id);
    showMsg('Deleted', true);
    allEvents = allEvents.filter(e=>e.id!==id);
    render();
  }catch(e){
    showMsg(e.message||'Delete failed',false);
  }
}

function loadIntoForm(id){
  const ev = allEvents.find(e=>e.id===id);
  if(!ev){showMsg('Event not found',false);return;}
  form.event_id.value=ev.id;
  form.title.value=ev.title||'';
  form.location.value=ev.location||'';
  form.event_date.value=ev.event_date?new Date(ev.event_date).toISOString().slice(0,16):'';
  form.fee.value=ev.fee||0;
  audienceSel.value=ev.audience_type||'college';
  deptField.style.display = audienceSel.value==='department' ? '' : 'none';
  targetDept.value=ev.target_department||'';
  form.description.value=ev.description||'';
  form.reg_link.value=ev.registration_link||'';
  form.delete_at.value=ev.delete_at?new Date(ev.delete_at).toISOString().slice(0,16):'';
  form.image.value='';
  window.scrollTo({top:0,behavior:'smooth'});
  showMsg('Loaded into form', true);
}

async function onSubmit(e){
  e.preventDefault();
  saveBtn.disabled=true;
  const id=form.event_id.value||null;
  const payload = {
    title: form.title.value.trim(),
    location: form.location.value.trim(),
    event_date: form.event_date.value?new Date(form.event_date.value).toISOString():null,
    fee: parseFloat(form.fee.value||'0'),
    description: form.description.value.trim(),
    registration_link: form.reg_link.value.trim() || null,
    delete_at: form.delete_at.value?new Date(form.delete_at.value).toISOString():null,
    audience_type: audienceSel.value,
    target_department: audienceSel.value==='department' ? (targetDept.value.trim() || null) : null
  };
  if(payload.audience_type==='department' && !payload.target_department){
    showMsg('Department code required',false); saveBtn.disabled=false; return;
  }
  const file=form.image.files[0];
  try{
    if(!id && !file) throw new Error('Banner image required for new event.');
    if(file){
      const ext=file.name.split('.').pop()||'jpg';
      const path=`banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url, path: p } = await uploadToBucket('event-images', path, file);
      payload.image_url = url;
      payload.image_path = p;
    }
    if(id){
      await updateEvent(Number(id), payload);
      const idx=allEvents.findIndex(e=>e.id===Number(id));
      if(idx>=0) allEvents[idx]={...allEvents[idx], ...payload};
      showMsg('Updated', true);
    }else{
      await createEvent(payload);
      showMsg('Created', true);
      // re-fetch minimal
      await loadEvents();
    }
    form.reset(); form.event_id.value='';
    audienceSel.value='college'; deptField.style.display='none';
    if(id) render();
  }catch(err){
    showMsg(err.message||'Save failed',false);
  }finally{
    saveBtn.disabled=false;
  }
}