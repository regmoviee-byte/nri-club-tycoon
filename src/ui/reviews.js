import {escape} from './map.js';
import {RATING_LABELS} from '../model/rating.js';
export const reviewAverage=reviews=>reviews.length?reviews.reduce((sum,r)=>sum+r.score,0)/reviews.length:null;
const scoreText=value=>value.toLocaleString('ru',{minimumFractionDigits:1,maximumFractionDigits:1});
function explanation(review){
 if(review.ratingVersion!==2||!review.evidence)return'<p class="rating-version">Сохранённая оценка · прежние правила, версия 1.</p>';
 return`<details class="rating-explanation"><summary>Почему такая оценка · версия 2</summary><ul>${Object.entries(RATING_LABELS).map(([key,label])=>`<li><b>${label}</b> — ${review.components[key]>=.95?'подошло':review.components[key]>.25?'частично подошло':'не подошло'}${review.weights[key]===4?' · главный приоритет':review.weights[key]===3?' · второй приоритет':''}<ul>${review.evidence[key].map(item=>`<li>${escape(item.text)}</li>`).join('')}</ul></li>`).join('')}${review.violations.map(text=>`<li><b>Обязательное условие:</b> ${escape(text)} Итог не выше 4/10.</li>`).join('')}</ul></details>`;
}
export function roomReviewHTML(completed){
 const mean=reviewAverage(completed.reviews);
 return`<h3>${escape(completed.game)}</h3><p class="report-members">${escape(completed.master)} · «${escape(completed.title)}»</p><p class="session-rating"><b>Эта игра: ★ ${scoreText(mean)} / 10</b> · ${completed.reviews.length} отзыва</p><p class="session-rating-note">Средняя только этих гостей. Общий рейтинг за всё время показан в шапке клуба.</p><div class="guest-reviews">${completed.reviews.map(r=>`<article><b>${escape(r.name)} <span>★ ${r.score}/10</span></b><p>${escape(r.text)}</p>${explanation(r)}</article>`).join('')}</div>`;
}
