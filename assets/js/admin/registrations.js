import { fetchEventCounts, fetchRegistrationsForEvent, deleteEvent } from '../utils/supabase.js'; // deleteEvent not used here (safe ignore)
import { esc, debounce } from '../utils/dom.js';
import { initAdminPage } from './common.js';
import '../theme.js';

let counts=[];
let currentEvent=null;
let currentReg=[];
let regHeaderBase='Registrations';

const eventList=document.getElementById('eventList');
const regList=document.getElementById('regList');
const regHeader=document.getElementById('regHeader');
const exportCurrent=document.getElementById('exportCurrent');
const exportAll=document.getElementById('exportAll');
const eventSearchInput=document.getElementById('adminRegEventSearch');
const regSearchInput=document.getElementById('adminRegSearch');

document.addEventListener('DOMContentLoaded', async ()=>{
  await initAdminPage('registrations');
  loadEvents();
  exportCurrent.addEventListener('click', exportCurrentEvent);
  exportAll.addEventListener('click', exportAllEvents);
  eventSearchInput?.addEventListener('input', debounce(renderEventList, 200));
  regSearchInput?.addEventListener('input', debounce(renderRegs, 200));
});

async function loadEvents(){
  eventList.innerHTML='<div class="loader"></div>';
  try{
    counts = await fetchEventCounts();
    if(eventSearchInput) eventSearchInput.value='';
    if(!counts.length){
      eventList.innerHTML='<div class="notice ok">No events.</div>'; return;
    }
    renderEventList();
  }catch(e){
    eventList.innerHTML=`<div class="notice err">Failed: ${esc(e.message||'')}</div>`;
  }
}

function renderEventList(){
  const list = filteredEvents();
  if(!counts.length){
    eventList.innerHTML='<div class="notice ok">No events.</div>';
    return;
  }
  if(!list.length){
    eventList.innerHTML='<div class="notice ok">No events match the search.</div>';
    return;
  }
  eventList.innerHTML = list.map(c=>`
    <button class="row" data-eid="${c.event_id}" style="cursor:pointer;text-align:left">
      <div>
        <strong style="font-size:.75rem">${esc(c.title)}</strong>
        <div style="color:var(--a-text-faint);font-size:.5rem;margin-top:4px">${c.reg_count} registrations</div>
      </div>
    </button>
  `).join('');
  eventList.querySelectorAll('[data-eid]').forEach(b=>b.addEventListener('click',()=>selectEvent(Number(b.dataset.eid))));
}

async function selectEvent(eventId){
  const meta = counts.find(c=>c.event_id===eventId);
  currentEvent=meta;
  exportCurrent.disabled=false;
  regHeaderBase = `Registrations for "${meta.title}" (Total: ${meta.reg_count})`;
  regHeader.textContent = regHeaderBase;
  regList.innerHTML='<div class="loader"></div>';
  if(regSearchInput) regSearchInput.value='';
  try{
    currentReg = await fetchRegistrationsForEvent(eventId);
    if(!currentReg.length){
      regList.innerHTML='<div class="notice ok">No registrations yet.</div>';
      return;
    }
    renderRegs();
  }catch(e){
    regList.innerHTML=`<div class="notice err">Failed: ${esc(e.message||'')}</div>`;
  }
}

function renderRegs(){
  if(!currentReg.length){
    regHeader.textContent = regHeaderBase;
    regList.innerHTML='<div class="notice ok">No registrations yet.</div>';
    return;
  }
  const list = filteredRegistrations();
  const term=(regSearchInput?.value||'').trim();
  regHeader.textContent = term
    ? `${regHeaderBase} • Showing ${list.length} match${list.length===1?'':'es'}`
    : regHeaderBase;
  if(!list.length){
    regList.innerHTML='<div class="notice ok">No registrations match the search.</div>';
    return;
  }
  regList.innerHTML = list.map(r=>`
    <div class="row">
      <div style="min-width:180px">
        <strong>${esc(r.student_name||r.student_email)}</strong>
        <div style="font-size:.5rem;color:var(--a-text-faint);margin-top:4px">${esc(r.student_email)}</div>
        <div style="font-size:.48rem;color:var(--a-text-faint);margin-top:4px">${esc(r.student_class||'')} · ${esc(r.student_dept||'')}</div>
      </div>
      <div style="font-size:.48rem;color:var(--a-text-faint)">${new Date(r.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

function filteredEvents(){
  const term=(eventSearchInput?.value||'').toLowerCase().trim();
  if(!term) return counts;
  return counts.filter(c=> (c.title||'').toLowerCase().includes(term));
}

function filteredRegistrations(){
  const term=(regSearchInput?.value||'').toLowerCase().trim();
  if(!term) return currentReg;
  return currentReg.filter(r=>{
    const hay=[
      r.student_name||'',
      r.student_email||'',
      r.student_class||'',
      r.student_dept||''
    ].join(' ').toLowerCase();
    return hay.includes(term);
  });
}

function exportCurrentEvent(){
  if(!currentEvent) return;
  const rows=currentReg.map(r=>({
    ID:r.id,Event:currentEvent.title,Name:r.student_name,Email:r.student_email,
    Class:r.student_class,Department:r.student_dept,RegisteredAt:new Date(r.created_at).toLocaleString()
  }));
  toXLSX(rows, `registrations_${sanitize(currentEvent.title)}.xlsx`);
}

async function exportAllEvents(){
  const sb=window.supabase.createClient();
  const { data, error } = await sb.from('registrations').select('id,event_id,student_name,student_email,student_class,student_dept,created_at');
  if(error){alert('Export failed');return;}
  const titleMap=new Map(counts.map(c=>[c.event_id,c.title]));
  const rows=(data||[]).map(r=>({
    ID:r.id,
    Event:titleMap.get(r.event_id)||'',
    Name:r.student_name,
    Email:r.student_email,
    Class:r.student_class,
    Department:r.student_dept,
    RegisteredAt:new Date(r.created_at).toLocaleString()
  }));
  toXLSX(rows,'registrations_all.xlsx');
}

function toXLSX(rows, filename){
  if(!rows.length){alert('No data');return;}
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}
function sanitize(s=''){return s.replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase();}