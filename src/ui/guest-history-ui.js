import {visibleGuestHistory,visibleDemand} from '../model/guests-history.js';
import {QUESTIONS} from '../data/club.js';
import {guestWaitingSummary} from '../model/guest-waiting.js';
import {clockText} from '../model/lifecycle.js';
import {escape as esc} from './map.js';
const when=at=>Number.isFinite(at)?clockText(at)+(at<24?' · день 1':''):'время не записано';
const duration=hours=>{const minutes=Math.max(0,Math.round(hours*60)),h=Math.floor(minutes/60),m=minutes%60;return[h?`${h} ч`:'',m?`${m} мин`:''].filter(Boolean).join(' ')||'меньше минуты';};
const age=(at,now)=>Number.isFinite(at)&&Number.isFinite(now)?now<=at?'только что':duration(now-at)+' назад':'давность неизвестна';
const currentOnly=new Set(['time','boundaries','avoidGenres']);
export const answerDateText=(answer,clock)=>`Ответ: ${when(answer?.at)} · ${age(answer?.at,clock)}`;

// Read only the sentence the player actually heard, never the hidden schedule.
export function heardDeadline(reply){
 const match=(reply??'').match(/Сегодня могу до (\d{1,2}):(\d{2})(?: \(день (\d+)\))?/);
 if(!match||Number(match[1])>23||Number(match[2])>59)return null;
 return(Number(match[3]??1)-1)*24+Number(match[1])+Number(match[2])/60;
}
export function guestVisitHTML(club,guest){
 const history=club&&visibleGuestHistory(club,guest),answers=history?.currentAnswers??guest.dialogue;
 const time=answers.find(a=>a.questionId==='time'),deadline=heardDeadline(time?.reply),remaining=deadline===null||!club?null:deadline-club.clock;
 const timing=!time?'Сегодняшний срок ещё не уточнён.':remaining===null?'Названную длительность смотрите в ответе ниже.':remaining<=0?`Названное время (${when(deadline)}) уже прошло. Гость пока ждёт вашего решения.`:`По услышанному ответу — до ${when(deadline)}; осталось ${duration(remaining)}.`;
 const restrictions=[['boundaries','Темы, которые исключаем'],['avoidGenres','Нежелательные жанры']].map(([id,title])=>{
  const answer=answers.find(a=>a.questionId===id);
  return `<li><b>${title}:</b> ${answer?!Number.isFinite(answer.at)?'ответ этого визита есть, но давность не записана; актуальность не подтверждена':club.clock-answer.at>24?'ответ получен больше суток назад; перед партией актуальное согласие не подтверждено':'уточнены в этом визите':'ещё не уточнены в этом визите'}.${answer?` <small>${esc(answerDateText(answer,club?.clock))}</small>`:''}</li>`;
 }).join('');
 return `<section class="guest-memory guest-current-visit"><h3>Этот визит</h3><p>Услышано вопросов: ${new Set(guest.dialogue.map(a=>a.questionId)).size} из ${QUESTIONS.length}.</p><p class="guest-current-deadline">${esc(timing)}</p><ul>${restrictions}</ul><p><small>Прошлые ответы не заменяют сегодняшних договорённостей. Срок включает ожидание; пересадка его не продлевает.</small></p></section>`;
}

export function guestWaitingHTML(club,guest){
 if(!club?.layout)return '';
 const waiting=guestWaitingSummary(club,guest);
 const position=waiting.inGame?'Сейчас играет; ожидание больше не накапливается.':waiting.seat?waiting.seat.gameChair?'Сейчас сидит за игровым столом и ждёт начала.':'Сейчас сидит на месте в зоне ожидания.':'Сейчас ждёт стоя: свободного доступного места нет.';
 const elapsed=`Всего ожидания до игры: ${duration(waiting.totalHours)}.`;
 const observed=waiting.legacyHours>0?`Из этого ${duration(waiting.legacyHours)} до обновления учтено по старому правилу. Физическое место за этот период не записывалось, поэтому точную разбивку сидя и стоя не показываем.`:`Сидя: ${duration(waiting.seatedHours)}. Стоя: ${duration(waiting.standingHours)}.`;
 return `<section class="guest-memory guest-waiting"><h3>Ожидание и место</h3><p>${position}</p><p>${elapsed} ${observed}</p><small>Учитывается место этого гостя. Одна лавка не означает, что сидели все посетители.</small></section>`;
}

export function guestHistoryHTML(club,guest){
 const history=club&&visibleGuestHistory(club,guest);if(!history||!history.played&&!history.returning)return '';
 const answers=history.knownAnswers.map(a=>{
  const learnedLater=a.questionId==='knowledge'&&history.recent.some(r=>Number.isFinite(a.at)&&r.at>a.at);
  const caution=currentOnly.has(a.questionId)?'Прошлый визит — уточните в этом визите.':learnedLater?'После этого ответа была ещё игра: знание правил могло измениться.':'Ответ из прошлого визита.';
  return `<p><b>${esc(QUESTIONS.find(q=>q.id===a.questionId)?.text??'Разговор')}</b><br><small>Разговор: ${esc(when(a.at))} · ${esc(age(a.at,club.clock))}<br>${caution}</small><br>${esc(a.reply)}</p>`;
 }).join('');
 return `<section class="guest-memory"><h3>${history.returning?'Снова в клубе':'История в клубе'}</h3><p>Визитов: ${history.visits}. Сыграно: ${history.played}.${history.favorite?` Особенно понравилось: «${esc(history.favorite.title)}».`:''}</p>${history.recent.length?`<details><summary>Прошлые игры и отзывы</summary>${history.recent.slice().reverse().map(r=>`<p><b>«${esc(r.title)}» · ${r.score}/10</b><br><small>Игра: ${esc(when(r.at))}</small><br>Мастер: ${esc(r.masterName)}. ${esc(r.text)}</p>`).join('')}</details>`:''}${answers?`<details><summary>Что рассказывал в прошлые визиты</summary>${answers}<small>Это прошлые ответы, а не обещание на сегодняшний вечер. Свободное время, исключённые темы и нежелательные жанры уточните заново; после новой партии человек мог лучше познакомиться с правилами.</small></details>`:''}</section>`;
}

export function demandHTML(club){
 const demand=visibleDemand(club),list=(rows,empty,limit=6)=>rows.length?`<ul>${rows.slice(0,limit).map(r=>`<li>${esc(r.name??r.id)} <b>${r.count}</b><br><small>${Number.isFinite(r.lastHeardAt)?`Последний ответ: ${esc(when(r.lastHeardAt))} · ${esc(age(r.lastHeardAt,club.clock))}`:'Время старых ответов не записано.'}${r.undatedCount&&Number.isFinite(r.lastHeardAt)?` Ещё без даты: ${r.undatedCount}.`:''}</small></li>`).join('')}</ul>`:`<p>${empty}</p>`;
 return `<details class="campaign-demand"><summary>Что гости рассказывали и во что сыграли</summary><p>Здесь только услышанные пожелания и факты посещений за всё время. Один человек мог приходить несколько раз. Покупка игры не меняет интересы людей.</p><p><small>Эта сводка помогает выбрать репертуар. Для конкретной партии проверьте ответы текущего визита: отсутствие свежего ответа не означает согласия.</small></p><div class="campaign-demand-grid"><section><h4>Жанры в пожеланиях</h4>${list(demand.genres,'Спросите, что нравится в историях.')}</section><section><h4>Удобная длительность</h4>${list(demand.durations,'Спросите о времени.')}</section><section><h4>Жанры, которые просили исключить</h4>${list(demand.avoidedGenres,'Пока никто не отвечал о нежелательных жанрах либо в ответах не было запретов.',Infinity)}</section><section><h4>Темы, которые просили исключить</h4>${list(demand.boundaries,'Пока нет услышанных ограничений по темам.',Infinity)}</section><section><h4>Знакомые системы</h4>${list(demand.knownSystems,'Спросите о знакомых правилах.')}<small>Знакомство не означает просьбу играть именно в эту систему.</small></section><section><h4>Проведённые игры</h4>${demand.played.length?`<ul>${demand.played.map(r=>`<li>${esc(r.name)}: ${r.count} гостей, ${r.paid} оплатили, ${r.declinedPayment} отказались от оплаты.</li>`).join('')}</ul>`:'<p>Пока нет завершённых игр.</p>'}</section></div><p>Провожено без игры: ${demand.unserved}. Это факт визита, а не выдуманная причина отказа.</p></details>`;
}
