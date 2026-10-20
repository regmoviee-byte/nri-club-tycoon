import {
  BUILD_CATALOG, FLOOR_PRICES, WALL_PRICES, expansionPrice,
  FURNITURE_REFUND_RATE, CONSTRUCTION_REFUND_RATE,
} from '../data/build-catalog.js';
import {surfacePlacementIssue,validSurface,parentTable,surfacePose,surfaceWorld,surfaceLocal} from './table-surface.js';

const LIMIT = 8192, MAX_PLOTS = 4096, MAX_CELLS = 12288;
const own = (value, key) => typeof key === 'string' && Object.hasOwn(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const integer = value => Number.isSafeInteger(value) && Math.abs(value) <= LIMIT;
const point = value => record(value) && integer(value.x) && integer(value.y);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const allowedKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key));
const neighbors = ({x, y}) => [{x, y: y - 1}, {x: x + 1, y}, {x, y: y + 1}, {x: x - 1, y}];
export const tileKey = (x, y) => `${x},${y}`;
export const edgeKey = edge => `${edge.axis}:${edge.x},${edge.y}`;
export const roomPurpose = room => room?.purpose ?? 'game';
const keyOf = cell => tileKey(cell.x, cell.y);
const keyPoint = key => { const [x, y] = key.split(',').map(Number); return {x, y}; };
const edgeBetween = (a, b) => a.x === b.x ? {axis: 'h', x: a.x, y: Math.max(a.y, b.y)} :
  {axis: 'v', x: Math.max(a.x, b.x), y: a.y};
const edgeSides = edge => edge.axis === 'h' ? [{x: edge.x, y: edge.y - 1}, {x: edge.x, y: edge.y}] :
  [{x: edge.x - 1, y: edge.y}, {x: edge.x, y: edge.y}];
const blocksEdge = wall => wall && !['door', 'wideDoor'].includes(wall.kind);
const cellEdges = cell => neighbors(cell).map(other => edgeBetween(cell, other));
const wallMap = layout => new Map(layout.walls.map(wall => [edgeKey(wall), wall]));
const ownedTiles = layout => {
  const tiles = new Set();
  for (const plot of layout.plots) for (let y = plot.y; y < plot.y + plot.h; y++) {
    for (let x = plot.x; x < plot.x + plot.w; x++) tiles.add(tileKey(x, y));
  }
  return tiles;
};

export function bounds(layout) {
  if (!layout?.plots?.length) return {x: 0, y: 0, w: 0, h: 0, minX: 0, minY: 0, maxX: 0, maxY: 0};
  const minX = Math.min(...layout.plots.map(plot => plot.x)), minY = Math.min(...layout.plots.map(plot => plot.y));
  const maxX = Math.max(...layout.plots.map(plot => plot.x + plot.w)), maxY = Math.max(...layout.plots.map(plot => plot.y + plot.h));
  return {x: minX, y: minY, w: maxX - minX, h: maxY - minY, minX, minY, maxX, maxY};
}

export function objectCells(object) {
  const item = own(BUILD_CATALOG, object?.kind) ? BUILD_CATALOG[object.kind] : undefined;
  if (!item || !integer(object.x) || !integer(object.y) || ![0, 1, 2, 3].includes(object.rotation)) return [];
  if(item.layer==='tabletop'&&object.surface)return [{x:object.x,y:object.y}];
  const [width, height] = object.rotation % 2 ? [item.height, item.width] : [item.width, item.height];
  return Array.from({length: width * height}, (_, index) => ({x: object.x + index % width, y: object.y + Math.floor(index / width)}));
}

function mountEdge(object) {
  return [
    {axis: 'h', x: object.x, y: object.y}, {axis: 'v', x: object.x + 1, y: object.y},
    {axis: 'h', x: object.x, y: object.y + 1}, {axis: 'v', x: object.x, y: object.y},
  ][object.rotation];
}
const objectEdges = object => BUILD_CATALOG[object.kind]?.layer === 'wall' && mountEdge(object) ? [mountEdge(object)] : [];

function navigation(layout) {
  const owned = ownedTiles(layout), blocked = new Set(), walls = wallMap(layout);
  for (const object of layout.objects) if (!BUILD_CATALOG[object.kind].passable) {
    for (const cell of objectCells(object)) blocked.add(keyOf(cell));
  }
  const visited = new Set(), parents = new Map(), distances = new Map(), queue = [];
  const entry = keyOf(layout.entry);
  if (owned.has(entry) && !blocked.has(entry)) { visited.add(entry); distances.set(entry, 0); queue.push(layout.entry); }
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index], currentKey = keyOf(current);
    for (const next of neighbors(current)) {
      const key = keyOf(next);
      if (!owned.has(key) || blocked.has(key) || visited.has(key) || blocksEdge(walls.get(edgeKey(edgeBetween(current, next))))) continue;
      visited.add(key); parents.set(key, currentKey); distances.set(key, distances.get(currentKey) + 1); queue.push(next);
    }
  }
  return {visited, parents, distances, walls};
}

// Walkable plot concrete exists even without a purchased decorative floor.
export function reachableTiles(layout) {
  if (structuralError(layout)) return new Set();
  return navigation(layout).visited;
}

function approaches(object, nav) {
  const footprint = new Set(objectCells(object).map(keyOf)), results = new Map();
  for (const cell of objectCells(object)) for (const next of neighbors(cell)) {
    const key = keyOf(next);
    if (!footprint.has(key) && nav.visited.has(key) && !blocksEdge(nav.walls.get(edgeKey(edgeBetween(cell, next))))) {
      results.set(key, {cell: next, destination: cell});
    }
  }
  return [...results.values()].sort((a, b) => nav.distances.get(keyOf(a.cell)) - nav.distances.get(keyOf(b.cell)) || a.cell.y - b.cell.y || a.cell.x - b.cell.x);
}

// Geometry-only access shared by construction, staff places and service use.
// A destination is the occupied cell reached from a free neighbouring cell.
export function objectApproaches(layout, objectOrId) {
  if (structuralError(layout)) return [];
  const object = typeof objectOrId === 'string' ? layout.objects.find(o => o.id === objectOrId) : objectOrId;
  const target=object&&BUILD_CATALOG[object.kind]?.layer==='tabletop'?parentTable(object,layout):object;
  return target ? approaches(target, navigation(layout)) : [];
}

export function roomBoundaryStatus(layout, roomId) {
  const invalid = structuralError(layout), room = layout?.rooms?.find(r => r.id === roomId);
  if (invalid || !room) return {ok: false, reasons: [invalid ?? 'Комната не найдена.']};
  const nav = navigation(layout), cells = new Set(room.cells.map(keyOf)), perimeter = new Map(), reasons = [];
  for (const cell of room.cells) for (const next of neighbors(cell)) if (!cells.has(keyOf(next))) {
    const edge = edgeBetween(cell, next); perimeter.set(edgeKey(edge), {edge, outside: next});
  }
  if ([...perimeter.keys()].some(key => !nav.walls.has(key))) reasons.push('Замкните стены по границе комнаты.');
  if (![...perimeter.entries()].some(([key, value]) => ['door', 'wideDoor'].includes(nav.walls.get(key)?.kind) && nav.visited.has(keyOf(value.outside)))) reasons.push('Нужна дверь с проходом от входа.');
  return {ok: !reasons.length, reasons};
}

function connected(cells) {
  if (!cells.length) return false;
  const keys = new Set(cells.map(keyOf)), seen = new Set([keyOf(cells[0])]), queue = [cells[0]];
  for (let index = 0; index < queue.length; index++) for (const next of neighbors(queue[index])) {
    const key = keyOf(next);
    if (keys.has(key) && !seen.has(key)) { seen.add(key); queue.push(next); }
  }
  return seen.size === keys.size;
}

function structuralError(layout) {
  if (!record(layout) || layout.version !== 1 || !Number.isSafeInteger(layout.revision) || layout.revision < 0 ||
      !allowedKeys(layout, ['version', 'revision', 'plots', 'entry', 'floors', 'walls', 'rooms', 'objects'])) return 'Некорректная версия планировки.';
  for (const key of ['plots', 'floors', 'walls', 'rooms', 'objects']) if (!Array.isArray(layout[key])) return 'Не хватает данных планировки.';
  if (!layout.plots.length || layout.plots.length > MAX_PLOTS || layout.floors.length > MAX_CELLS || layout.walls.length > MAX_CELLS * 4 ||
      layout.rooms.length > MAX_CELLS || layout.objects.length > MAX_CELLS * 4) return 'Планировка слишком велика или не содержит участка.';
  if (!point(layout.entry) || !allowedKeys(layout.entry, ['x', 'y'])) return 'Некорректная точка входа.';
  const ids = new Set(), occupiedPlots = new Set();
  const unique = id => validId(id) && !ids.has(id) && (ids.add(id), true);
  for (const plot of layout.plots) {
    if (!point(plot) || !unique(plot.id) || !Number.isSafeInteger(plot.w) || !Number.isSafeInteger(plot.h) || plot.w < 1 || plot.h < 1 || plot.w > 64 || plot.h > 64 || !integer(plot.x + plot.w) || !integer(plot.y + plot.h) ||
        !allowedKeys(plot, ['id', 'x', 'y', 'w', 'h'])) return 'Некорректный участок или повторяющийся идентификатор.';
    for (let y = plot.y; y < plot.y + plot.h; y++) for (let x = plot.x; x < plot.x + plot.w; x++) {
      const key = tileKey(x, y);
      if (occupiedPlots.has(key)) return 'Участки пересекаются.';
      occupiedPlots.add(key);
    }
  }
  if (occupiedPlots.size > MAX_CELLS) return 'Площадь клуба слишком велика.';
  if (!occupiedPlots.has(keyOf(layout.entry))) return 'Вход находится за пределами участка.';
  if (!connected([...occupiedPlots].map(keyPoint))) return 'Участки должны соприкасаться стороной.';
  const floors = new Set();
  for (const floor of layout.floors) {
    if (!point(floor) || !allowedKeys(floor, ['x', 'y', 'finish']) || !own(FLOOR_PRICES, floor.finish) ||
        !occupiedPlots.has(keyOf(floor)) || floors.has(keyOf(floor))) return 'Некорректное или повторяющееся покрытие пола.';
    floors.add(keyOf(floor));
  }
  const walls = new Map();
  for (const wall of layout.walls) {
    if (!point(wall) || !unique(wall.id) || !['h', 'v'].includes(wall.axis) || !own(WALL_PRICES, wall.kind) ||
        !allowedKeys(wall, ['id', 'x', 'y', 'axis', 'kind']) || walls.has(edgeKey(wall)) ||
        !edgeSides(wall).some(cell => occupiedPlots.has(keyOf(cell)))) return 'Некорректная, повторяющаяся или внешняя стена.';
    walls.set(edgeKey(wall), wall);
  }
  const zones = new Map(), roomNumbers = new Set();
  for (const room of layout.rooms) {
    if (!record(room) || !unique(room.id) || !Number.isSafeInteger(room.number) || room.number < 1 || roomNumbers.has(`${roomPurpose(room)}:${room.number}`) ||
        typeof room.name !== 'string' || !room.name.trim() || room.name.length > 120 || !Array.isArray(room.cells) ||
        !room.cells.length || room.cells.length > MAX_CELLS || !allowedKeys(room, ['id', 'number', 'name', 'cells', 'purpose']) ||
        (room.purpose !== undefined && !['game', 'staff'].includes(room.purpose))) return 'Некорректная зона комнаты.';
    roomNumbers.add(`${roomPurpose(room)}:${room.number}`);
    for (const cell of room.cells) {
      if (!point(cell) || !allowedKeys(cell, ['x', 'y']) || !occupiedPlots.has(keyOf(cell)) || zones.has(keyOf(cell))) return 'Зоны пересекаются или выходят за участок.';
      zones.set(keyOf(cell), room.id);
    }
    if (!connected(room.cells)) return 'Клетки комнаты должны соединяться стороной.';
  }
  const roomIds = new Set(layout.rooms.map(room => room.id)), layers = new Set(), seatIds = new Set();
  for (const object of layout.objects) {
    if (!record(object) || !unique(object.id) || !own(BUILD_CATALOG, object.kind) || !integer(object.x) || !integer(object.y) ||
        ![0, 1, 2, 3].includes(object.rotation) || !allowedKeys(object, ['id', 'kind', 'x', 'y', 'rotation', 'roomId', 'seat', 'role', 'enabled', 'serviceEnabled', 'stock', 'autoRefill', 'price','surface'])) return 'Некорректный предмет или повторяющийся идентификатор.';
    if (object.enabled !== undefined && typeof object.enabled !== 'boolean' || object.serviceEnabled !== undefined && typeof object.serviceEnabled !== 'boolean' || object.autoRefill !== undefined && typeof object.autoRefill !== 'boolean' || object.stock !== undefined && (!Number.isSafeInteger(object.stock) || object.stock < 0 || object.stock > 1000000) || object.price !== undefined && (!Number.isSafeInteger(object.price) || object.price < 0 || object.price > 1000000000)) return 'Повреждены запас или стоимость предмета.';
    const item = BUILD_CATALOG[object.kind], cells = objectCells(object);
    if(object.surface&&(item.layer!=='tabletop'||!validSurface(object.surface)))return 'Повреждена позиция настольного предмета.';
    if(object.surface){const issue=surfacePlacementIssue(object,layout);if(issue)return issue;if(parentTable(object,layout)?.roomId!==object.roomId)return 'Настольный предмет назначен другой комнате.';}
    if (own(object, 'roomId') && !roomIds.has(object.roomId)) return 'Предмет назначен неизвестной комнате.';
    if (cells.some(cell => !occupiedPlots.has(keyOf(cell)) || (object.roomId && zones.get(keyOf(cell)) !== object.roomId))) return 'Предмет выходит за участок или свою комнату.';
    if (own(object, 'role') || own(object, 'seat')) {
      if (item.family !== 'chair' || !object.roomId || roomPurpose(layout.rooms.find(r => r.id === object.roomId)) !== 'game' || !['guest', 'master'].includes(object.role) ||
          (object.role === 'guest' ? ![0, 1, 2, 3].includes(object.seat) : own(object, 'seat'))) return 'Некорректное назначение игрового стула.';
      const seat = `${object.roomId}:${object.role}:${object.seat ?? 'master'}`;
      if (seatIds.has(seat)) return 'В комнате повторяется номер места.';
      seatIds.add(seat);
    }
    if (!item.passable && cells.some(cell => keyOf(cell) === keyOf(layout.entry))) return 'Вход нельзя загородить мебелью.';
    if (item.layer === 'wall') {
      const edge = mountEdge(object);
      if (walls.get(edgeKey(edge))?.kind !== 'wall') return `${item.name}: нужна сплошная стена с выбранной стороны.`;
      const key = `wall:${edgeKey(edge)}`;
      if (layers.has(key)) return 'На этой стене уже закреплён предмет.';
      layers.add(key);
    } else if(item.layer!=='tabletop'||!object.surface) {
      for (const cell of cells) {
        const key = `${object.kind === 'mat' ? 'tabletop-base' : item.layer}:${keyOf(cell)}`;
        if (layers.has(key)) return 'Предметы занимают одно и то же место.';
        layers.add(key);
      }
    }
    if (!item.passable) {
      const keys = new Set(cells.map(keyOf));
      for (const cell of cells) for (const next of neighbors(cell)) {
        if (keys.has(keyOf(next)) && walls.has(edgeKey(edgeBetween(cell, next)))) return 'Стена проходит сквозь предмет.';
      }
    }
    if (item.layer === 'tabletop' && !object.surface && !layout.objects.some(table => BUILD_CATALOG[table?.kind]?.family === 'table' &&
        cells.every(cell => objectCells(table).some(other => keyOf(other) === keyOf(cell))))) return `${item.name}: поставьте на игровой стол.`;
  }
  return undefined;
}

export function validateLayout(layout, {lockedRoomIds = []} = {}) {
  const reason = structuralError(layout);
  if (reason) return {ok: false, reason};
  if (!Array.isArray(lockedRoomIds) || lockedRoomIds.some(id => !layout.rooms.some(room => room.id === id))) return {ok: false, reason: 'Не найдена работающая комната.'};
  const nav = navigation(layout);
  for (const object of layout.objects) if (BUILD_CATALOG[object.kind].family === 'chair' && object.roomId && !approaches(object, nav).length) {
    return {ok: false, reason: `К стулу в комнате «${layout.rooms.find(room => room.id === object.roomId).name}» нет прохода.`};
  }
  if (lockedRoomIds.some(id => !roomReadiness(layout, id).ok)) return {ok: false, reason: 'Работающая комната должна сохранять стол, места, свет и проходы.'};
  return {ok: true};
}

export function roomReadiness(layout, roomId) {
  const invalid = structuralError(layout), room = Array.isArray(layout?.rooms) ? layout.rooms.find(room => room?.id === roomId) : undefined;
  if (invalid || !room) return {ok: false, reasons: [invalid ?? 'Комната не найдена.'], seats: [], blocked: []};
  if (roomPurpose(room) !== 'game') return {ok: false, reasons: ['Эта комната предназначена для отдыха мастеров.'], seats: [], blocked: []};
  const reasons = [], objects = layout.objects.filter(object => object.roomId === roomId);
  const seats = objects.filter(object => BUILD_CATALOG[object.kind].family === 'chair' && object.role === 'guest').sort((a, b) => a.seat - b.seat);
  const master = objects.find(object => BUILD_CATALOG[object.kind].family === 'chair' && object.role === 'master');
  const tables = objects.filter(object => BUILD_CATALOG[object.kind].family === 'table'), nav = navigation(layout);
  const cells = new Set(room.cells.map(keyOf)), perimeter = new Map();
  for (const cell of room.cells) for (const next of neighbors(cell)) if (!cells.has(keyOf(next))) {
    const edge = edgeBetween(cell, next); perimeter.set(edgeKey(edge), {edge, outside: next});
  }
  if (room.cells.length < 25) reasons.push('Для игровой комнаты нужно не меньше 25 клеток.');
  if ([...perimeter.keys()].some(key => !nav.walls.has(key))) reasons.push('Замкните стены по границе комнаты.');
  if (![...perimeter.entries()].some(([key, value]) => ['door', 'wideDoor'].includes(nav.walls.get(key)?.kind) && nav.visited.has(keyOf(value.outside)))) reasons.push('Нужна дверь с проходом от входа.');
  if (!tables.length) reasons.push('Поставьте игровой стол.');
  if (seats.length !== 4 || seats.some((seat, index) => seat.seat !== index)) reasons.push('Нужны четыре гостевых стула с разными номерами.');
  if (!master) reasons.push('Нужно отдельное место мастера.');
  if (!objects.some(object => BUILD_CATALOG[object.kind].family === 'light')) reasons.push('Добавьте светильник.');
  const assignedChairs = objects.filter(object => BUILD_CATALOG[object.kind].family === 'chair' && object.role);
  const blocked = assignedChairs.filter(chair => !approaches(chair, nav).length).map(({x, y}) => ({x, y}));
  if (blocked.length) reasons.push('Оставьте проход к каждому игровому стулу.');
  if (tables.length && assignedChairs.some(chair => !tables.some(table => objectCells(table).some(cell =>
      neighbors(chair).some(next => keyOf(next) === keyOf(cell) && !blocksEdge(nav.walls.get(edgeKey(edgeBetween(chair, cell))))))))) reasons.push('Каждый игровой стул должен стоять рядом со столом.');
  return {ok: !reasons.length, reasons, seats, master, blocked};
}

export function createStarterLayout(roomId = 'room-1') {
  const cells = Array.from({length: 25}, (_, index) => ({x: 1 + index % 5, y: Math.floor(index / 5)}));
  const walls = [];
  for (let x = 1; x <= 5; x++) for (const y of [0, 5]) walls.push({id: `${roomId}-wall-h-${x}-${y}`, x, y, axis: 'h', kind: 'wall'});
  for (let y = 0; y <= 4; y++) for (const x of [1, 6]) walls.push({id: `${roomId}-wall-v-${x}-${y}`, x, y, axis: 'v', kind: x === 1 && y === 4 ? 'door' : 'wall'});
  return {version: 1, revision: 0, plots: [{id: `${roomId}-plot`, x: 0, y: 0, w: 6, h: 8}], entry: {x: 0, y: 7},
    floors: cells.map(cell => ({...cell, finish: 'wood'})), walls, rooms: [{id: roomId, number: 1, name: 'Комната 1', cells}],
    objects: [
      {id: `${roomId}-table`, kind: 'table', x: 2, y: 1, rotation: 0, roomId},
      ...[[1, 1], [1, 2], [4, 1], [4, 2]].map(([x, y], seat) => ({id: `${roomId}-chair-${seat}`, kind: 'chair', x, y, rotation: x === 1 ? 1 : 3, roomId, role: 'guest', seat})),
      {id: `${roomId}-master-chair`, kind: 'chair', x: 2, y: 3, rotation: 0, roomId, role: 'master'},
      {id: `${roomId}-light`, kind: 'light', x: 3, y: 2, rotation: 0, roomId},
    ]};
}

function protectedGeometry(layout, lockedRoomIds) {
  const tiles = new Set(), edges = new Set(), nav = navigation(layout);
  for (const room of layout.rooms.filter(room => lockedRoomIds.includes(room.id))) {
    for (const cell of room.cells) { tiles.add(keyOf(cell)); for (const edge of cellEdges(cell)) edges.add(edgeKey(edge)); }
    for (const chair of layout.objects.filter(object => object.roomId === room.id && BUILD_CATALOG[object.kind].family === 'chair')) {
      const approach = approaches(chair, nav)[0];
      if (!approach) continue;
      edges.add(edgeKey(edgeBetween(approach.cell, approach.destination)));
      let current = keyOf(approach.cell);
      while (current) {
        tiles.add(current);
        const parent = nav.parents.get(current);
        if (parent) edges.add(edgeKey(edgeBetween(keyPoint(current), keyPoint(parent))));
        current = parent;
      }
    }
  }
  return {tiles, edges};
}

function allocateId(layout, prefix) {
  const ids = new Set([...layout.plots, ...layout.rooms, ...layout.walls, ...layout.objects].map(value => value.id));
  let number = 1;
  while (ids.has(`${prefix}-${number}`)) number++;
  return `${prefix}-${number}`;
}

function containingRoom(layout, object) {
  const cells = objectCells(object);
  return layout.rooms.find(room => cells.length && cells.every(cell => room.cells.some(other => keyOf(other) === keyOf(cell))))?.id;
}

export function quoteEdit(layout, edit, {lockedRoomIds = []} = {}) {
  const before = validateLayout(layout, {lockedRoomIds});
  const fail = reason => ({ok: false, reason, cost: 0, refund: 0, next: null});
  if (!before.ok) return fail(before.reason);
  if (!record(edit)) return fail('Выберите действие строительства.');
  const next = structuredClone(layout), protectedSet = protectedGeometry(layout, lockedRoomIds);
  let cost = 0, refund = 0;
  const protect = (cells = [], edges = [], roomIds = []) => {
    if (roomIds.some(id => lockedRoomIds.includes(id)) || cells.some(cell => protectedSet.tiles.has(keyOf(cell))) ||
        edges.some(edge => protectedSet.edges.has(edgeKey(edge)))) throw new Error('Комната занята: дождитесь конца игры или подготовки стола, чтобы менять её предметы и проходы.');
  };
  const apply = (change, depth = 0) => {
    if (!record(change) || depth > 1) throw new Error('Некорректный набор изменений.');
    if (change.type === 'batch') {
      if (depth || !Array.isArray(change.edits) || !change.edits.length || change.edits.length > MAX_CELLS) throw new Error('Некорректный набор изменений.');
      for (const child of change.edits) apply(child, depth + 1);
    } else if (change.type === 'place') {
      if (!record(change.object) || !own(BUILD_CATALOG, change.object.kind)) throw new Error('Выберите предмет из каталога.');
      const object = structuredClone(change.object);
      object.id ??= allocateId(next, object.kind); object.rotation ??= 0;
      // Acquisition price and service stock are owned state, never caller-
      // supplied free inventory in a placement preview.
      object.price = BUILD_CATALOG[object.kind].price;
      if (object.stock !== undefined) object.stock = 0;
      if (!object.roomId) { const roomId = containingRoom(next, object); if (roomId) object.roomId = roomId; }
      protect(objectCells(object), objectEdges(object), [object.roomId]);
      next.objects.push(object); cost += BUILD_CATALOG[object.kind].price;
    } else if (['move', 'remove', 'upgrade'].includes(change.type)) {
      const index = next.objects.findIndex(object => object.id === change.id), object = next.objects[index];
      if (!object) throw new Error('Предмет не найден.');
      const attached=BUILD_CATALOG[object.kind].family==='table'?next.objects.filter(o=>BUILD_CATALOG[o.kind]?.layer==='tabletop'&&parentTable(o,next)?.id===object.id).map(o=>({object:o,pose:surfacePose(o,next),surface:o.surface??surfaceLocal(object,surfacePose(o,next),surfacePose(o,next).angle)})):[];
      protect(objectCells(object), objectEdges(object), [object.roomId]);
      if (change.type === 'remove') { if(attached.length)throw new Error('Сначала уберите настольные предметы. При переносе стола они перемещаются вместе с ним.');next.objects.splice(index, 1); refund += Math.floor((object.price ?? BUILD_CATALOG[object.kind].price) * FURNITURE_REFUND_RATE); }
      else if (change.type === 'upgrade') {
        const old = BUILD_CATALOG[object.kind], replacement = own(BUILD_CATALOG, change.kind) ? BUILD_CATALOG[change.kind] : undefined;
        if (!replacement || !old.family || old.family !== replacement.family || replacement.kind === old.kind) throw new Error('Выберите другой предмет того же назначения.');
        const paidPrice = object.price ?? old.price;
        object.kind = change.kind; object.price = replacement.price;
        if (object.stock !== undefined) object.stock = 0;
        protect(objectCells(object), objectEdges(object), [object.roomId]);
        cost += replacement.price; refund += Math.floor(paidPrice * FURNITURE_REFUND_RATE);
      } else {
        object.x = change.x; object.y = change.y; object.rotation = change.rotation ?? object.rotation;
        if(own(change,'surface'))object.surface=structuredClone(change.surface);
        const roomId = containingRoom(next, object);
        if (roomId) object.roomId = roomId;
        else { delete object.roomId; delete object.role; delete object.seat; }
        for (const key of ['roomId', 'role', 'seat']) if (own(change, key)) {
          if (change[key] === null) delete object[key]; else object[key] = change[key];
        }
        protect(objectCells(object), objectEdges(object), [object.roomId]);
        for(const child of attached){const o=child.object;if(o.kind==='mat'&&!o.surface){o.x=object.x;o.y=object.y;o.rotation=0;}else{o.surface=child.surface;const pose=surfaceWorld(object,o.surface);o.x=Math.floor(pose.x);o.y=Math.floor(pose.y);}if(object.roomId)o.roomId=object.roomId;else delete o.roomId;}
      }
    } else if (change.type === 'floor') {
      if (!Array.isArray(change.cells) || !change.cells.length || change.cells.length > MAX_CELLS ||
          change.cells.some(cell => !point(cell)) || (change.finish !== null && !own(FLOOR_PRICES, change.finish))) throw new Error('Выберите клетки и покрытие пола.');
      const unique = new Set(change.cells.map(keyOf));
      if (unique.size !== change.cells.length) throw new Error('Клетки покрытия повторяются.');
      const owned = ownedTiles(next);
      if (change.cells.some(cell => !owned.has(keyOf(cell)))) throw new Error('Покрытие находится за пределами участка.');
      protect(change.cells);
      for (const cell of change.cells) {
        const index = next.floors.findIndex(floor => keyOf(floor) === keyOf(cell)), old = next.floors[index];
        if (old?.finish === change.finish) continue;
        if (old) { next.floors.splice(index, 1); refund += FLOOR_PRICES[old.finish] * CONSTRUCTION_REFUND_RATE; }
        if (change.finish !== null) { next.floors.push({x: cell.x, y: cell.y, finish: change.finish}); cost += FLOOR_PRICES[change.finish]; }
      }
    } else if (change.type === 'wall') {
      if (!point(change.edge) || !['h', 'v'].includes(change.edge.axis) || !own(WALL_PRICES, change.kind)) throw new Error('Выберите грань клетки и тип стены.');
      protect([], [change.edge]);
      const old = next.walls.find(wall => edgeKey(wall) === edgeKey(change.edge));
      if (!old) {
        next.walls.push({id: change.edge.id ?? allocateId(next, 'wall'), x: change.edge.x, y: change.edge.y, axis: change.edge.axis, kind: change.kind});
        cost += WALL_PRICES[change.kind];
      } else if (old.kind !== change.kind) {
        const base = WALL_PRICES.wall;
        cost += WALL_PRICES[change.kind] - base;
        refund += (WALL_PRICES[old.kind] - base) * CONSTRUCTION_REFUND_RATE;
        old.kind = change.kind;
      }
    } else if (change.type === 'removeWall') {
      const index = next.walls.findIndex(wall => wall.id === change.id), wall = next.walls[index];
      if (!wall) throw new Error('Стена не найдена.');
      protect([], [wall]); next.walls.splice(index, 1); refund += WALL_PRICES[wall.kind] * CONSTRUCTION_REFUND_RATE;
    } else if (change.type === 'buyCells') {
      if (!Array.isArray(change.cells) || !change.cells.length || change.cells.length > 200 || change.cells.some(cell => !point(cell))) throw new Error('Выберите от 1 до 200 клеток участка.');
      const occupied = ownedTiles(next), selected = new Set(change.cells.map(keyOf));
      if (selected.size !== change.cells.length || change.cells.some(cell => occupied.has(keyOf(cell)))) throw new Error('Эти клетки уже куплены или повторяются.');
      for (const cell of change.cells) next.plots.push({id: allocateId(next, 'cell'), x: cell.x, y: cell.y, w: 1, h: 1});
      cost += change.cells.length * 125;
    } else if (change.type === 'expand') {
      const source = next.plots.find(plot => plot.id === (change.plotId ?? next.plots[0].id));
      const offset = {east: [6, 0], west: [-6, 0], north: [0, -8], south: [0, 8]}[change.direction];
      if (!source || !offset || next.plots.length >= MAX_PLOTS) throw new Error('Выберите свободную сторону участка.');
      cost += expansionPrice(next.plots.length + 1);
      next.plots.push({id: allocateId(next, 'plot'), x: source.x + offset[0], y: source.y + offset[1], w: 6, h: 8});
    } else if (change.type === 'room') {
      const old = next.rooms.find(room => room.id === change.id);
      if (!Array.isArray(change.cells) || !change.cells.length || change.cells.length > MAX_CELLS || change.cells.some(cell => !point(cell))) throw new Error('Выделите связанную игровую зону.');
      protect([...(old?.cells ?? []), ...change.cells], [], [old?.id]);
      const purpose = change.purpose ?? old?.purpose;
      const samePurpose = old && roomPurpose(old) === (purpose ?? 'game');
      const number = change.number ?? (samePurpose ? old.number : Math.max(0, ...next.rooms.filter(room => roomPurpose(room) === (purpose ?? 'game')).map(room => room.number)) + 1);
      const room = {id: old?.id ?? change.id ?? allocateId(next, 'room'), number, name: change.name ?? old?.name ?? `Комната ${number}`, ...(purpose !== undefined ? {purpose} : {}), cells: change.cells.map(({x, y}) => ({x, y}))};
      if (old) next.rooms[next.rooms.indexOf(old)] = room; else next.rooms.push(room);
    } else if (change.type === 'removeRoom') {
      const room = next.rooms.find(room => room.id === change.id);
      if (!room) throw new Error('Комната не найдена.');
      protect(room.cells, [], [room.id]);
      if (next.objects.some(object => object.roomId === room.id)) throw new Error('Сначала перенесите предметы из этой комнаты.');
      next.rooms.splice(next.rooms.indexOf(room), 1);
    } else throw new Error('Неизвестное действие строительства.');
  };
  try { apply(edit); } catch (error) { return fail(error.message); }
  next.revision = layout.revision + 1;
  const after = validateLayout(next, {lockedRoomIds});
  if (!after.ok) return fail(after.reason);
  return {ok: true, cost, refund, next};
}

export function decodeLayout(value) {
  try {
    const layout = typeof value === 'string' ? JSON.parse(value) : structuredClone(value);
    return validateLayout(layout).ok ? layout : null;
  } catch { return null; }
}
export function serializeLayout(layout) { return validateLayout(layout).ok ? JSON.stringify(layout) : null; }
