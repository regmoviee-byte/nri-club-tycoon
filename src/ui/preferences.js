export const CONTROL_NAMES=Object.freeze({up:'Камера вверх',down:'Камера вниз',left:'Камера влево',right:'Камера вправо',pan:'Перетаскивание камеры',fit:'Показать участок',rotate:'Повернуть предмет',remove:'Удалить предмет',cancel:'Отмена / снять выбор'});
export const DEFAULT_PREFERENCES=Object.freeze({grid:true,motion:true,zoomSpeed:1,keys:{up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],pan:['Space'],fit:['Home'],rotate:['KeyR'],remove:['Delete'],cancel:['Escape']}});
const KEY='nri-club-tycoon:preferences:v1';let current=structuredClone(DEFAULT_PREFERENCES);
export function normalizePreferences(value={}){
 const result=structuredClone(DEFAULT_PREFERENCES);for(const k of ['grid','motion'])if(typeof value[k]==='boolean')result[k]=value[k];
 if([.5,1,1.5,2].includes(value.zoomSpeed))result.zoomSpeed=value.zoomSpeed;
 if(value.keys&&Object.keys(CONTROL_NAMES).every(k=>Array.isArray(value.keys[k])&&value.keys[k].length>=1&&value.keys[k].length<=2&&value.keys[k].every(c=>typeof c==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Home|End|Delete|Insert|Backspace|Escape|PageUp|PageDown|F[1-9]|F1[0-2])$/.test(c)))){
  const codes=Object.values(value.keys).flat();if(new Set(codes).size===codes.length)result.keys=structuredClone(value.keys);
 }
 return result;
}
try{current=normalizePreferences(JSON.parse(localStorage.getItem(KEY)??'{}'));}catch{}
export const preferences=()=>structuredClone(current);
export const isControl=(code,action)=>current.keys[action]?.includes(code)??false;
export function savePreferences(next){const value=normalizePreferences(next);localStorage.setItem(KEY,JSON.stringify(value));current=value;return preferences();}
export function setBinding(action,slot,code){
 if(!Object.hasOwn(CONTROL_NAMES,action)||![0,1].includes(slot))throw Error('Выберите действие управления.');
 const next=preferences(),other=Object.entries(next.keys).find(([a,values])=>values.some((v,i)=>v===code&&(a!==action||i!==slot)));
 if(other)throw Error('Эта клавиша уже назначена: '+CONTROL_NAMES[other[0]]+'.');
 next.keys[action][slot]=code;const checked=normalizePreferences(next);
 if(JSON.stringify(checked.keys)!==JSON.stringify(next.keys))throw Error('Эту клавишу назначить нельзя.');
 return savePreferences(next);
}
export function keyLabel(code){return code?.replace(/^Key/,'').replace(/^Digit/,'').replace('ArrowUp','↑').replace('ArrowDown','↓').replace('ArrowLeft','←').replace('ArrowRight','→').replace('Space','Пробел').replace('Escape','Esc').replace('Delete','Del')??'Назначить';}
