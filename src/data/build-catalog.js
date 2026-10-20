// Fictional prototype prices: «Экономика и развитие НРИ Клуб Тайкун», v0.2,
// 19 October 2026, pp. 2–4. Footprints are authored grid geometry, not prices.
const item = (kind, name, category, price, width = 1, height = 1, layer = 'floor', extras = {}) =>
  Object.freeze({kind, name, category, price, width, height, layer, passable: layer !== 'floor', ...extras});

export const BUILD_CATALOG = Object.freeze(Object.fromEntries([
  item('reception', 'Стойка ресепшна', 'waiting', 1200, 2, 1, 'floor', {family: 'reception'}),
  item('table', 'Простой игровой стол', 'furniture', 1600, 2, 2, 'floor', {family: 'table'}),
  item('tableComfort', 'Удобный игровой стол', 'furniture', 3800, 2, 2, 'floor', {family: 'table'}),
  item('chair', 'Простой стул', 'furniture', 350, 1, 1, 'floor', {family: 'chair'}),
  item('chairSoft', 'Мягкий стул', 'furniture', 750, 1, 1, 'floor', {family: 'chair'}),
  item('chairArms', 'Стул с подлокотниками', 'furniture', 1100, 1, 1, 'floor', {family: 'chair'}),
  item('light', 'Светильник', 'furniture', 300, 1, 1, 'ceiling', {family: 'light'}),
  item('lightAdjustable', 'Регулируемый свет', 'furniture', 900, 1, 1, 'ceiling', {family: 'light', hourlyCost: 2}),
  item('shelf', 'Книжная полка', 'furniture', 450, 1, 1, 'floor', {family: 'shelf', capacity: 6}),
  item('shelfLarge', 'Большая полка', 'furniture', 1000, 2, 1, 'floor', {family: 'shelf', capacity: 16}),
  item('sofa', 'Диван ожидания', 'waiting', 1400, 3, 1, 'floor', {family: 'waitingSeat', capacity: 3}),
  item('bench', 'Скамья ожидания', 'waiting', 600, 3, 1, 'floor', {family: 'waitingSeat', capacity: 3}),
  item('staffChair', 'Стул отдыха мастера', 'staff', 350, 1, 1, 'floor', {family: 'staffSeat', staffCapacity: 1, restRate: .65}),
  item('staffBench', 'Скамья отдыха мастеров', 'staff', 900, 3, 1, 'floor', {family: 'staffSeat', staffCapacity: 3, restRate: .65}),
  item('staffSofa', 'Диван отдыха мастеров', 'staff', 1800, 3, 1, 'floor', {family: 'staffSeat', staffCapacity: 3, restRate: .85}),
  item('hanger', 'Вешалка', 'waiting', 250),
  item('bin', 'Урна', 'waiting', 180),
  item('plant', 'Растение', 'decoration', 200),
  item('poster', 'Постер', 'decoration', 150, 1, 1, 'wall'),
  item('decor', 'Декор', 'decoration', 500),
  item('kitchen', 'Кухонная стойка', 'service', 1800, 2, 1, 'floor', {dryStorage: 40}),
  item('water', 'Кулер', 'service', 1200, 1, 1, 'floor', {hourlyCost: 3, useCost: 2, capacity: 12}),
  item('kettle', 'Чайная зона', 'service', 700, 1, 1, 'floor', {hourlyCost: 2, useCost: 5}),
  item('coffee', 'Простая кофеварка', 'service', 2200, 1, 1, 'floor', {family: 'coffee', hourlyCost: 5, useCost: 12, salePrice: 30}),
  item('coffeeAuto', 'Автоматическая кофемашина', 'service', 6000, 1, 1, 'floor', {family: 'coffee', hourlyCost: 12, useCost: 10, salePrice: 30, capacity: 8}),
  item('cookies', 'Раздатчик печенья', 'service', 800, 1, 1, 'floor', {hourlyCost: 1, useCost: 4, capacity: 20}),
  item('fridge', 'Холодильник', 'service', 2800, 1, 1, 'floor', {hourlyCost: 8}),
  item('fan', 'Вентилятор', 'service', 600, 1, 1, 'floor', {hourlyCost: 4}),
  item('conditioner', 'Кондиционер комнаты', 'service', 3500, 1, 1, 'wall', {hourlyCost: 18}),
  item('whiteboard', 'Маркерная доска', 'equipment', 700, 1, 1, 'wall'),
  item('dice', 'Набор кубиков', 'equipment', 150, 1, 1, 'tabletop'),
  item('mat', 'Игровой коврик', 'equipment', 600, 2, 2, 'tabletop'),
  item('miniatures', 'Набор миниатюр', 'equipment', 1200, 1, 1, 'tabletop'),
  item('screen', 'Ширма мастера', 'equipment', 500, 1, 1, 'tabletop'),
  item('tablet', 'Планшет мастера', 'equipment', 3000, 1, 1, 'tabletop', {hourlyCost: 3}),
  item('soundproof', 'Звукоизоляция комнаты', 'equipment', 1800, 1, 1, 'wall', {hourlyCost: 5}),
].map(value => [value.kind, value])));

export const FLOOR_PRICES = Object.freeze({wood: 30, tile: 30});
// An opening/window includes its underlying 80-ruble wall segment. Replacing
// plain wall by a door therefore costs only the documented 200-ruble addition.
export const WALL_PRICES = Object.freeze({wall: 80, door: 280, wideDoor: 430, window: 330});
export const FURNITURE_REFUND_RATE = .6;
export const CONSTRUCTION_REFUND_RATE = .5;
export function expansionPrice(plotNumber) {
  if (!Number.isInteger(plotNumber) || plotNumber < 2) return 0;
  if (plotNumber <= 5) return [0, 0, 6000, 9000, 13000, 18000][plotNumber];
  return Math.round(18000 * 1.35 ** (plotNumber - 5) / 100) * 100;
}
