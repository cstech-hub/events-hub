import { initAdminPage } from './common.js';
import { debounce } from '../utils/dom.js';
import '../theme.js';

const listEl=document.getElementById('adminList');
const form=document.getElementById('addAdminForm');
const msg=document.getElementById('adminMsg');
const typeSel=document.getElementById('type');
const expiryField=document.getElementById('expiryField');
const refreshBtn=document.getElementById('refreshAdmins');
const searchInput=document.getElementById('adminUserSearch');

let adminUsers=[];

document.addEventListener('DOMContentLoaded', async ()=>{
  await initAdminPage('users');
  typeSel.addEventListener('change',()=> expiryField.style.display = typeSel.value==='temporary' ? '' : 'none');
  form.addEventListener('submit',onSubmit);
  refreshBtn.addEventListener('click', loadAdmins);
  loadAdmins();
  document.getElementById('pwForm').addEventListener('submit', onPassword);
  searchInput?.addEventListener('input', debounce(renderAdmins, 200));
});

function show(el,text,ok=true){
  el.style.display=''; el.textContent=text;
  el.className='notice '+(ok?'ok':'err');
  setTimeout(()=>{el.style.display='none'},2500);
}

async function loadAdmins(){
  listEl.innerHTML='<div class="loader"></div>';
  try{
    const base = window.supabaseUrl || (window.supabase?.createClient().restUrl.replace('/rest/v1',''));
    const res=await fetch(`${base}/functions/v1/admin-users`);
    const json=await res.json();
    if(!res.ok) throw new Error(json.error||'Failed');
    adminUsers=json.users||[];
    renderAdmins();
  }catch(e){
    listEl.innerHTML=`<div class="notice err">Load error: ${escapeHtml(e.message||'')}</div>`;
  }
}

function renderAdmins(){
  if(!adminUsers.length){
    listEl.innerHTML='<div class="notice ok">No admins yet.</div>';
    return;
  }
  const list=filteredAdmins();
  if(!list.length){
    listEl.innerHTML='<div class="notice ok">No admins match the search.</div>';
    return;
  }
  listEl.innerHTML=`<div style="overflow:auto"><table>
    <thead><tr><th>Email</th><th>Type</th><th>Expires</th><th>Created</th><th>Action</th></tr></thead>
    <tbody>
      ${list.map(u=>{
        const meta=u.app_metadata||{};
        const type=meta.admin_type||'permanent';
        const exp=meta.admin_expires_at?new Date(meta.admin_expires_at).toLocaleString():'—';
        return `<tr>
          <td>${escapeHtml(u.email||'')}</td>
          <td>${escapeHtml(type)}</td>
          <td>${escapeHtml(exp)}</td>
          <td>${new Date(u.created_at).toLocaleString()}</td>
          <td><button class="btn-danger btn-small" data-del="${u.id}"><i class="fa-solid fa-user-minus"></i></button></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>`;
  listEl.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>removeAdmin(b.dataset.del)));
}

function filteredAdmins(){
  const term=(searchInput?.value||'').toLowerCase().trim();
  if(!term) return adminUsers;
  return adminUsers.filter(u=>{
    const meta=u.app_metadata||{};
    const hay=[
      u.email||'',
      meta.admin_type||'',
      meta.admin_expires_at?new Date(meta.admin_expires_at).toLocaleString():'',
    ].join(' ').toLowerCase();
    return hay.includes(term);
  });
}

async function onSubmit(e){
  e.preventDefault();
  show(msg,'Creating...');
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  const type=document.getElementById('type').value;
  const expires=document.getElementById('expires_at').value;
  if(type==='temporary' && !expires){ show(msg,'Expiry required',false); return; }
  try{
    const base = window.supabaseUrl || (window.supabase?.createClient().restUrl.replace('/rest/v1',''));
    const r=await fetch(`${base}/functions/v1/admin-users`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ email, password, type, expiresAt: type==='temporary'?expires:undefined })
    });
    const j=await r.json();
    if(!r.ok) throw new Error(j.error||'Create failed');
    show(msg,'Created',true);
    form.reset(); expiryField.style.display='none';
    loadAdmins();
  }catch(err){
    show(msg,err.message||'Failed',false);
  }
}

async function removeAdmin(id){
  if(!confirm('Delete this admin?')) return;
  try{
    const base = window.supabaseUrl || (window.supabase?.createClient().restUrl.replace('/rest/v1',''));
    const r=await fetch(`${base}/functions/v1/admin-users`,{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ id })
    });
    const j=await r.json();
    if(!r.ok) throw new Error(j.error||'Delete failed');
    loadAdmins();
  }catch(e){
    alert(e.message||'Delete error');
  }
}

async function onPassword(e){
  e.preventDefault();
  const pw=document.getElementById('newPw').value;
  const pwMsg=document.getElementById('pwMsg');
  show(pwMsg,'Updating...');
  try{
    const sb=window.supabase.createClient();
    const { error } = await sb.auth.updateUser({ password: pw });
    if(error) throw error;
    e.target.reset();
    show(pwMsg,'Updated!',true);
  }catch(err){
    show(pwMsg,err.message||'Failed',false);
  }
}

function escapeHtml(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}