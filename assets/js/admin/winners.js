/* PATCH: only change is row markup uses thumb-sm class (rest original rewrite) */
import {
  fetchWinners, fetchRawEventsLite, uploadToBucket,
  createWinner, updateWinner, deleteWinner, DEFAULT_WINNER_URL
} from '../utils/supabase.js';
import { esc, debounce } from '../utils/dom.js';
import { initAdminPage } from './common.js';
import '../theme.js';

let allWinners=[];
let eventsMap=new Map();

const listEl=document.getElementById('winList');
const form=document.getElementById('winForm');
const msg=document.getElementById('msg');
const saveBtn=document.getElementById('saveBtn');
const eventSelect=document.getElementById('event_id');
const searchInput=document.getElementById('adminWinnerSearch');

document.addEventListener('DOMContentLoaded', async ()=>{
  await initAdminPage('winners');
  form.addEventListener('submit', onSubmit);
  document.getElementById('resetBtn').addEventListener('click',()=>{form.win_id.value='';});
  if(searchInput){
    searchInput.addEventListener('input', debounce(render, 200));
  }
  await Promise.all([loadEventsLite(), loadWinners()]);
});

async function loadEventsLite(){
  const evs=await fetchRawEventsLite();
  eventsMap = new Map(evs.map(e=>[e.id, e.title]));
  eventSelect.innerHTML='<option value="" disabled selected>Select event...</option>'+
    evs.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('');
}

async function loadWinners(){
  listEl.innerHTML='<div class="loader"></div>';
  try{
    allWinners=await fetchWinners();
    if(searchInput) searchInput.value='';
    if(!allWinners.length){
      listEl.innerHTML='<div class="notice ok">No winners yet.</div>';
      return;
    }
    render();
  }catch(e){
    listEl.innerHTML=`<div class="notice err">Failed: ${esc(e.message||'')}</div>`;
  }
}

function render(){
  if(!allWinners.length){
    listEl.innerHTML='<div class="notice ok">No winners yet.</div>';
    return;
  }
  const list = filteredWinners();
  if(!list.length){
    listEl.innerHTML='<div class="notice ok">No winners match the search.</div>';
    return;
  }
  listEl.innerHTML = list.map(w=>{
    const img = w.image_url || DEFAULT_WINNER_URL;
    return `<div class="row">
      <div style="display:flex;gap:14px">
        <img src="${img}" alt="" class="thumb-sm" onerror="this.style.display='none'">
        <div class="winner-meta">
          <strong style="font-size:.7rem">${esc(w.winner_name)}</strong>
          <span style="font-size:.5rem;color:var(--a-text-faint)">${esc(w.position||'')}</span>
        </div>
      </div>
      <div style="flex:1;font-size:.55rem;color:var(--a-text-dim);min-width:120px">${esc(eventsMap.get(w.event_id)||'')}</div>
      <div>
        <button class="btn-outline btn-small" data-edit="${w.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-danger btn-small" data-del="${w.id}" data-img="${w.image_path||''}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
  attachRowButtons();
}

function filteredWinners(){
  const term=(searchInput?.value||'').toLowerCase().trim();
  if(!term) return allWinners;
  return allWinners.filter(w=>{
    const hay=[
      w.winner_name||'',
      w.position||'',
      w.winner_class||'',
      w.winner_dept||'',
      eventsMap.get(w.event_id)||''
    ].join(' ').toLowerCase();
    return hay.includes(term);
  });
}

function attachRowButtons(){
  listEl.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>loadIntoForm(Number(b.dataset.edit))));
  listEl.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>removeWinner(Number(b.dataset.del), b.dataset.img||'')));
}

function showMsg(text, ok=true){
  msg.style.display='';
  msg.textContent=text;
  msg.className='notice '+(ok?'ok':'err');
  setTimeout(()=>msg.style.display='none',2500);
}

function loadIntoForm(id){
  const w=allWinners.find(x=>x.id===id);
  if(!w){showMsg('Not found',false);return;}
  form.win_id.value=w.id;
  form.event_id.value=w.event_id||'';
  form.winner_name.value=w.winner_name||'';
  form.winner_class.value=w.winner_class||'';
  form.winner_dept.value=w.winner_dept||'';
  form.position.value=w.position||'';
  form.delete_at.value=w.delete_at?new Date(w.delete_at).toISOString().slice(0,16):'';
  form.image.value='';
  window.scrollTo({top:0,behavior:'smooth'});
  showMsg('Loaded',true);
}

async function removeWinner(id){
  if(!confirm('Delete winner?')) return;
  try{
    await deleteWinner(id);
    allWinners=allWinners.filter(w=>w.id!==id);
    render();
    showMsg('Deleted',true);
  }catch(e){
    showMsg(e.message||'Delete failed',false);
  }
}

async function onSubmit(e){
  e.preventDefault();
  saveBtn.disabled=true;
  const id=form.win_id.value||null;
  const payload={
    event_id: Number(form.event_id.value),
    winner_name: form.winner_name.value.trim(),
    winner_class: form.winner_class.value.trim(),
    winner_dept: form.winner_dept.value.trim(),
    position: form.position.value.trim(),
    delete_at: form.delete_at.value ? new Date(form.delete_at.value).toISOString() : null
  };
  const file=form.image.files[0];
  try{
    if(file){
      const ext=file.name.split('.').pop()||'jpg';
      const path=`winners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url, path: p } = await uploadToBucket('winner', path, file);
      payload.image_url=url;
      payload.image_path=p;
    } else if(!id){
      payload.image_url=DEFAULT_WINNER_URL;
    }
    if(id){
      await updateWinner(Number(id), payload);
      const idx=allWinners.findIndex(w=>w.id===Number(id));
      if(idx>=0) allWinners[idx]={...allWinners[idx], ...payload};
      showMsg('Updated',true);
    }else{
      await createWinner(payload);
      showMsg('Added',true);
      await loadWinners();
    }
    form.reset(); form.win_id.value='';
    if(id) render();
  }catch(err){
    showMsg(err.message||'Save failed',false);
  }finally{
    saveBtn.disabled=false;
  }
}