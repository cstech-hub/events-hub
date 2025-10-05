import { fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../utils/supabase.js';
import { esc } from '../utils/dom.js';
import { initAdminPage } from './common.js';
import '../theme.js';

let allAnns=[];
const listEl=document.getElementById('annList');
const form=document.getElementById('annForm');
const msg=document.getElementById('msg');
const saveBtn=document.getElementById('saveBtn');

document.addEventListener('DOMContentLoaded', async ()=>{
  await initAdminPage('announcements');
  form.addEventListener('submit', onSubmit);
  document.getElementById('resetBtn').addEventListener('click',()=>{form.ann_id.value='';});
  load();
});

async function load(){
  listEl.innerHTML='<div class="loader"></div>';
  try{
    allAnns=await fetchAnnouncements();
    if(!allAnns.length){
      listEl.innerHTML='<div class="notice ok">No announcements.</div>';
      return;
    }
    render();
  }catch(e){
    listEl.innerHTML=`<div class="notice err">Failed: ${esc(e.message||'')}</div>`;
  }
}

function render(){
  listEl.innerHTML = allAnns.map(a=>`
    <div class="row">
      <div style="min-width:200px">
        <strong>${esc(a.title)}</strong>
        <div style="color:var(--a-text-faint);font-size:.5rem;margin-top:4px">${new Date(a.created_at).toLocaleString()}</div>
      </div>
      <div style="flex:1;font-size:.55rem;color:var(--a-text-dim);max-width:340px;line-height:1.3">${esc(a.content||'')}</div>
      <div style="display:flex;gap:8px">
        <button class="btn-outline btn-small" data-edit="${a.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-danger btn-small" data-del="${a.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
  attachBtns();
}

function attachBtns(){
  listEl.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>loadIntoForm(Number(b.dataset.edit))));
  listEl.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>removeAnn(Number(b.dataset.del))));
}

function showMsg(text, ok=true){
  msg.style.display='';
  msg.textContent=text;
  msg.className='notice '+(ok?'ok':'err');
  setTimeout(()=>msg.style.display='none',2500);
}

function loadIntoForm(id){
  const a=allAnns.find(x=>x.id===id);
  if(!a){showMsg('Not found',false);return;}
  form.ann_id.value=a.id;
  form.title.value=a.title||'';
  form.content.value=a.content||'';
  showMsg('Loaded',true);
  window.scrollTo({top:0,behavior:'smooth'});
}

async function removeAnn(id){
  if(!confirm('Delete announcement?')) return;
  try{
    await deleteAnnouncement(id);
    allAnns=allAnns.filter(a=>a.id!==id);
    render();
    showMsg('Deleted',true);
  }catch(e){
    showMsg(e.message||'Delete failed',false);
  }
}

async function onSubmit(e){
  e.preventDefault();
  saveBtn.disabled=true;
  const id=form.ann_id.value||null;
  const title=form.title.value.trim();
  const content=form.content.value.trim();
  try{
    if(id){
      await updateAnnouncement(Number(id), { title, content });
      const idx=allAnns.findIndex(a=>a.id===Number(id));
      if(idx>=0) allAnns[idx]={...allAnns[idx], title, content};
      showMsg('Updated',true);
    }else{
      await createAnnouncement({ title, content });
      showMsg('Created',true);
      await load();
    }
    form.reset(); form.ann_id.value='';
    if(id) render();
  }catch(err){
    showMsg(err.message||'Save failed',false);
  }finally{
    saveBtn.disabled=false;
  }
}