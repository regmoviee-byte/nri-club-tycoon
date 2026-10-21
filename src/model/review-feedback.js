const guidance={
 'master-group':'Пересадите часть гостей за другой стол или назначьте мастера, который комфортно ведёт более крупную группу.',
 duration:'Подберите гостю приключение подходящей длительности. Срок окончания уточняйте до рассадки.',
 genre:'Выбирайте историю по услышанным интересам гостя; предложите ему другой стол.',
 scenes:'Подберите приключение с подходящим соотношением боёв, исследования, загадок и общения.',
 tone:'Согласуйте настроение истории с гостем и выберите подходящее приключение.',
 stakes:'Согласуйте допустимый риск для героев и подберите соответствующую историю.',
 mechanics:'Подберите систему с подходящей гостю сложностью правил.',
 'master-knowledge':'Назначьте мастера, который уверенно знает выбранную систему, или оплатите его обучение.',
 teaching:'Не собирайте слишком много нуждающихся в объяснениях за одним столом. Подберите мастера с навыком обучения и подходящие материалы.',
 'unmet-teaching':'Разделите новичков между столами либо назначьте мастера, способного объяснить правила каждому.',
 'rules-discussion':'Подберите мастера, чей способ разбирать правила подходит гостю.',
 interruptions:'Разведите конфликтующих гостей или назначьте мастера с более сильным ведением группы.',
 'help-pressure':'Не сажайте вместе гостей с несовместимыми привычками давать и принимать советы.',
 'help-first-miss':'Учитывайте отказ от непрошеных советов при выборе компании.',
 'choice-pressure':'Подберите компанию, которая уважает самостоятельный выбор гостя.',
 'dirty-room':'Уберите комнату до следующей партии.',
 'long-seat':'Для долгой игры поставьте удобные стулья или назначьте мастера, который делает перерывы.',
 noise:'Улучшите звукоизоляцию или разведите шумные и тихие столы.',
 heat:'Улучшите вентиляцию комнаты перед следующей долгой игрой.',
 waiting:'Сократите ожидание и обеспечьте доступные места у ресепшна.',
};
export function reviewFeedback(review){
 if(review.score>=10)return{text:'Отличная игра: история, работа мастера и компания мне подошли. Хочу прийти ещё!',advice:null,perfect:true};
 if(review.violations?.length)return{text:review.violations[0],advice:'До запуска проверьте время ухода, запретные темы и формат встречи. Пересадите гостя, если история нарушает его условия.',perfect:false};
 const reasons=[];
 if(review.overloadPenalty>0)reasons.push({code:'master-group',text:'За столом было больше игроков, чем мастер успевал вести: внимания на каждого не хватило.',loss:review.overloadPenalty});
 for(const [group,facts]of Object.entries(review.evidence??{}))for(const fact of facts)if(Number.isFinite(fact.fit)&&fact.fit<1-1e-7)reasons.push({...fact,loss:(review.weights?.[group]??1)*(1-fact.fit)**2});
 for(const penalty of review.comfort?.penalties??[])if(penalty.value>0)reasons.push({...penalty,loss:penalty.value});
 if(review.teachingPenalty>0){const fact=review.evidence?.master?.find(f=>f.code==='teaching');if(fact)reasons.push({...fact,loss:review.teachingPenalty});}
 reasons.sort((a,b)=>b.loss-a.loss);const reason=reasons[0];
 if(!reason)return{text:review.text??'Подробный отзыв не сохранился.',advice:'В старом отчёте недостаточно подробностей для точного разбора. Новые партии сохраняют причины оценки.',perfect:false};
 const text=reason.code==='interruptions'&&reason.fit>=.85?'Мастер возвращал мне слово, но часть времени я терял из-за перебиваний.':reason.code==='stakes'&&reason.fit>=.8?'Риск для героя не полностью совпал с ожиданиями.':reason.code==='scenes'?'Любимых сцен было меньше, чем хотелось.':reason.code==='teaching'&&reason.fit>=.9?'С основами удалось разобраться, но на часть вопросов времени мастера не хватило.':reason.text;
 return{text,advice:guidance[reason.code]??'Сверьте услышанные пожелания гостя с приключением, мастером и компанией; предложите ему подходящий стол.',reason:reason.code,perfect:false};
}
