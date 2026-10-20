export const SESSION_JOURNAL_LIMIT=100;
export function ensureSessionJournal(club){
 club.sessionJournal??={version:1,entries:[]};return club.sessionJournal;
}
export function recordSessionJournal(club,entry){
 const journal=ensureSessionJournal(club);
 if(journal.entries.some(row=>row.sessionId===entry.sessionId))return false;
 journal.entries.push(structuredClone(entry));journal.entries=journal.entries.slice(-SESSION_JOURNAL_LIMIT);return true;
}
export function validateSessionJournal(club){
 const journal=ensureSessionJournal(club);
 if(journal.version!==1||!Array.isArray(journal.entries)||journal.entries.length>SESSION_JOURNAL_LIMIT||new Set(journal.entries.map(r=>r.sessionId)).size!==journal.entries.length)throw Error('Повреждён журнал партий.');
 for(const row of journal.entries){
  if(typeof row.sessionId!=='string'||!Number.isFinite(row.startedAt)||!Number.isFinite(row.endsAt)||row.endsAt>club.clock||row.endsAt<=row.startedAt||!Array.isArray(row.reviews)||!row.reviews.length||['payments','tips','wages'].some(k=>!Number.isFinite(row[k])||row[k]<0)||row.reviews.some(r=>!r.financial||['price','payment','tips'].some(k=>!Number.isFinite(r.financial[k])||r.financial[k]<0)))throw Error('Повреждён расчёт в журнале партий.');
 }
 return true;
}
