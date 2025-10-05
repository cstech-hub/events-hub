// Admin guard + expiry enforcement
import { getSession, changePassword as sbChangePassword, sb } from './utils/supabase.js';

let logoutHandlerAttached = false;

export async function guardAdmin(){
  const session = await getSession();
  if(!session?.user){
    location.href='../login.html';
    return null;
  }
  const md=session.user.app_metadata||{};
  if(md.admin_type==='temporary' && md.admin_expires_at){
    if(new Date(md.admin_expires_at).getTime()<Date.now()){
      alert('Temporary admin access expired.');
      try {
        await sb.auth.signOut();
      } catch(err){
        console.error('Failed to sign out expired admin session', err);
      }
      redirectToLogin();
      return null;
    }
  }
  const emailEl=document.getElementById('adminEmail');
  if(emailEl) emailEl.textContent=session.user.email||'Admin';
  const logoutBtn=document.getElementById('logout');
  if(logoutBtn && !logoutHandlerAttached){
    logoutBtn.addEventListener('click', handleLogout);
    logoutHandlerAttached = true;
  }
  return session;
}

export async function changePassword(newPass){
  await sbChangePassword(newPass);
}

async function handleLogout(event){
  event.preventDefault();
  const button = event.currentTarget;
  if(button.dataset.loading==='true') return;
  const original = button.innerHTML;
  button.dataset.loading='true';
  button.disabled = true;
  button.setAttribute('aria-busy','true');
  button.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span class="spinner" aria-hidden="true"></span> Logging out…</span>';
  try {
    await sb.auth.signOut();
  } catch(err){
    console.error('Logout failed', err);
    alert('Logout failed. Please try again.');
    button.disabled = false;
    button.removeAttribute('aria-busy');
    delete button.dataset.loading;
    button.innerHTML = original;
    return;
  }
  redirectToLogin(button.dataset.redirect);
}

function redirectToLogin(path){
  const fallback = path || '../login.html';
  try {
    const target = new URL(fallback, window.location.href);
    window.location.href = target.toString();
  } catch {
    window.location.href = '../login.html';
  }
}