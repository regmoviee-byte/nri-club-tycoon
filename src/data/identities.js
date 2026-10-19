import {visualFor} from './visuals.js';
export {SPARSE_PORTRAIT_IDS} from './visuals.js';
// Authored fictional identities. Grammar and portrait belong to one identity;
// none of these properties are used in seating assessment.
const rows = [
  ['alina','Алина',26,'feminine'],['alexandra','Александра',33,'feminine'],
  ['alyona','Алёна',31,'feminine'],['anna','Анна',38,'feminine'],
  ['darya','Дарья',24,'feminine'],['evgeniya','Евгения',29,'feminine'],
  ['irina','Ирина',64,'feminine'],['kseniya','Ксения',35,'feminine'],
  ['valeriya','Валерия',45,'feminine'],['vera','Вера',37,'feminine'],
  ['marina','Марина',31,'feminine'],['nadezhda','Надежда',52,'feminine'],
  ['nina','Нина',65,'feminine'],['polina','Полина',28,'feminine'],
  ['svetlana','Светлана',36,'feminine'],['sofia','София',23,'feminine'],
  ['yulia','Юлия',34,'feminine'],['alexey','Алексей',30,'masculine'],
  ['andrey','Андрей',49,'masculine'],['artyom','Артём',24,'masculine'],
  ['vasiliy','Василий',57,'masculine'],['viktor','Виктор',39,'masculine'],
  ['denis','Денис',36,'masculine'],['igor','Игорь',32,'masculine'],
  ['kirill','Кирилл',27,'masculine'],['lev','Лев',41,'masculine'],
  ['mark','Марк',33,'masculine'],['mikhail','Михаил',28,'masculine'],
  ['nikita','Никита',23,'masculine'],['oleg','Олег',54,'masculine'],
  ['roman','Роман',38,'masculine'],['timur','Тимур',36,'masculine'],
  ['boris','Борис',22,'masculine'],['egor','Егор',34,'masculine'],
  ['elena','Елена',27,'feminine'],['lidiya','Лидия',36,'feminine'],
  ['pavel','Павел',25,'masculine'],['tamara','Тамара',30,'feminine'],
  ['sergey','Сергей',38,'masculine'],['semyon','Семён',28,'masculine'],
];
export const IDENTITIES=rows.map(([id,name,age,grammar],index)=>({id,name,age,grammar,portrait:visualFor(id,age,grammar,index)}));
// Authored scenario mix, not a claim about real-world RPG demographics.
export const IDENTITY_AGE_MIX=[{min:18,max:40,count:16},{min:41,max:59,count:3},{min:60,max:99,count:1}];
export function experienceReply(guest) {
  const female=guest.identity.grammar==='feminine';
  if(guest.profile.experience.id==='new')return female?'Пока не играла в НРИ. Мне поможет пример первого хода.':'Пока не играл в НРИ. Мне поможет пример первого хода.';
  if(guest.profile.experience.id==='returning')return female?'Раньше играла, потом был перерыв. Хочется спокойно освоиться.':'Раньше играл, потом был перерыв. Хочется спокойно освоиться.';
  if(guest.profile.experience.id==='some')return female?'Уже попробовала несколько встреч. Новую систему лучше сначала увидеть в действии.':'Уже попробовал несколько встреч. Новую систему лучше сначала увидеть в действии.';
  return 'Играю регулярно. Но у нового стола всё равно хочу заново договориться об ожиданиях.';
}
