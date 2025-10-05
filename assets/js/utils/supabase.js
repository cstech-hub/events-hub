// Supabase minimal wrapper with timeouts + safe fallback for event_reg_counts view
export const SB_URL  = 'https://wyczfqogdbqxphvafjrq.supabase.co';
export const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5Y3pmcW9nZGJxeHBodmFmanJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDQ1MTQsImV4cCI6MjA3NDk4MDUxNH0.-_7vFaRdTjIyy5fQXe0hybNTdOIIQwEYdG8wZDdDU-c';

if(!window.supabase) throw new Error('Supabase library not loaded.');
export const sb = window.supabase.createClient(SB_URL, SB_ANON);

const DEFAULT_TIMEOUT = 15000;

async function withTimeout(promise, ms=DEFAULT_TIMEOUT){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  try {
    const res = await promise(ctrl.signal);
    clearTimeout(t);
    return res;
  } catch(e){
    clearTimeout(t);
    throw e.name === 'AbortError' ? new Error('Request timeout') : e;
  }
}

export async function fetchEvents(){
  const { data, error } = await sb
    .from('events')
    .select('id,title,description,event_date,location,fee,image_url,registration_link,audience_type,target_department')
    .order('event_date', { ascending: true });
  if(error) throw error;
  return data||[];
}

export async function fetchAnnouncements(){
  const { data, error } = await sb.from('announcements').select('*').order('created_at',{ascending:false});
  if(error) throw error;
  return data||[];
}

export async function fetchWinners(){
  const { data, error } = await sb
    .from('winners')
    .select('id,event_id,winner_name,winner_class,winner_dept,position,image_url,events(id,title)')
    .order('id',{ascending:false});
  if(error) throw error;
  return data||[];
}

export async function fetchEventCounts(){
  const { data, error } = await sb.from('event_reg_counts').select('*');
  if(!error) return data||[];
  if(error.code === '42P01'){ // view missing fallback
    const [{ data: events }, { data: regs }] = await Promise.all([
      sb.from('events').select('id,title'),
      sb.from('registrations').select('event_id')
    ]);
    const counts = {};
    (regs||[]).forEach(r=> counts[r.event_id]=(counts[r.event_id]||0)+1 );
    return (events||[]).map(e=>({ event_id: e.id, title: e.title, reg_count: counts[e.id]||0 }));
  }
  throw error;
}

export async function fetchRegistrationsForEvent(eventId){
  const { data, error } = await sb.from('registrations')
    .select('id,student_email,student_name,student_class,student_dept,created_at')
    .eq('event_id', eventId)
    .order('created_at',{ascending:false});
  if(error) throw error;
  return data||[];
}

export async function registerEvent(event_id, payload){
  if(!event_id || isNaN(event_id)) return { ok:false, error:{ message:'Missing event' } };
  const { error } = await sb.from('registrations').insert({ event_id, ...payload });
  if(error){
    if(error.code === '23505') return { ok:false, error:{ message:'Already registered' } };
    if(error.code === '23503') return { ok:false, error:{ message:'Event no longer exists' } };
    return { ok:false, error:{ message:'Registration failed' } };
  }
  return { ok:true };
}

export async function registrationsByEmail(email){
  const { data, error } = await sb.rpc('get_registrations_by_email',{ p_email: email });
  if(error) throw error;
  return data||[];
}

export async function createEvent(payload){
  const { error } = await sb.from('events').insert(payload);
  if(error) throw error;
}

export async function updateEvent(id, payload){
  const { error } = await sb.from('events').update(payload).eq('id', id);
  if(error) throw error;
}

export async function deleteEvent(id){
  const { error } = await sb.from('events').delete().eq('id', id);
  if(error) throw error;
}

export async function createAnnouncement(payload){
  const { error } = await sb.from('announcements').insert(payload);
  if(error) throw error;
}

export async function updateAnnouncement(id,payload){
  const { error } = await sb.from('announcements').update(payload).eq('id', id);
  if(error) throw error;
}

export async function deleteAnnouncement(id){
  const { error } = await sb.from('announcements').delete().eq('id', id);
  if(error) throw error;
}

export async function createWinner(payload){
  const { error } = await sb.from('winners').insert(payload);
  if(error) throw error;
}

export async function updateWinner(id,payload){
  const { error } = await sb.from('winners').update(payload).eq('id', id);
  if(error) throw error;
}

export async function deleteWinner(id){
  const { error } = await sb.from('winners').delete().eq('id', id);
  if(error) throw error;
}

export async function fetchRawEventsLite(){
  const { data, error } = await sb.from('events').select('id,title').order('event_date',{ascending:true});
  if(error) throw error;
  return data||[];
}

export async function getSession(){
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function changePassword(newPassword){
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if(error) throw error;
}

export async function uploadToBucket(bucket, path, file){
  const { error } = await sb.storage.from(bucket).upload(path, file);
  if(error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export const DEFAULT_WINNER_URL =
  sb.storage.from('winner').getPublicUrl('default-winner.png').data.publicUrl ||
  sb.storage.from('winner').getPublicUrl('default-winner').data.publicUrl || '';

export { withTimeout };