// Theme (shared)
const KEY = 'ceh-theme';
export function setTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(KEY, mode);
  document.querySelectorAll('.theme-toggle').forEach(b=>{
    b.innerHTML = mode === 'dark'
      ? '<i class="fa-solid fa-sun"></i> Light'
      : '<i class="fa-solid fa-moon"></i> Dark';
  });
}
export function initTheme(){
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark':'light'));
  document.addEventListener('click',e=>{
    const t=e.target.closest('.theme-toggle'); if(!t) return;
    const m=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    setTheme(m);
  });
}
if(typeof window!=='undefined'){initTheme();}