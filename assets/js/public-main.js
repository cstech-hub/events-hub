// Public site main logic (events, announcements, winners, registration)
import {
  fetchEvents,
  fetchAnnouncements,
  fetchWinners,
  registerEvent,
  DEFAULT_WINNER_URL,
  sb
} from './utils/supabase.js';
import { fmt, within7Days, isToday } from './utils/date.js';
import { $, $$, esc, skeletonCards, debounce } from './utils/dom.js';
import './theme.js';

const upcomingRail = $('#upcomingRail');
const pastRail = $('#pastRail');
const announcementsRail = $('#announcementsRail');
const winnersRail = $('#winnersRail');
const winnerTicker = $('#winnerTicker');
const eventSearchInput = $('#eventSearch');
const winnerSearchInput = $('#winnerSearch');
const deptFilterSelect = $('#deptFilter');
const eventsGrid = $('#events-grid');
const winnersMini = $('#winners-mini');
const scrollHeader = document.querySelector('[data-scroll-header]');

let allEvents = [];
let upcomingEvents = [];
let pastEvents = [];
let announcementsList = [];
let allWinners = [];
let winnersByEvent = new Map();
let winnerTickerIndex = 0;
let winnerTickerTimer = null;
let currentEvent = null;

document.addEventListener('DOMContentLoaded', init);

async function init(){
  if(upcomingRail) upcomingRail.innerHTML = skeletonCards(4);
  if(pastRail) pastRail.innerHTML = skeletonCards(3);
  if(announcementsRail) announcementsRail.innerHTML = '<div class="loader"></div>';
  if(winnersRail) winnersRail.innerHTML = '<div class="loader"></div>';
  if(winnerTicker) winnerTicker.innerHTML = '<div class="loader"></div>';
  if(eventsGrid) eventsGrid.innerHTML = skeletonCards(6);
  if(winnersMini) winnersMini.innerHTML = '<div class="loader"></div>';
  setupScrollHeader();

  try {
    const [events, announcements, winners] = await Promise.all([
      fetchEvents(),
      fetchAnnouncements(),
      fetchWinners()
    ]);
    allEvents = events || [];
    announcementsList = announcements || [];
    allWinners = winners || [];
    winnersByEvent = groupWinnersByEvent(allWinners);

    splitEvents();
    renderDeptFilter();
    renderUpcoming();
    renderPast();
    renderAnnouncements();
    renderWinners();
    // Combined grid removed: using separate upcoming and past rails
    renderWinnersMini();
    attachInteractions();
    openHashEvent();
    updateStats(allEvents.length, announcementsList.length, allWinners.length);
    startWinnerTicker();
  } catch(e){
    const err = esc(e.message || '');
    if(upcomingRail) upcomingRail.innerHTML = `<div class="rail-empty">Events load error: ${err}</div>`;
    if(pastRail) pastRail.innerHTML = `<div class="rail-empty">Events load error: ${err}</div>`;
    if(announcementsRail) announcementsRail.innerHTML = `<div class="rail-empty">Announcements error: ${err}</div>`;
    if(winnersRail) winnersRail.innerHTML = `<div class="rail-empty">Winners error: ${err}</div>`;
    if(winnerTicker) winnerTicker.innerHTML = `<div class="rail-empty">Winners error: ${err}</div>`;
  }
}

function splitEvents(){
  const now = Date.now();
  upcomingEvents = [];
  pastEvents = [];
  allEvents.forEach(ev => {
    const evDate = ev.event_date ? new Date(ev.event_date) : null;
    const deleteAt = ev.delete_at ? new Date(ev.delete_at) : null;
    const isDeleted = deleteAt && deleteAt.getTime() <= now;
    if(isDeleted) return;
    if(evDate && evDate.getTime() >= now){
      upcomingEvents.push(ev);
    } else if(evDate){
      pastEvents.push(ev);
    } else {
      upcomingEvents.push(ev);
    }
  });
  upcomingEvents.sort((a,b)=>new Date(a.event_date||0) - new Date(b.event_date||0));
  pastEvents.sort((a,b)=>new Date(b.event_date||0) - new Date(a.event_date||0));
}

function renderDeptFilter(){
  if(!deptFilterSelect) return;
  const current = deptFilterSelect.value;
  const set = new Set();
  deptFilterSelect.innerHTML = '<option value="all">All Departments</option>';
  allEvents.forEach(ev => {
    if(ev.audience_type === 'department' && ev.target_department){
      set.add(ev.target_department);
    }
  });
  Array.from(set).sort((a,b)=>a.localeCompare(b)).forEach(dep => {
    const opt=document.createElement('option');
    opt.value=dep;
    opt.textContent=dep;
    deptFilterSelect.appendChild(opt);
  });
  if(current && (current === 'all' || set.has(current))){
    deptFilterSelect.value=current;
  }
}

function filteredEvents(list = upcomingEvents){
  const term=(eventSearchInput?.value||'').toLowerCase().trim();
  const chip=$('.chip.active')?.dataset.filter || 'all';
  const deptVal=deptFilterSelect ? deptFilterSelect.value : 'all';
  return list.filter(ev=>{
    if(deptVal!=='all'){
      if(!(ev.audience_type==='department' && (ev.target_department||'').toLowerCase()===deptVal.toLowerCase())){
        return false;
      }
    }
    if(term){
      const hay=`${ev.title||''} ${ev.description||''} ${ev.location||''}`.toLowerCase();
      if(!hay.includes(term)) return false;
    }
    const fee=Number(ev.fee||0);
    const d=ev.event_date?new Date(ev.event_date):null;
    if(chip==='free' && fee!==0) return false;
    if(chip==='today' && !(d && isToday(d))) return false;
    if(chip==='week' && !(d && within7Days(d))) return false;
    return true;
  });
}

function renderUpcoming(){
  const list = filteredEvents(upcomingEvents);
  if(upcomingRail){
    if(!list.length){
      upcomingRail.innerHTML = '<div class="rail-empty">No upcoming events match the filters.</div>';
    } else {
      upcomingRail.innerHTML = list.map(ev=>eventCard(ev)).join('');
    }
  }
}

function renderPast(){
  if(!pastRail) return;
  if(!pastEvents.length){
    pastRail.innerHTML = '<div class="rail-empty">No past events yet.</div>';
    return;
  }
  const list = filteredEvents(pastEvents);
  if(!list.length){
    pastRail.innerHTML = '<div class="rail-empty">No past events match the filters.</div>';
  } else {
    pastRail.innerHTML = list.map(ev=>eventCard(ev,{ past:true })).join('');
  }
}

function renderAnnouncements(){
  if(!announcementsRail) return;
  if(!announcementsList.length){
    announcementsRail.innerHTML = '<div class="rail-empty">No announcements yet.</div>';
    return;
  }
  announcementsRail.innerHTML = announcementsList.slice(0, 12).map(announcementCard).join('');
}

function renderEventsGrid(upcomingList){
  if(!eventsGrid) return;
  const upcoming = upcomingList ?? filteredEvents(upcomingEvents);
  const pastFiltered = filteredEvents(pastEvents);
  const combined = [...upcoming, ...pastFiltered];
  if(!combined.length){
    eventsGrid.innerHTML = '<div class="rail-empty">No events match the filters right now.</div>';
    return;
  }
  const pastIds = new Set(pastFiltered.map(ev=>ev.id));
  eventsGrid.innerHTML = combined.map(ev=>eventCard(ev,{ past: pastIds.has(ev.id) })).join('');
}

function announcementCard(a){
  const body=a.content||'';
  return `<article class="announcement-card" data-ann="${a.id}">
    <h3>${esc(a.title || 'Announcement')}</h3>
    <div class="announcement-meta"><span><i class="fa-regular fa-clock"></i> ${fmt(a.created_at,'MMM D, YYYY h:mm A')}</span></div>
    <div class="announcement-body">${esc(body.slice(0,220))}${body.length>220?'…':''}</div>
  </article>`;
}

function renderWinners(){
  if(!allWinners.length){
    if(winnersRail) winnersRail.innerHTML = '<div class="rail-empty">No winners yet.</div>';
    if(winnersMini) winnersMini.innerHTML = '<div class="rail-empty">No winners yet.</div>';
    return;
  }
  const q=(winnerSearchInput?.value||'').toLowerCase().trim();
  let list = allWinners;
  if(q){
    list = allWinners.filter(w=>{
      const hay = `${w.winner_name||''} ${w.position||''} ${(w.events?.title)||''}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if(!list.length){
    if(winnersRail) winnersRail.innerHTML = '<div class="rail-empty">No winners match the search.</div>';
    if(winnersMini) winnersMini.innerHTML = '<div class="rail-empty">No winners match the search.</div>';
    return;
  }
  if(winnersRail){
    winnersRail.innerHTML = list.slice(0,18).map(winnerCard).join('');
    winnersRail.querySelectorAll('.winner[data-win]').forEach(card=>{
      const act=()=>openWinnerModal(Number(card.dataset.win));
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.addEventListener('click', act);
      card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } });
    });
  }
  renderWinnersMini(list);
}

function eventCard(ev,{ past=false }={}){
  const fee=Number(ev.fee||0);
  const isFree = !fee;
  const badge = ev.audience_type==='department'
    ? `<span class="badge" style="background:linear-gradient(135deg,#ffb347,#ff8d3a);color:#422700">${esc(ev.target_department||'Dept')}</span>`
    : `<span class="badge" style="background:linear-gradient(135deg,#2edb84,#139a59);color:#042012">College</span>`;
  const img = ev.image_url || `https://picsum.photos/seed/event${ev.id}/720/480`;
  const eventDate = ev.event_date ? new Date(ev.event_date) : null;
  const winners = winnersByEvent.get(ev.id) || [];
  const buttons = past
    ? `<button class="btn-outline btn-small" data-action="detail" data-id="${ev.id}"><i class="fa-solid fa-eye"></i> Details</button>`
    : `<button class="btn btn-small" data-action="register" data-id="${ev.id}" data-title="${encodeURIComponent(ev.title||'')}"><i class="fa-solid fa-pen"></i> Register</button>
       <button class="btn-outline btn-small" data-action="detail" data-id="${ev.id}"><i class="fa-solid fa-eye"></i> Details</button>`;
  const status = past
    ? `<div class="event-status ${winners.length?'event-status--ok':'event-status--pending'}">
        ${winners.length ? `<i class="fa-solid fa-trophy"></i> ${winners.length} winner${winners.length>1?'s':''}` : '<i class="fa-regular fa-circle-check"></i> Event completed'}
      </div>`
    : '';
  const desc = ev.description||'';
  return `<div class="card event-card${past?' event-card--past':''}" data-detail="${ev.id}" data-past="${past}">
    <div class="card-media">
      <img loading="lazy" src="${img}" alt="${esc(ev.title||'Event banner')}">
      <span class="badge ${isFree?'free':'paid'}">${isFree?'FREE':'$'+fee.toFixed(2)}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${esc(ev.title||'Untitled')} ${badge}</h3>
      <div class="meta">
        <span><i class="fa-regular fa-calendar"></i> ${eventDate?fmt(eventDate,'MMM D'):'TBA'}</span>
        ${eventDate?`<span><i class="fa-regular fa-clock"></i> ${fmt(eventDate,'h:mm A')}</span>`:''}
        <span><i class="fa-solid fa-location-dot"></i> ${esc(ev.location||'TBA')}</span>
      </div>
      <p class="desc">${esc(desc.slice(0,140))}${desc.length>140?'…':''}</p>
      <div class="card-actions">${buttons}</div>
      ${status}
    </div>
  </div>`;
}

function winnerCard(w){
  const img = w.image_url || DEFAULT_WINNER_URL || `https://picsum.photos/seed/win${w.id}/500/400`;
  return `<div class=\"winner\" data-win=\"${w.id}\" role=\"button\" tabindex=\"0\" aria-label=\"View winner ${esc(w.winner_name||'')} details\">
    <img loading=\"lazy\" src=\"${img}\" alt=\"${esc(w.winner_name||'Winner')}\">\n    <div class=\"pos\">${esc(w.position||'')}</div>\n    <div class=\"name\">${esc(w.winner_name||'')}</div>\n    <div class=\"event\"><i class=\"fa-solid fa-trophy\"></i> ${esc(w.events?.title||'')}</div>\n  </div>`;
}

function renderWinnersMini(list){
  if(!winnersMini) return;
  const subset = list.slice(0, 60);
  winnersMini.innerHTML = subset.map(winnerCard).join('');
  winnersMini.querySelectorAll('.winner[data-win]').forEach(card=>{
    const act=()=>openWinnerModal(Number(card.dataset.win));
    card.addEventListener('click', act);
    card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } });
  });
}

function groupWinnersByEvent(list){
  const map=new Map();
  list.forEach(w=>{
    const bucket=map.get(w.event_id)||[];
    bucket.push(w);
    map.set(w.event_id,bucket);
  });
  return map;
}

function attachInteractions(){
  $$('.chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      $$('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      renderUpcoming(); renderPast();
    });
  });
  if(eventSearchInput){
    eventSearchInput.addEventListener('input', debounce(()=>{ renderUpcoming(); renderPast(); }, 250));
  }
  deptFilterSelect?.addEventListener('change', ()=>{ renderUpcoming(); renderPast(); });
  if(winnerSearchInput){
    winnerSearchInput.addEventListener('input', renderWinners); // immediate filtering
  }
  upcomingRail?.addEventListener('click', handleEventRailClick);
  pastRail?.addEventListener('click', handleEventRailClick);
  winnersRail?.addEventListener('click', onWinnerCardClick);
  winnersMini?.addEventListener('click', onWinnerCardClick);
  if(winnerTicker){
    const activate = ()=>{
      const targetId = winnerTicker.dataset.winId;
      if(targetId){
        location.href = `pages/winners.html#winner-${targetId}`;
      }else{
        location.href = 'pages/winners.html';
      }
    };
    winnerTicker.addEventListener('click', activate);
    winnerTicker.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        activate();
      }
    });
  }

  $$('[data-close-dialog]').forEach(b=>{ b.addEventListener('click',()=>b.closest('dialog')?.close()); });
  if(!document.__dlgCloseBound){
    document.addEventListener('click', e=>{
      const btn = e.target.closest('[data-close-dialog]');
      if(btn){ const dlg = btn.closest('dialog'); if(dlg && typeof dlg.close==='function') dlg.close(); }
    });
    document.addEventListener('keydown', e=>{
      if(e.key==='Escape'){
        const open = Array.from(document.querySelectorAll('dialog[open]'));
        const top = open[open.length-1];
        if(top) top.close();
      }
    });
    document.__dlgCloseBound = true;
  }

  const regForm = $('#regForm');
  if(regForm){
    regForm.addEventListener('submit', onRegisterSubmit);
  }
}

function setupScrollHeader(){
  if(!scrollHeader) return;
  let lastY = window.scrollY;
  let ticking = false;
  const threshold = 80;
  const update = ()=>{
    const currentY = window.scrollY;
    const goingDown = currentY > lastY && currentY > threshold;
    const allowHide = window.innerWidth <= 900;
    if(allowHide && goingDown){
      scrollHeader.classList.add('header-hidden');
    }else{
      scrollHeader.classList.remove('header-hidden');
    }
    lastY = currentY;
    ticking = false;
  };
  window.addEventListener('scroll', ()=>{
    if(!ticking){
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive:true });
  window.addEventListener('resize', ()=>{
    if(window.innerWidth > 900){
      scrollHeader.classList.remove('header-hidden');
    }
  });
  scrollHeader.addEventListener('focusin', ()=>{
    scrollHeader.classList.remove('header-hidden');
  });
}

function handleEventRailClick(e){
  const btn = e.target.closest('[data-action]');
  if(btn){
    const id = Number(btn.dataset.id);
    if(btn.dataset.action==='detail') openEventDetail(id);
    if(btn.dataset.action==='register') openRegModal(id, decodeURIComponent(btn.dataset.title||''));
    return;
  }
  const card = e.target.closest('[data-detail]');
  if(card){
    openEventDetail(Number(card.dataset.detail));
  }
}

function onWinnerCardClick(e){
  const card=e.target.closest('.winner[data-win]');
  if(!card) return;
  openWinnerModal(Number(card.dataset.win));
}

function openHashEvent(){
  const m=location.hash.match(/^#event-(\d+)$/);
  if(m) openEventDetail(Number(m[1]));
}

async function openEventDetail(id){
  let ev = allEvents.find(e=>e.id===id);
  if(!ev){
    try {
      const { data, error } = await sb.from('events').select('*').eq('id', id).single();
      if(error) throw error;
      ev = data;
    } catch {
      alert('Event not found');
      return;
    }
  }
  currentEvent = ev;
  // Preload the registration form so the static "Register" button (with inline showModal) works
  const regIdEl = $('#regEventId');
  if(regIdEl){
    regIdEl.value = ev.id;
    const titleEl = $('#regTitle');
    if(titleEl) titleEl.textContent = ev.title || '';
  }
  const box = $('#detailContent');
  if(box){
    const winners = winnersByEvent.get(ev.id) || [];
    const isPast = ev.event_date ? new Date(ev.event_date).getTime() < Date.now() : false;
    box.innerHTML = getEventDetailMarkup(ev, winners, isPast);
    const registerBtn = $('#detailRegisterBtn');
    if(registerBtn){
      if(isPast){
        registerBtn.style.display='none';
        registerBtn.onclick=null;
      }else{
        registerBtn.style.display='';
        registerBtn.onclick=()=>openRegModal(ev.id, ev.title||'');
      }
    }
  }
  $('#eventDetail')?.showModal();
}

function getEventDetailMarkup(ev, winners, isPast){
  const heroImg = ev.image_url || `https://picsum.photos/seed/eventhero${ev.id}/1000/480`;
  const fee = Number(ev.fee||0);
  const feeBadge = fee ? '$'+fee.toFixed(2) : 'FREE';
  const feeClass = fee ? 'paid' : 'free';
  const audienceBadge = ev.audience_type==='department'
    ? `<span class="badge" style="background:linear-gradient(135deg,#ffb347,#ff8d3a);color:#422700">${esc(ev.target_department||'Dept')}</span>`
    : `<span class="badge" style="background:linear-gradient(135deg,#2edb84,#139a59);color:#042012">College</span>`;
  const winnersBlock = isPast ? buildWinnersBlock(winners) : '';
  return `
    <img src="${heroImg}" alt="${esc(ev.title||'Event banner')}"
         style="width:100%;height:260px;object-fit:cover;border-radius:24px;margin-bottom:18px;box-shadow:0 8px 28px -12px rgba(0,0,0,.6)">
    <h2 style="margin:0 0 10px;font-size:1.45rem;font-weight:800">${esc(ev.title||'Event')}</h2>
    <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:.58rem;letter-spacing:1px;text-transform:uppercase;font-weight:600;color:var(--text-faint);margin-bottom:14px">
      <span><i class="fa-regular fa-calendar"></i> ${ev.event_date?fmt(ev.event_date,'MMM D, YYYY'):'TBA'}</span>
      ${ev.event_date?`<span><i class="fa-regular fa-clock"></i> ${fmt(ev.event_date,'h:mm A')}</span>`:''}
      <span><i class="fa-solid fa-location-dot"></i> ${esc(ev.location||'TBA')}</span>
      <span><span class="badge ${feeClass}">${feeBadge}</span></span>
      <span>${audienceBadge}</span>
    </div>
    <p style="margin:0;font-size:.74rem;line-height:1.6;color:var(--text-dim)">${esc(ev.description||'')}</p>
    ${winnersBlock}
  `;
}

function buildWinnersBlock(winners){
  if(!winners.length){
    return `<div class="detail-winners">
      <h4><i class="fa-regular fa-circle-check"></i> Event Completed</h4>
      <div class="detail-winners-empty">Event completed. Winners will be announced soon.</div>
    </div>`;
  }
  const items = winners.map(w=>{
    const img = w.image_url || DEFAULT_WINNER_URL || `https://picsum.photos/seed/win${w.id}/200/200`;
    const metaParts = [w.position, w.winner_class, w.winner_dept].filter(Boolean).map(part=>esc(part));
    return `<div class="detail-winners-item">
      <img src="${img}" alt="${esc(w.winner_name||'Winner')}">
      <span>
        <strong>${esc(w.winner_name||'')}</strong>
        ${metaParts.length?`<div style="font-size:.58rem;color:var(--text-faint);letter-spacing:.45px">${metaParts.join(' • ')}</div>`:''}
      </span>
    </div>`;
  }).join('');
  return `<div class="detail-winners">
    <h4><i class="fa-solid fa-trophy"></i> Winners</h4>
    <div class="detail-winners-list">${items}</div>
  </div>`;
}

function startWinnerTicker(){
  if(!winnerTicker) return;
  if(!allWinners.length){
    winnerTicker.innerHTML = '<div class="rail-empty">No winners yet.</div>';
    winnerTicker.dataset.winId='';
    return;
  }
  winnerTickerIndex = 0;
  updateWinnerTicker();
  clearInterval(winnerTickerTimer);
  if(allWinners.length>1){
    winnerTickerTimer = setInterval(()=>{
      winnerTickerIndex = (winnerTickerIndex+1) % allWinners.length;
      updateWinnerTicker();
    }, 6000);
  }
}

function updateWinnerTicker(){
  if(!winnerTicker) return;
  const w = allWinners[winnerTickerIndex];
  if(!w){
    winnerTicker.innerHTML = '<div class="rail-empty">No winners yet.</div>';
    winnerTicker.dataset.winId='';
    return;
  }
  const img = w.image_url || DEFAULT_WINNER_URL || `https://picsum.photos/seed/win${w.id}/600/400`;
  const metaParts = [];
  if(w.position) metaParts.push(`<span><i class="fa-solid fa-medal"></i> ${esc(w.position)}</span>`);
  if(w.events?.title) metaParts.push(`<span><i class="fa-solid fa-trophy"></i> ${esc(w.events.title)}</span>`);
  const snippetParts = [w.winner_class, w.winner_dept].filter(Boolean).map(part=>esc(part));
  const snippet = snippetParts.length ? snippetParts.join(' • ') : 'Tap to celebrate this champion.';
  winnerTicker.dataset.winId = String(w.id);
  winnerTicker.setAttribute('aria-label', `View winners page for ${w.winner_name || 'winner'}`);
  winnerTicker.innerHTML = `
    <figure><img loading="lazy" src="${img}" alt="${esc(w.winner_name||'Winner photo')}"></figure>
    <div class="winner-info">
      <h3>${esc(w.winner_name||'Winner')}</h3>
      <div class="winner-meta">${metaParts.join(' ') || '<span><i class="fa-solid fa-star"></i> Campus champion</span>'}</div>
      <p>${snippet}</p>
    </div>
    <i class="fa-solid fa-arrow-right-long winner-arrow" aria-hidden="true"></i>
  `;
}

function updateStats(evCt, anCt, winCt){
  const se=$('#stat-events'), sa=$('#stat-ann'), sw=$('#stat-win');
  if(se) se.textContent=evCt;
  if(sa) sa.textContent=anCt;
  if(sw) sw.textContent=winCt;
}

function openRegModal(id,title){
  $('#regEventId').value=id;
  $('#regTitle').textContent=title;
  $('#regDialog').showModal();
}

async function onRegisterSubmit(e){
  e.preventDefault();
  const form=e.target;
  let event_id=Number($('#regEventId').value);
  if(!event_id && currentEvent && currentEvent.id) event_id = currentEvent.id; // fallback if hidden field not set
  const name=$('#regName').value.trim();
  const email=$('#regEmail').value.trim();
  const clazz=$('#regClass').value.trim();
  const dept=$('#regDept').value.trim();
  const msg=$('#regMsg');
  const spin=$('#regSpin');
  msg.hidden=true; spin.hidden=false;
  form.querySelectorAll('input,button').forEach(el=>el.disabled=true);
  try{
    const res=await registerEvent(event_id,{student_name:name,student_email:email,student_class:clazz,student_dept:dept});
    if(res.ok){
      showRegMessage('Registration successful!', true);
      form.reset();
      setTimeout(()=>$('#regDialog').close(),1200);
    }else{
      if(res.error?.code==='23505') showRegMessage('Already registered.',false);
      else showRegMessage(res.error?.message||'Failed',false);
    }
  }catch(err){
    showRegMessage(err.message||'Network error',false);
  }finally{
    spin.hidden=true;
    form.querySelectorAll('input,button').forEach(el=>el.disabled=false);
  }
  function showRegMessage(t,ok){
    msg.hidden=false; msg.className='message '+(ok?'success':'error'); msg.textContent=t;
  }
}

function openWinnerModal(id){
  const w=allWinners.find(x=>x.id===id);
  if(!w) return;
  const img=w.image_url||DEFAULT_WINNER_URL||`https://picsum.photos/seed/win${w.id}/800/600`;
  const c=$('#winnerContent');
  c.innerHTML=`
    <img src="${img}" alt="${esc(w.winner_name || 'Winner')}" class="winner-modal-img">
    <div class="winner-modal-pos">${esc(w.position||'')}</div>
    <h2 class="winner-modal-title">${esc(w.winner_name||'')}</h2>
    <div class="winner-modal-meta">
      <span><i class="fa-solid fa-trophy"></i> ${esc(w.events?.title||'')}</span>
      ${w.winner_class?`<span><i class="fa-solid fa-graduation-cap"></i> ${esc(w.winner_class)}</span>`:''}
      ${w.winner_dept?`<span><i class="fa-solid fa-building-columns"></i> ${esc(w.winner_dept)}</span>`:''}
    </div>
    <div class="winner-modal-desc">
      Congratulations to <strong>${esc(w.winner_name || 'Winner')}</strong>${w.position?` for achieving <strong>${esc(w.position)}</strong>`:''} in <strong>${esc(w.events?.title||'the event')}</strong>.
    </div>`;
  $('#winnerDialog').showModal();
}