import {BUILD_CATALOG, FLOOR_PRICES, WALL_PRICES, expansionPrice} from '../data/build-catalog.js';
import {bounds, objectCells} from '../model/layout.js';
import {layoutObjectSVG, layoutObjectPreview} from './layout-map.js';
import {project, unproject, cellPolygon, edgePoints, projectedBounds} from './layout-projection.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>`${Number(value??0).toLocaleString('ru-RU',{maximumFractionDigits:2})} ₽`;
const budgetText=balance=>Number.isFinite(balance)?balance<0?'Долг '+money(-balance):money(balance):'';
const key=p=>`${p.x},${p.y}`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const uid=()=>globalThis.crypto?.randomUUID?.()??`build-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const groups={
  plan:{name:'Планировка',items:['room','corridor','wood','tile','wall','door','wideDoor','window','expand']},
  furniture:{name:'Мебель',items:['table','tableComfort','chair','chairSoft','chairArms','light','lightAdjustable','shelf','shelfLarge','sofa','bench','staffChair','staffBench','staffSofa']},
  service:{name:'Сервис',items:['kitchen','water','kettle','coffee','coffeeAuto','cookies','fridge','fan','conditioner','hanger','bin']},
  details:{name:'Уют и игры',items:['plant','poster','decor','whiteboard','dice','mat','miniatures','screen','tablet','soundproof']},
};
const planning={room:['Комната',0],corridor:['Коридор',FLOOR_PRICES.tile],wood:['Деревянный пол',FLOOR_PRICES.wood],tile:['Плитка',FLOOR_PRICES.tile],wall:['Стена',WALL_PRICES.wall],door:['Дверь',WALL_PRICES.door],wideDoor:['Широкая дверь',WALL_PRICES.wideDoor],window:['Окно',WALL_PRICES.window],expand:['Участок 6 × 8',0]};
const areaTools=new Set(['wood','tile','room','corridor']);
const wallTools=new Set(['wall','door','wideDoor','window']);
const chairKinds=new Set(['chair','chairSoft','chairArms']);
const upgradeFamilies=[['table','tableComfort'],['chair','chairSoft','chairArms'],['light','lightAdjustable'],['shelf','shelfLarge'],['sofa','bench'],['coffee','coffeeAuto'],['staffChair','staffBench','staffSofa']];
const benefits={
  table:'Стол для партии: рядом нужны четыре места гостей и место мастера.',
  tableComfort:'Больше места для карт и миниатюр; помогает гостям, которым нравятся тактические бои.',
  chair:'Одно место за игровым столом.',chairSoft:'На играх от 5 ч помогает тем, кому тяжело сидеть. Перерывы мастера — альтернатива.',chairArms:'От 5 ч помогает долго сидеть так же, как мягкий стул за 750 ₽ или перерывы мастера.',
  light:'Освещение, необходимое для игровой комнаты.',lightAdjustable:'Приглушённый свет помогает атмосфере серьёзных страшных историй. Несколько таких светильников не усиливают эту помощь.',
  shelf:'Хранит до 6 купленных игр.',shelfLarge:'Хранит до 16 купленных игр.',
  sofa:'Три места ожидания. Помогает гостям, которые долго ждут игру.',bench:'Три места ожидания. Помогает гостям, которые долго ждут игру.',
  staffChair:'Одно место отдыха мастера в комнате «Отдых мастеров». Снижает усталость на 0,65 за час отдыха. Нужен доступный подход.',staffBench:'Три места отдыха мастеров: усталость снижается на 0,65 за час отдыха. Оставьте подход к каждому сиденью.',staffSofa:'Три места отдыха мастеров: усталость снижается на 0,85 за час отдыха, у скамьи — на 0,65. Вместимость одинакова; нужен подход к каждому сиденью.',
  kitchen:'Хранит 40 единиц сухих запасов. Для обслуживания нужен проход от входа.',
  water:'Вода для гостей. После установки пополните запас в «Делах клуба».',kettle:'Чай для гостей. После установки пополните запас в «Делах клуба».',
  coffee:'Кофе для гостей: продажа по 30 ₽, расход на порцию 12 ₽; до 4 выдач в час. Хранит 20 порций, запас приобретается отдельно.',coffeeAuto:'Кофе: продажа по 30 ₽, расход на порцию 10 ₽; до 8 выдач в час. Хранит 20 порций, запас приобретается отдельно. Шумит.',
  cookies:'Перекус во время ожидания. После установки пополните запас в «Делах клуба».',fridge:'Холодные напитки для гостей: продажа по 35 ₽, расход на порцию 20 ₽. Нужен запас.',
  fan:'Помогает в душной комнате так же, как кондиционер, но шумит. Несколько приборов не усиливают эту помощь.',conditioner:'В душной комнате помогает так же, как вентилятор за 600 ₽, но не добавляет его шум. Совместная установка не усиливает помощь от духоты.',soundproof:'Защищает чувствительных к шуму гостей от соседних игр и приборов. Повторная установка в этой комнате не усиливает защиту.',
  whiteboard:'Памятки помогают гостям, которым не хватает объяснений правил. Для этого сила помощи такая же, как у планшета за 3 000 ₽; доска стоит 700 ₽ и не требует почасовых расходов. Помощь не складывается.',tablet:'Памятки помогают разбирать правила с той же силой, что доска за 700 ₽. Стоит 3 000 ₽ и 3 ₽/ч; совместная установка не усиливает помощь с правилами.',
  mat:'Помогает любителям боёв в тактической игре. Коврик за 600 ₽ и миниатюры за 1 200 ₽ дают один и тот же эффект; вместе он не складывается.',miniatures:'Помогают любителям боёв в тактической игре. Коврик за 600 ₽ даёт тот же эффект; вместе с миниатюрами он не складывается.',
  dice:'Декоративные кубики на столе. Самостоятельного влияния на оценки, доход или объяснение правил нет.',screen:'Декоративная ширма мастера. Самостоятельного влияния на оценки, доход или объяснение правил нет.',
  hanger:'Декоративная вешалка. Самостоятельного влияния на комфорт, оценки или доход нет.',bin:'Вдвое уменьшает мусор от выдачи продуктов в своей зоне. Не заменяет уборку.',plant:'Растение для оформления клуба.',poster:'Украшение стены.',decor:'Украшение клуба.',
};

function planIcon(kind){
  const drawing={
    room:'<path d="M10 10h28v12h12v30H10z" fill="#b8c5a2"/><path d="M10 10h28v12h12v30H10z" fill="none" stroke-dasharray="4 3"/>',
    corridor:'<path d="M9 23h28V9h14v40H9z" fill="#b6c8c9"/><path d="M12 36h32V15" fill="none" stroke-dasharray="3 4"/>',
    wood:'<rect x="8" y="12" width="48" height="39" rx="2" fill="#c2a280"/><path d="M8 25h48M8 38h48M24 12v13M41 25v13M25 38v13"/>',
    tile:'<rect x="8" y="9" width="48" height="44" rx="2" fill="#b6c5bd"/><path d="M24 9v44M40 9v44M8 24h48M8 39h48"/>',
    wall:'<path d="M8 22h48v20H8z" fill="#c2b29d"/><path d="M8 32h48M25 22v10M44 22v10M17 32v10M36 32v10"/>',
    door:'<path d="M8 42h10M46 42h10M18 42V14M18 14a28 28 0 0 1 28 28" fill="none"/><path d="M18 42l20-20" stroke="#a67954" stroke-width="5"/>',
    wideDoor:'<path d="M5 43h10M49 43h10M15 43V13M49 43V13" fill="none"/><path d="M15 43l13-22M49 43L36 21" stroke="#a67954" stroke-width="5"/>',
    window:'<rect x="9" y="14" width="46" height="35" fill="#a6c4d0"/><path d="M32 14v35M9 31h46M14 20l9-3M37 43l10-4"/>',
    expand:'<rect x="14" y="15" width="36" height="36" fill="#c6bda2" stroke-dasharray="4 3"/><path d="M32 8v48M8 32h48M32 8l-5 6m5-6 5 6M56 32l-6-5m6 5-6 5" fill="none"/>',
  }[kind]??'';
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#69575b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${drawing}</g></svg>`;
}

export function installBuildMode({getClub,root,map,button,onChange=()=>{},onMode=()=>{},quote,commit,getStatus=()=>({}),modeLabel=''}){
  root=typeof root==='string'?document.querySelector(root):root;
  map=typeof map==='string'?document.querySelector(map):map;
  button=typeof button==='string'?document.querySelector(button):button;
  if(!root||!map||!button||typeof quote!=='function'||typeof commit!=='function')throw new Error('Редактору нужны карта, кнопка и операции планировки.');
  const toolbar=document.createElement('section'),tray=document.createElement('section');
  toolbar.className='build-panel';toolbar.hidden=true;toolbar.setAttribute('aria-label','Инструменты строительства');
  tray.className='build-tray';tray.hidden=true;tray.setAttribute('aria-label','Подтверждение изменения');
  map.before(toolbar);map.after(tray);
  let enabled=false,group='plan',tool='select',rotation=0,brush='rectangle',role='auto',roomId='',roomName='',roomPurpose='game',plotId='';
  let selectedId=null,selectedWall=null,cursor=null,proposal=null,busy=false,message='',gesture=null,zoom=null,quoteSerial=0,catalogOpen=false,savedCamera=null,wasVisible=false,autoFit=true,lastViewportSize='';
  let cameraResize=null,observedViewport=null;
  const pointers=new Map(),listeners=[];
  const listen=(node,event,handler,options)=>{node.addEventListener(event,handler,options);listeners.push(()=>node.removeEventListener(event,handler,options));};
  const layout=()=>getClub().layout;
  const world=()=>map.querySelector('.layout-world');
  const viewport=()=>map.querySelector('.layout-viewport');
  const selectedObject=()=>layout()?.objects.find(o=>o.id===selectedId);
  const itemName=kind=>planning[kind]?.[0]??BUILD_CATALOG[kind]?.name??kind;
  const price=kind=>kind==='expand'?expansionPrice((layout()?.plots.length??1)+1):planning[kind]?.[1]??BUILD_CATALOG[kind]?.price??0;
  const itemDetails=kind=>{const item=BUILD_CATALOG[kind];if(!item)return '';return [benefits[kind],`${item.width} × ${item.height} кл.`,item.hourlyCost?`${money(item.hourlyCost)}/ч`:null,item.useCost?`${money(item.useCost)} за порцию`:null].filter(Boolean).join(' · ');};
  const budgetIssue=q=>{const balance=getStatus()?.balance;if(!q?.ok||!Number.isFinite(balance))return '';if(balance<0&&q.cost>0)return 'При долге сначала продайте лишнее имущество.';const shortage=q.cost-(q.refund??0)-balance;return q.cost-(q.refund??0)>0&&shortage>0?`Не хватает ${money(shortage)}. Можно отменить предпросмотр.`:'';};

  function palette(){
    const status=getStatus()??{},catalog=groups[group];
    toolbar.classList.toggle('is-catalog-open',catalogOpen);
    toolbar.innerHTML=`<div class="build-heading"><div><b>Обустроить клуб</b><span class="build-mode-label">${esc(status.label||modeLabel)}</span></div><span class="build-balance">${budgetText(status.balance)}</span><button type="button" class="build-close" data-build-close aria-label="Выйти из строительства">Готово <span>×</span></button></div>
      <div class="build-controls"><button type="button" data-build-catalog-toggle aria-expanded="${catalogOpen}" aria-controls="build-catalog-drawer">Каталог <span>${esc(tool==='select'?'Выбрать предмет':tool==='pan'?'Карта':tool==='move'?'Перестановка':itemName(tool))}</span></button><button type="button" data-build-tool="select" class="${tool==='select'?'active':''}" aria-pressed="${tool==='select'}">↖ Выбрать</button><button type="button" data-build-tool="pan" class="${tool==='pan'?'active':''}" aria-pressed="${tool==='pan'}">✥ Карта</button><button type="button" data-build-rotate title="Повернуть · R" ${tool==='select'&&!selectedId||areaTools.has(tool)||tool==='pan'||tool==='expand'?'disabled':''}>↻ <span>Повернуть</span></button><span class="build-rotation">${rotation*90}°</span></div>
      <div class="build-catalog-drawer" id="build-catalog-drawer"><div class="build-categories" role="tablist" aria-label="Каталог">${Object.entries(groups).map(([id,g])=>`<button type="button" role="tab" aria-selected="${group===id}" data-build-group="${id}">${g.name}</button>`).join('')}</div>
      <div class="build-palette">${catalog.items.filter(id=>planning[id]||BUILD_CATALOG[id]).map(id=>`<button type="button" data-build-tool="${id}" aria-pressed="${tool===id}" class="build-item ${tool===id?'active':''}" title="${esc(itemName(id)+' · '+itemDetails(id))}"><span class="build-item-art">${planning[id]?planIcon(id):layoutObjectSVG(id,0)}</span><span>${esc(itemName(id))}</span><small>${price(id)?money(price(id)):'Разметка'}</small></button>`).join('')}</div></div>
      <div class="build-options">${areaTools.has(tool)?`<label>Выделение <select data-build-brush><option value="rectangle" ${brush==='rectangle'?'selected':''}>Прямоугольник</option><option value="brush" ${brush==='brush'?'selected':''}>Кисть</option></select></label>`:''}${tool==='room'?`<label>Комната <select data-build-room><option value="">Новая</option>${layout().rooms.map(r=>`<option value="${esc(r.id)}" ${roomId===r.id?'selected':''}>${esc(r.name||'Комната '+r.number)}</option>`).join('')}</select></label><label>Назначение <select data-build-purpose><option value="game" ${roomPurpose==='game'?'selected':''}>Игровая</option><option value="staff" ${roomPurpose==='staff'?'selected':''}>Отдых мастеров</option></select></label><input data-build-name maxlength="40" value="${esc(roomName)}" aria-label="Название комнаты" placeholder="Название комнаты">`:''}${chairKinds.has(tool)?`<label>Место <select data-build-role><option value="auto" ${role==='auto'?'selected':''}>Автоматически</option><option value="guest" ${role==='guest'?'selected':''}>Гость</option><option value="master" ${role==='master'?'selected':''}>Мастер</option></select></label>`:''}${tool==='expand'?`<label>От участка <select data-build-plot>${layout().plots.map((p,i)=>`<option value="${esc(p.id)}" ${plotId===p.id?'selected':''}>Участок ${i+1}</option>`).join('')}</select></label><div class="build-expansions">${[['north','↑ Север'],['east','→ Восток'],['south','↓ Юг'],['west','← Запад']].map(([direction,label])=>`<button type="button" data-build-expand="${direction}">${label}</button>`).join('')}</div>`:''}</div>`;
  }

  function hint(){
    if(busy)return 'Сохраняем изменение…';
    if(tool==='select')return itemDetails(proposal?.object?.kind??selectedObject()?.kind)||'Выберите мебель, чтобы переставить, улучшить или продать её.';
    if(tool==='pan')return 'Перетаскивайте карту. Масштаб меняется кнопками − и +.';
    if(tool==='expand')return 'Новый участок — 6 × 8 клеток. После покупки соедините его дверью или проходом с входом клуба.';
    if(tool==='room')return roomPurpose==='staff'?'Разметка бесплатна. Для отдыха нужны стены, доступная дверь, свет и места мастеров. Протяните область по клеткам.':'Разметка бесплатна. Для игры нужны ≥25 клеток, стены с дверью, стол, 4 гостевых стула, место мастера и свет. Протяните область по клеткам.';
    if(tool==='corridor')return 'Плитка — 30 ₽/клетку. Выделенные клетки исключаются из комнаты. Бетон уже проходим. Протяните область по клеткам.';
    if(areaTools.has(tool))return brush==='rectangle'?'Протяните область по клеткам. Цена за клетку; покупка после подтверждения.':'Проведите кистью по клеткам. Можно добавить ещё один участок.';
    if(wallTools.has(tool))return tool==='wall'?'Проведите вдоль грани клеток. Кнопка ↻ меняет направление стены.':'Выберите грань стены. Кнопка ↻ меняет направление.';
    if(tool==='move')return 'Выберите новое место. Перестановка своей мебели бесплатна.';
    return [itemDetails(tool),'Нажмите клетку. ↻ — поворот; «Отмена» — отменить.'].filter(Boolean).join(' ');
  }

  function drawTray(){
    if(!enabled)return;
    const q=proposal?.quote,o=selectedObject(),status=getStatus()??{};
    const budget=budgetIssue(q),ready=proposal?.locked&&q?.ok&&!budget&&!busy&&status.canPurchase!==false;
    let details='';
    if(o&&tool==='select'&&!proposal){
      const upgrades=(upgradeFamilies.find(f=>f.includes(o.kind))??[]).filter(k=>k!==o.kind);
      details=`<div class="build-object-actions"><button type="button" data-build-move>Переставить · бесплатно</button><button type="button" data-build-sell>Продать</button>${upgrades.length?`<select data-build-upgrade aria-label="Заменить мебель"><option value="">Заменить на…</option>${upgrades.map(k=>`<option value="${k}">${esc(itemName(k))} · ${money(BUILD_CATALOG[k].price)}</option>`).join('')}</select>`:''}</div>`;
    }else if(selectedWall&&tool==='select'&&!proposal)details='<div class="build-object-actions"><button type="button" data-build-demolish>Снести участок стены</button></div>';
    const title=proposal?.label??(o?itemName(o.kind):selectedWall?'Участок стены':tool==='select'?'Ваша планировка':itemName(tool));
    const net=q?.ok?q.cost-(q.refund??0):0;
    const cost=q?(q.ok?(q.refund?(net>0?`К оплате ${money(net)}`:net<0?`Вернётся ${money(-net)}`:'Без доплаты')+` · цена ${money(q.cost)} · возврат ${money(q.refund)}`:q.cost?money(q.cost):'Без оплаты'):'Стоимость после выбора допустимого места'):'';
    const investment=q?.ok&&q.investment;
    const estimate=investment?`<dl class="build-investment" aria-label="Смета после изменения"><div><dt>В кассе после</dt><dd>${esc(money(investment.balanceAfter))}</dd></div><div><dt>Известный резерв</dt><dd>${esc(money(investment.reserveAfter))}</dd></div><div><dt>Свободно после</dt><dd>${esc(money(investment.freeAfter))}</dd></div><div><dt>Текущие расходы</dt><dd>${esc(money(investment.hourlyBefore))} → ${esc(money(investment.hourlyAfter))}/ч</dd></div></dl><p class="build-estimate-note">Резерв — на уже начатую работу. Будущая выручка не учтена.</p>`:'';
    tray.innerHTML=`<div class="build-summary"><div><b>${esc(title)}</b><span class="build-price">${esc(cost)}</span></div><p class="build-feedback ${q&&!q.ok||budget?'is-invalid':''}" role="status" aria-live="polite">${esc(message||q&&!q.ok&&q.reason||budget||hint())}</p>${estimate}${details}</div><div class="build-confirm-actions"><button type="button" data-build-cancel ${busy?'disabled':''}>Отмена</button><button type="button" data-build-confirm class="build-confirm" ${ready?'':'disabled'}>${busy?'Сохраняем…':proposal?.edit.type==='move'?'Переставить':proposal?.edit.type==='remove'||proposal?.edit.type==='removeWall'?'Подтвердить возврат':'Подтвердить'}</button></div>`;
    if(status.label)toolbar.querySelector('.build-mode-label').textContent=status.label;
    const balance=toolbar.querySelector('.build-balance');if(balance)balance.textContent=budgetText(status.balance);
  }

  function coords(event){
    const node=world();if(!node)return null;
    const rect=node.getBoundingClientRect(),scale=rect.width/node.offsetWidth;
    if(!scale)return null;
    const point=unproject((event.clientX-rect.left)/scale+Number(node.dataset.projectionMinX),(event.clientY-rect.top)/scale+Number(node.dataset.projectionMinY));
    return{x:Math.floor(point.x),y:Math.floor(point.y),fx:point.x-Math.floor(point.x),fy:point.y-Math.floor(point.y)};
  }

  function previewExtent(node){
    const content=node.querySelector('.layout-content'),box=viewport();if(!content||!box)return;
    const bx=Number(node.dataset.baseProjectionMinX),by=Number(node.dataset.baseProjectionMinY),bw=Number(node.dataset.baseWidth),bh=Number(node.dataset.baseHeight);
    let x=bx,y=by,right=bx+bw,bottom=by+bh;
    if(enabled&&proposal?.edit.type==='expand'&&proposal.cells.length){
      const cells=proposal.cells,gx=Math.min(...cells.map(c=>c.x)),gy=Math.min(...cells.map(c=>c.y));
      const extent=projectedBounds({x:gx,y:gy,w:Math.max(...cells.map(c=>c.x+1))-gx,h:Math.max(...cells.map(c=>c.y+1))-gy});
      x=Math.min(x,extent.x);y=Math.min(y,extent.y);right=Math.max(right,extent.x+extent.w);bottom=Math.max(bottom,extent.y+extent.h);
    }
    const oldX=Number(node.dataset.projectionMinX),oldY=Number(node.dataset.projectionMinY),left=box.scrollLeft+(oldX-x)*(zoom??1),top=box.scrollTop+(oldY-y)*(zoom??1);
    node.dataset.projectionMinX=x;node.dataset.projectionMinY=y;node.style.width=`${right-x}px`;node.style.height=`${bottom-y}px`;
    content.style.transform=`translate(${bx-x}px,${by-y}px)`;
    if(oldX!==x||oldY!==y){box.scrollLeft=left;box.scrollTop=top;}
  }

  function drawPreview(){
    const node=world(),layer=node?.querySelector('.layout-preview');if(!layer)return;
    previewExtent(node);
    node.querySelectorAll('.is-build-selected').forEach(el=>el.classList.remove('is-build-selected'));
    if(selectedId)node.querySelectorAll('[data-object]').forEach(el=>{if(el.dataset.object===selectedId)el.classList.add('is-build-selected');});
    if(!enabled||!proposal){layer.innerHTML='';return;}
    const p=proposal,q=p.quote,budget=budgetIssue(q),invalid=q&&!q.ok||!!budget,ox=Number(node.dataset.projectionMinX),oy=Number(node.dataset.projectionMinY);
    const stroke=invalid?'#b5644e':'#819a63',fill=invalid?'#c87c6355':'#adc5a04d';
    let marks=(p.cells??[]).map(c=>`<polygon class="build-iso-cell ${invalid?'is-invalid':''}" points="${cellPolygon(c.x,c.y).map(point=>`${point.x-ox},${point.y-oy}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`).join('');
    for(const edge of p.edges??[]){const[a,b]=edgePoints(edge);marks+=`<line class="build-iso-edge ${invalid?'is-invalid':''}" x1="${a.x-ox}" y1="${a.y-oy}" x2="${b.x-ox}" y2="${b.y-oy}" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/>`;}
    let html=`<svg class="build-preview-grid" width="${node.offsetWidth}" height="${node.offsetHeight}" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true">${marks}</svg>`;
    if(p.object)html+=`<div class="build-ghost ${invalid?'is-invalid':''}" style="position:absolute;left:0;top:0;width:100%;height:100%">${layoutObjectPreview(p.object,{x:ox,y:oy})}</div>`;
    if(p.cells?.length||p.edges?.length){const c=p.cells?.[0]??p.edges[0],point=project(c.x,c.y);html+=`<span class="build-preview-tag ${invalid?'is-invalid':''}" style="left:${point.x-ox}px;top:${point.y-oy-24}px">${esc(q?invalid?q.reason||budget:money((q.cost??0)-(q.refund??0)):'Проверяем…')}</span>`;}
    layer.innerHTML=html;
  }

  async function propose(edit,{cells=[],edges=[],object=null,label='',locked=false}={}){
    if(busy)return;
    const signature=JSON.stringify(edit),old=proposal;
    proposal={edit,cells,edges,object,label,locked,transactionId:old?.signature===signature?old.transactionId:uid(),signature,quote:old?.signature===signature?old.quote:null};
    message='';const current=proposal,serial=++quoteSerial;drawPreview();drawTray();
    try{const result=await quote(edit);if(serial!==quoteSerial||proposal!==current)return;current.quote=result??{ok:false,reason:'Не удалось проверить изменение.'};}
    catch{if(serial!==quoteSerial||proposal!==current)return;current.quote={ok:false,reason:'Не удалось проверить изменение. Попробуйте ещё раз.'};}
    drawPreview();drawTray();
  }

  function areaProposal(cells,locked){
    if(!cells.length)return;
    let edit;
    if(tool==='room'){
      const existing=layout().rooms.find(r=>r.id===roomId),merged=new Map((existing?.cells??[]).map(c=>[key(c),c]));
      for(const cell of cells)merged.set(key(cell),{x:cell.x,y:cell.y});
      edit={type:'room',...(roomId?{id:roomId}:{}),...(roomName.trim()?{name:roomName.trim()}:{}),purpose:roomPurpose,cells:[...merged.values()]};
    }else if(tool==='corridor'){
      const removed=new Set(cells.map(key)),edits=[{type:'floor',cells,finish:'tile'}];
      for(const room of layout().rooms){const remaining=room.cells.filter(c=>!removed.has(key(c)));if(remaining.length!==room.cells.length)edits.push(remaining.length?{type:'room',id:room.id,cells:remaining,name:room.name,...(room.purpose?{purpose:room.purpose}:{})}:{type:'removeRoom',id:room.id});}
      edit=edits.length===1?edits[0]:{type:'batch',edits};
    }else edit={type:'floor',cells,finish:tool};
    propose(edit,{cells,label:`${itemName(tool)} · ${cells.length} кл.`,locked});
  }

  function cellProposal(cell,locked=false){
    if(!cell||busy)return;
    cursor=cell;
    if(wallTools.has(tool)){
      const edge={x:cell.x+(rotation%2&&cell.fx>.5?1:0),y:cell.y+(!(rotation%2)&&cell.fy>.5?1:0),axis:rotation%2?'v':'h'};
      propose({type:'wall',edge,kind:tool},{edges:[edge],label:itemName(tool),locked});
    }else if(BUILD_CATALOG[tool]||tool==='move'){
      const original=tool==='move'?selectedObject():null;if(tool==='move'&&!original)return;
      const object={...(original??{}),kind:original?.kind??tool,x:cell.x,y:cell.y,rotation};
      if(chairKinds.has(object.kind)&&tool!=='move'&&role!=='auto')object.role=role;
      const edit=original?{type:'move',id:original.id,x:cell.x,y:cell.y,rotation}:{type:'place',object};
      propose(edit,{cells:objectCells(object),object,label:original?'Переставить: '+itemName(object.kind):itemName(object.kind),locked});
    }
  }

  function clearPreview(){proposal=null;gesture=null;++quoteSerial;message='';drawPreview();drawTray();}
  function chooseTool(next){if(busy)return;catalogOpen=false;tool=next;selectedId=null;selectedWall=null;clearPreview();if(tool==='expand')plotId=plotId||layout().plots[0]?.id||'';palette();drawTray();}
  function rotate(){
    if(busy||areaTools.has(tool)||tool==='pan'||tool==='expand'||tool==='select'&&!selectedId)return;rotation=(rotation+1)%4;
    const object=selectedObject();
    if(tool==='select'&&object){tool='move';rotation=(object.rotation+1)%4;cellProposal(object,true);}
    else if(cursor)cellProposal(cursor,proposal?.locked??false);
    palette();drawTray();
  }

  function expand(direction){
    const plot=layout().plots.find(p=>p.id===plotId)??layout().plots[0];if(!plot)return;
    const x=plot.x+(direction==='east'?6:direction==='west'?-6:0),y=plot.y+(direction==='south'?8:direction==='north'?-8:0);
    const cells=Array.from({length:48},(_,i)=>({x:x+i%6,y:y+Math.floor(i/6)}));
    propose({type:'expand',direction,plotId:plot.id},{cells,label:'Новый участок · 6 × 8 · 48 клеток',locked:true});
    fit();
  }

  async function confirm(){
    const submitted=proposal;if(busy||!submitted?.locked||!submitted.quote?.ok||budgetIssue(submitted.quote)||getStatus()?.canPurchase===false)return;
    busy=true;drawTray();
    try{
      const result=await commit(submitted.edit,{transactionId:submitted.transactionId,baseRevision:submitted.quote.baseRevision});
      if(result?.ok){proposal=null;++quoteSerial;message='Изменение сохранено.';await onChange(result);refresh();}
      else message=result?.reason||'Изменение не выполнено.';
    }catch{message='Не удалось выполнить изменение. Попробуйте ещё раз.';}
    finally{busy=false;drawPreview();drawTray();}
  }

  function rememberCamera(){
    const box=viewport(),node=world();if(!box?.clientWidth||!box.clientHeight||!node)return;
    const b=box.getBoundingClientRect(),n=node.getBoundingClientRect(),scale=n.width/node.offsetWidth;if(!scale)return;
    savedCamera=unproject(Number(node.dataset.projectionMinX)+(b.left+box.clientWidth/2-n.left)/scale,Number(node.dataset.projectionMinY)+(b.top+box.clientHeight/2-n.top)/scale);
  }

  function restoreCamera(){
    const box=viewport(),node=world();if(!savedCamera||!box?.clientWidth||!box.clientHeight||!node)return;
    const b=box.getBoundingClientRect(),n=node.getBoundingClientRect(),scale=n.width/node.offsetWidth;
    const point=project(savedCamera.x,savedCamera.y);
    box.scrollLeft+=n.left+(point.x-Number(node.dataset.projectionMinX))*scale-b.left-box.clientWidth/2;
    box.scrollTop+=n.top+(point.y-Number(node.dataset.projectionMinY))*scale-b.top-box.clientHeight/2;
  }

  function setZoom(value,{clientX,clientY}={}){
    const box=viewport(),node=world();if(!box||!node)return;
    const old=zoom??1,next=clamp(value,.08,1.8),rect=box.getBoundingClientRect(),before=node.getBoundingClientRect();
    const anchorX=clientX===undefined?rect.left+box.clientWidth/2:clientX,anchorY=clientY===undefined?rect.top+box.clientHeight/2:clientY;
    const x=(anchorX-before.left)/old,y=(anchorY-before.top)/old;
    autoFit=false;zoom=next;node.style.zoom=String(zoom);node.style.setProperty('--map-zoom',zoom);
    const after=node.getBoundingClientRect();box.scrollLeft+=after.left+x*zoom-anchorX;box.scrollTop+=after.top+y*zoom-anchorY;
    map.querySelectorAll('[data-map-scale]').forEach(el=>el.textContent=Math.round(zoom*100)+'%');
    rememberCamera();
  }

  function fit(){
    const box=viewport(),node=world();if(!box||!node||!layout()||!box.clientWidth||!box.clientHeight)return;
    let source=bounds(layout());
    if(proposal?.edit.type==='expand'&&proposal.cells.length){const x=Math.min(source.x,...proposal.cells.map(c=>c.x)),y=Math.min(source.y,...proposal.cells.map(c=>c.y)),right=Math.max(source.x+source.w,...proposal.cells.map(c=>c.x+1)),bottom=Math.max(source.y+source.h,...proposal.cells.map(c=>c.y+1));source={x,y,w:right-x,h:bottom-y};}
    const b=projectedBounds(source);
    autoFit=true;zoom=clamp(Math.min((box.clientWidth-16)/b.w,(box.clientHeight-16)/b.h),.08,1.15);
    node.style.zoom=String(zoom);node.style.setProperty('--map-zoom',zoom);
    box.scrollLeft=(b.x+b.w/2-Number(node.dataset.projectionMinX))*zoom-box.clientWidth/2;
    box.scrollTop=(b.y+b.h/2-Number(node.dataset.projectionMinY))*zoom-box.clientHeight/2;
    map.querySelectorAll('[data-map-scale]').forEach(el=>el.textContent=Math.round(zoom*100)+'%');
    rememberCamera();
  }

  function refresh(){
    map.classList.add('has-layout-map');
    // Room pagination can resize only the viewport while the map stays fixed.
    // A render replaces that viewport, so observe the current node each time.
    const box=viewport();
    if(cameraResize&&box!==observedViewport){
      if(observedViewport)cameraResize.unobserve(observedViewport);
      observedViewport=box;if(box)cameraResize.observe(box);
    }
    if(zoom===null)requestAnimationFrame(fit);else if(world()){world().style.zoom=String(zoom);world().style.setProperty('--map-zoom',zoom);}
    if(enabled){palette();drawPreview();drawTray();}
  }

  function activate(){if(enabled)return;enabled=true;root.classList.add('is-building','show-rooms');button.setAttribute('aria-pressed','true');toolbar.hidden=false;tray.hidden=false;onMode(true);palette();drawTray();refresh();requestAnimationFrame(fit);}
  function cancel(){if(busy)return;if(proposal||tool==='move'){clearPreview();tool='select';palette();drawTray();return;}deactivate();}
  function deactivate(){if(busy)return;enabled=false;clearPreview();selectedId=null;selectedWall=null;root.classList.remove('is-building');button.setAttribute('aria-pressed','false');toolbar.hidden=true;tray.hidden=true;onMode(false);button.focus();}

  function selectAt(event,cell){
    const objectEl=event.target.closest('[data-object]'),id=objectEl?.dataset.object;
    selectedId=id??null;selectedWall=null;clearPreview();
    if(!id&&cell){
      const edges=[{x:cell.x,y:cell.y,axis:'v',d:cell.fx},{x:cell.x+1,y:cell.y,axis:'v',d:1-cell.fx},{x:cell.x,y:cell.y,axis:'h',d:cell.fy},{x:cell.x,y:cell.y+1,axis:'h',d:1-cell.fy}];
      const edge=edges.sort((a,b)=>a.d-b.d)[0];if(edge.d<.2)selectedWall=layout().walls.find(w=>w.x===edge.x&&w.y===edge.y&&w.axis===edge.axis)?.id??null;
    }
    const object=selectedObject();if(object)rotation=object.rotation;palette();drawPreview();drawTray();return!!(selectedId||selectedWall);
  }

  function rectangle(a,b){const cells=[];for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++){if(cells.length>=4096)return cells;cells.push({x,y});}return cells;}
  function strokeUpdate(cell,locked=false){
    if(!gesture)return;
    if(gesture.type==='area'){
      if(brush==='rectangle')gesture.cells=rectangle(gesture.start,cell);
      else {const count=Math.max(Math.abs(cell.x-gesture.last.x),Math.abs(cell.y-gesture.last.y),1);for(let i=0;i<=count;i++){const c={x:Math.round(gesture.last.x+(cell.x-gesture.last.x)*i/count),y:Math.round(gesture.last.y+(cell.y-gesture.last.y)*i/count)};gesture.paint.set(key(c),c);}gesture.cells=[...gesture.paint.values()];}
      gesture.last=cell;areaProposal(gesture.cells,locked);
    }else if(gesture.type==='wall'){
      const edge=gesture.edge,edges=[];
      if(edge.axis==='h')for(let x=Math.min(edge.x,cell.x);x<=Math.max(edge.x,cell.x);x++)edges.push({...edge,x});
      else for(let y=Math.min(edge.y,cell.y);y<=Math.max(edge.y,cell.y);y++)edges.push({...edge,y});
      const edits=edges.map(e=>({type:'wall',edge:e,kind:'wall'}));propose(edits.length===1?edits[0]:{type:'batch',edits},{edges,label:`Стена · ${edges.length} граней`,locked});
    }
  }

  listen(button,'click',()=>enabled?deactivate():activate());
  listen(toolbar,'click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.hasAttribute('data-build-close'))deactivate();
    else if(target.hasAttribute('data-build-catalog-toggle')){catalogOpen=!catalogOpen;palette();}
    else if(target.dataset.buildGroup){group=target.dataset.buildGroup;palette();}
    else if(target.dataset.buildTool)chooseTool(target.dataset.buildTool);
    else if(target.hasAttribute('data-build-rotate'))rotate();
    else if(target.dataset.buildExpand)expand(target.dataset.buildExpand);
  });
  listen(toolbar,'change',event=>{
    if(event.target.matches('[data-build-brush]'))brush=event.target.value;
    if(event.target.matches('[data-build-room]')){roomId=event.target.value;const room=layout().rooms.find(r=>r.id===roomId);roomName=room?.name??'';roomPurpose=room?.purpose??'game';clearPreview();palette();drawTray();}
    if(event.target.matches('[data-build-purpose]')){roomPurpose=event.target.value;if(proposal?.cells?.length)areaProposal(proposal.cells,proposal.locked);else drawTray();}
    if(event.target.matches('[data-build-role]')){role=event.target.value;if(cursor)cellProposal(cursor,proposal?.locked??false);}
    if(event.target.matches('[data-build-plot]'))plotId=event.target.value;
  });
  listen(toolbar,'input',event=>{if(event.target.matches('[data-build-name]')){roomName=event.target.value;if(proposal?.cells?.length)areaProposal(proposal.cells,proposal.locked);}});
  listen(tray,'click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.hasAttribute('data-build-confirm'))confirm();
    else if(target.hasAttribute('data-build-cancel'))cancel();
    else if(target.hasAttribute('data-build-move')){const object=selectedObject();if(object){tool='move';rotation=object.rotation;cursor=object;cellProposal(object,false);palette();drawTray();}}
    else if(target.hasAttribute('data-build-sell')){const object=selectedObject();if(object)propose({type:'remove',id:object.id},{cells:objectCells(object),label:'Продать: '+itemName(object.kind),locked:true});}
    else if(target.hasAttribute('data-build-demolish')){const wall=layout().walls.find(w=>w.id===selectedWall);if(wall)propose({type:'removeWall',id:wall.id},{edges:[wall],label:'Снести участок стены',locked:true});}
  });
  listen(tray,'change',event=>{if(event.target.matches('[data-build-upgrade]')&&event.target.value){const object=selectedObject();if(object){const replacement={...object,kind:event.target.value};propose({type:'upgrade',id:object.id,kind:event.target.value},{cells:objectCells(replacement),object:replacement,label:'Замена: '+itemName(event.target.value),locked:true});}}});
  listen(map,'click',event=>{
    const zoomButton=event.target.closest('[data-map-zoom]');
    if(zoomButton){event.preventDefault();event.stopImmediatePropagation();if(zoomButton.dataset.mapZoom==='fit')fit();else setZoom((zoom??1)+(zoomButton.dataset.mapZoom==='in'?.15:-.15));return;}
    if(enabled){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  listen(map,'pointerdown',event=>{
    if(!enabled||busy||event.target.closest('.layout-view-tools')||event.button>0)return;
    event.preventDefault();event.stopPropagation();const cell=coords(event);if(!cell)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try{map.setPointerCapture(event.pointerId);}catch{}
    if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:zoom??1};return;}
    const box=viewport();
    if(tool==='pan'||tool==='select'&&!selectAt(event,cell)){gesture={type:'pan',x:event.clientX,y:event.clientY,left:box.scrollLeft,top:box.scrollTop};return;}
    if(areaTools.has(tool)){
      const old=brush==='brush'?(proposal?.cells??[]):[];
      gesture={type:'area',start:cell,last:cell,cells:[],paint:new Map(old.map(c=>[key(c),c]))};strokeUpdate(cell);return;
    }
    if(tool==='wall'){gesture={type:'wall',edge:{x:cell.x+(rotation%2&&cell.fx>.5?1:0),y:cell.y+(!(rotation%2)&&cell.fy>.5?1:0),axis:rotation%2?'v':'h'}};strokeUpdate(cell);return;}
    cellProposal(cell,true);
  },true);
  listen(map,'pointermove',event=>{
    if(!enabled||busy||event.target.closest('.layout-view-tools'))return;
    if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(gesture?.type==='pinch'&&pointers.size>=2){const[a,b]=[...pointers.values()];setZoom(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.distance),{clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});return;}
    if(gesture?.type==='pan'){const box=viewport();if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>2)autoFit=false;box.scrollLeft=gesture.left-(event.clientX-gesture.x);box.scrollTop=gesture.top-(event.clientY-gesture.y);return;}
    const cell=coords(event);if(!cell)return;
    if(gesture){strokeUpdate(cell);return;}
    if(!proposal?.locked&&(event.pointerType==='mouse'||pointers.has(event.pointerId)))cellProposal(cell,false);
  },true);
  function pointerEnd(event){
    if(!enabled)return;pointers.delete(event.pointerId);
    if(gesture?.type==='area'||gesture?.type==='wall'){const cell=coords(event);if(cell)strokeUpdate(cell,true);}
    gesture=null;try{map.releasePointerCapture(event.pointerId);}catch{}
  }
  listen(map,'pointerup',pointerEnd,true);listen(map,'pointercancel',()=>{pointers.clear();gesture=null;clearPreview();},true);
  listen(map,'scroll',event=>{if(event.target.matches('.layout-viewport'))rememberCamera();},true);
  listen(map,'wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();setZoom((zoom??1)*Math.exp(-event.deltaY*.002),event);}}, {passive:false});
  listen(document,'keydown',event=>{
    if(!enabled)return;
    if(event.key==='Escape'){event.preventDefault();cancel();return;}
    if(event.target.closest('input,textarea,select'))return;
    if(event.key.toLowerCase()==='r'){event.preventDefault();rotate();}
    else if(event.key==='Delete'&&selectedId){event.preventDefault();const object=selectedObject();propose({type:'remove',id:object.id},{cells:objectCells(object),label:'Продать: '+itemName(object.kind),locked:true});}
    else if(map.contains(event.target)&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(event.key)){
      event.preventDefault();cursor??={...layout().entry,fx:.5,fy:.5};
      if(event.key==='ArrowUp')cursor.y--;if(event.key==='ArrowDown')cursor.y++;if(event.key==='ArrowLeft')cursor.x--;if(event.key==='ArrowRight')cursor.x++;
      if(areaTools.has(tool))areaProposal([{x:cursor.x,y:cursor.y}],event.key==='Enter');else cellProposal(cursor,event.key==='Enter');
    }
  });
  listen(window,'resize',()=>{if(zoom===null)fit();});
  if(typeof ResizeObserver!=='undefined'){
    cameraResize=new ResizeObserver(()=>{
      const box=viewport(),visible=!!(map.clientWidth&&map.clientHeight&&box?.clientWidth&&box.clientHeight);
      if(visible){
        const size=`${box.clientWidth}:${box.clientHeight}`;
        if(zoom===null||autoFit&&(!wasVisible||size!==lastViewportSize))fit();
        else if(!wasVisible||size!==lastViewportSize)restoreCamera();
        lastViewportSize=size;
      }
      wasVisible=visible;
    });
    cameraResize.observe(map);listeners.push(()=>cameraResize.disconnect());
  }
  refresh();
  return{active:activate,activate,cancel,deactivate,isActive:()=>enabled,refresh,destroy(){if(busy)return;enabled=false;root.classList.remove('is-building');toolbar.remove();tray.remove();listeners.forEach(fn=>fn());}};
}
