export function fmt(date, pattern='MMM D, YYYY'){
  const d=new Date(date); if(isNaN(d.getTime())) return '';
  const mm=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MMMM=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const pad=n=>String(n).padStart(2,'0');
  return pattern
    .replace(/YYYY/g, d.getFullYear().toString())
    .replace(/MMMM/g, MMMM[d.getMonth()])
    .replace(/MMM/g, mm[d.getMonth()])
    .replace(/MM/g, pad(d.getMonth()+1))
    .replace(/DD/g, pad(d.getDate()))
    .replace(/D(?![a-z])/g, d.getDate().toString())
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()))
    .replace(/h/g, ((d.getHours()%12)||12).toString())
    .replace(/A/g, d.getHours()<12?'AM':'PM');
}
export function isToday(dt){
  return new Date(dt).toDateString()===new Date().toDateString();
}
export function within7Days(dt){
  const t=new Date(dt).getTime(), now=Date.now(), week=7*24*60*60*1000;
  return t>=now && t<= now+week;
}