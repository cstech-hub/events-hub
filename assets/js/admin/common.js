// Shared admin initialization (sidebar toggle, theme, guard)
import { guardAdmin } from '../auth.js';
import '../theme.js';

export async function initAdminPage(activeKey){
  await guardAdmin();
  const sidebar=document.getElementById('sidebar');
  const toggle=document.querySelector('.toggle-menu');
  if(window.innerWidth<900 && toggle) toggle.style.display='block';
  toggle?.addEventListener('click',()=>sidebar.classList.toggle('open'));
  document.querySelectorAll('.nav-admin a').forEach(a=>{
    if(a.getAttribute('href')?.includes(activeKey)) a.classList.add('active');
  });
}