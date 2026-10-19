import {QUESTIONS} from '../data/club.js';
import {motifs} from '../data/catalog.js';
import {escape} from './map.js';
export function guestInformation(guest){
  const answers=guest.dialogue.map(a=>`<section><h3>${escape(QUESTIONS.find(q=>q.id===a.questionId)?.text??'Разговор')}</h3><p>${escape(a.reply)}</p></section>`).join('');
  return`<p class="info-subtitle">${guest.identity.age} ${guest.identity.age%10===1&&guest.identity.age%100!==11?'год':guest.identity.age%10>=2&&guest.identity.age%10<=4&&(guest.identity.age%100<12||guest.identity.age%100>14)?'года':'лет'} · ${guest.roomId?'комната '+guest.roomId.replace('room-',''):'ожидает'}</p>${answers||'<p>Вы ещё не разговаривали. Спросите гостя у стойки.</p>'}`;
}
export function masterInformation(room){return`<p><b>Мастер ${escape(room.master.name)}</b></p><p>${escape(room.master.detail)}</p><h3>${escape(room.session.title)}</h3><p>${escape(room.session.game)} · ${room.session.minutes/60} ч</p><p>Жанры: ${room.session.genres.map(id=>escape(motifs.find(m=>m.id===id)?.label??id)).join(' · ')}.</p><p>${escape(room.session.premise)}</p><p>${escape(room.session.rulesText)}. ${escape(room.session.paceText)}.</p>`;}
