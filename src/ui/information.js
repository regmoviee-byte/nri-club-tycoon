import {guestHistoryHTML,guestVisitHTML,guestWaitingHTML,answerDateText} from './guest-history-ui.js';
import {visibleGuestHistory} from '../model/guests-history.js';
import {QUESTIONS} from '../data/club.js';
import {motifs} from '../data/catalog.js';
import {escape} from './map.js';
import {masterExpectationText,sessionExpectationText,masterPreferences} from '../model/preferences.js';
import {SYSTEMS} from '../data/systems.js';
export function guestInformation(guest,club=null){
  const current=club&&visibleGuestHistory(club,guest)?.currentAnswers||guest.dialogue;
  const answers=current.map(a=>`<section><h3>${escape(QUESTIONS.find(q=>q.id===a.questionId)?.text??'Разговор')}</h3><small>${escape(answerDateText(a,club?.clock))}</small><p>${escape(a.reply)}</p></section>`).join('');
  return`<p class="info-subtitle">${guest.identity.age} ${guest.identity.age%10===1&&guest.identity.age%100!==11?'год':guest.identity.age%10>=2&&guest.identity.age%10<=4&&(guest.identity.age%100<12||guest.identity.age%100>14)?'года':'лет'} · ${guest.roomId?'комната '+(club?.rooms.find(r=>r.id===guest.roomId)?.number??guest.roomId.replace('room-','')):'ожидает'}</p>${guestVisitHTML(club,guest)}${guestWaitingHTML(club,guest)}${guestHistoryHTML(club,guest)}<h3>Ответы в этом визите</h3>${answers||'<p>Вы ещё не разговаривали в этом визите. Спросите гостя у стойки.</p>'}`;
}
export function masterInformation(room){
  if(!room.master||!room.session)return'<p>Назначьте свободного мастера и выберите купленную игру.</p>';
  const m=masterPreferences(room.master),known=(m.known??Object.keys(m.systemSkills??{})).map(id=>SYSTEMS[id]?.name??id);
  return`<p><b>Мастер ${escape(room.master.name)}</b></p><p><b>При знакомстве:</b> ${escape(room.master.detail)}</p>${m.hourlyWage!==undefined?`<p>${m.hourlyWage} ₽/ч за всё время партии.</p>`:''}<h3>Текущий подход</h3><p>${escape(masterExpectationText(room.master))}</p>${known.length?`<p>Знает: ${escape(known.join(', '))}.</p>`:''}<h3>${escape(room.session.title)}</h3><p>${escape(room.session.game)} · ${room.session.minutes/60} ч</p><p>Жанры: ${room.session.genres.map(id=>escape(motifs.find(m=>m.id===id)?.label??id)).join(' · ')}.</p><p>${escape(room.session.premise)}</p><p>${escape(room.session.rulesText)}. ${escape(room.session.paceText)}.</p><p>${escape(sessionExpectationText(room.session,room.master,room.program))}</p>`;
}
