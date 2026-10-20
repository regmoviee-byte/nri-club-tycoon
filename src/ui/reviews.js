import {escape} from './map.js';
import {RATING_LABELS} from '../model/rating.js';
export const reviewAverage=reviews=>reviews.length?reviews.reduce((sum,r)=>sum+r.score,0)/reviews.length:null;
const spoken=text=>String(text).replaceAll('Советы без запроса расходятся с просьбой сначала дать решить самостоятельно; посредничество не обещано.','Не люблю советы от других игроков, а здесь мне всё время подсказывали.').replaceAll('советы без запроса','подсказки других игроков').replaceAll('Озвученные привычки сохраняют право решать за своего героя.','Мы давали друг другу самим выбирать ход.');
const scoreText=value=>value.toLocaleString('ru',{minimumFractionDigits:1,maximumFractionDigits:1});
function explanation(review){
 if(![2,3,4,5].includes(review.ratingVersion)||!review.evidence)return'<p class="rating-version">Сохранённый отзыв.</p>';
 return`<details class="rating-explanation"><summary>Почему такая оценка</summary><ul>${Object.entries(RATING_LABELS).map(([key,label])=>`<li><b>${label}</b> — ${review.components[key]>=.95?'подошло':review.components[key]>.25?'частично подошло':'не подошло'}${review.weights[key]===4?' · важнее всего':review.weights[key]===3?' · тоже важно':''}<ul>${review.evidence[key].map(item=>`<li>${escape(spoken(item.text))}</li>`).join('')}</ul></li>`).join('')}${review.violations.map(text=>`<li><b>Так мы не договаривались:</b> ${escape(text)}</li>`).join('')}${(review.comfort?.notes??[]).map(text=>`<li>${escape(text)}</li>`).join('')}${(review.comfort?.helped??[]).map(text=>`<li>${escape(text)}</li>`).join('')}</ul></details>`;
}
export function roomReviewHTML(completed){
 const mean=reviewAverage(completed.reviews);
 return`<h3>${escape(completed.game)}</h3><p class="report-members">${escape(completed.master)} · «${escape(completed.title)}»</p><p class="session-rating"><b>Эта игра: ★ ${scoreText(mean)} / 10</b> · ${completed.reviews.length} отзыва</p><p class="session-rating-note">Средняя только этих гостей. Общий рейтинг за всё время показан в шапке клуба.</p>${completed.payments!==undefined?`<p class="financial-report">Гости: +${completed.payments} ₽ · чаевые: +${completed.tips} ₽ · мастер: −${completed.wages} ₽.</p>`:''}<div class="guest-reviews">${completed.reviews.map(r=>`<article><b>${escape(r.name)} <span>★ ${r.score}/10</span></b><p>${escape(spoken(r.text))}</p>${r.financial?`<p class="review-payment">${'Оплата '+r.financial.payment+' ₽'}${r.financial.tips?' · чаевые '+r.financial.tips+' ₽':''}</p>`:''}${explanation(r)}</article>`).join('')}</div>`;
}
