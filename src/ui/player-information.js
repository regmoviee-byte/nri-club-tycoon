import {motifs} from '../data/catalog.js';
import {sessionProgram} from '../model/preferences.js';
import {clockText} from '../model/lifecycle.js';
import {escapeHTML as esc} from './people.js';

export function ageText(age){
 const n=Math.abs(Number(age)),last=n%10,teen=n%100>=11&&n%100<=14;
 return age+' '+(!teen&&last===1?'год':!teen&&last>=2&&last<=4?'года':'лет');
}
export const hourRange=range=>range[0]===range[1]?String(range[0]):range.join('–');
export const datedClock=clock=>'День '+(Math.floor(Math.round(clock*60)/1440)+1)+' · '+clockText(clock).split(' · ')[0];

const sceneNames={combat:'Бои',exploration:'Исследование',mystery:'Расследования',conversation:'Общение',character:'Личные истории'};
const riskNames={safe:'Без гибели героев',risk:'Опасные последствия',lethal:'Возможна гибель героя'};
const toneNames={serious:'Серьёзная история',mixed:'Серьёзность и юмор',comic:'С юмором'};
const paceNames={reflective:'Неспешный',brisk:'Динамичный',varied:'Переменный'};
const rulesNames={light:'Лёгкие',flexible:'Гибкий подход',precise:'Подробные'};
export function adventureGlance(session){
 if(!session)return '';
 const program=sessionProgram(session);
 return '<div class="story-genres">'+session.genres.map(id=>'<span>'+esc(motifs.find(g=>g.id===id)?.short??id)+'</span>').join('')+'</div><div class="story-risk" data-story-risk="'+esc(program.stakes)+'">'+esc(riskNames[program.stakes])+'</div>';
}
export function adventureInformation(session,{includeGlance=true}={}){
 if(!session)return '';
 const program=sessionProgram(session);
 return '<div class="story-information" data-story-information="'+esc(session.id)+'">'+(includeGlance?adventureGlance(session):'')+
 '<dl class="story-characteristics"><div><dt>Настрой</dt><dd>'+esc(toneNames[program.tone])+'</dd></div><div><dt>Темп</dt><dd>'+esc(paceNames[session.pace])+'</dd></div><div><dt>Правила</dt><dd>'+esc(rulesNames[session.rules])+'</dd></div></dl>'+ 
 '<div class="story-scenes" aria-label="Сцены приключения">'+Object.entries(sceneNames).map(([id,label])=>{
  const value=Math.max(0,Math.min(1,Number(program.scenes[id])||0)),level=value>=.7?'Много':value>=.4?'Средне':value>0?'Мало':'Нет';
  return '<div class="story-scene"><span>'+label+'</span><span class="scene-track" aria-hidden="true"><i style="width:'+Math.round(value*100)+'%"></i></span><b>'+level+'</b></div>';
 }).join('')+'</div>'+(session.topicText?'<p class="story-boundaries">'+esc(session.topicText)+'</p>':'')+'<p class="story-premise">'+esc(session.premise??session.description??'')+'</p></div>';
}
