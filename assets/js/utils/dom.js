// Lightweight DOM helpers & skeleton utilities
export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

export function esc(str=''){
  return str.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

export function skeletonCards(count=6, cls='card'){
  let html='';
  for(let i=0;i<count;i++){
    html+=`<div class="${cls} skeleton" style="position:relative;overflow:hidden;background:var(--panel-flat);border:1px solid var(--panel-border);border-radius:26px;height:220px">
      <div class="shimmer"></div>
    </div>`;
  }
  return html;
}

export function showMessage(container, text, type='info'){
  container.innerHTML = `<div class="note" style="font-size:.65rem">${esc(text)}</div>`;
}

export function debounce(fn, ms=300){
  let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), ms);};
}

// Inject shimmer style once
if(!document.getElementById('skeleton-style')){
  const st=document.createElement('style'); st.id='skeleton-style';
  st.textContent=`.skeleton .shimmer{position:absolute;inset:0;
    background:linear-gradient(110deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.12) 40%,rgba(255,255,255,0) 80%);
    animation:shimmer 1.8s linear infinite;}
    @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
  `;
  document.head.appendChild(st);
}