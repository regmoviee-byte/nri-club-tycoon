import {BUILD_CATALOG} from '../data/build-catalog.js';
import {objectCells, objectApproaches, roomBoundaryStatus, roomPurpose} from './layout.js';

const sameCell = (a, b) => a.x === b.x && a.y === b.y;

export function inspectStaffRoom(layout, roomId) {
  const room = layout?.rooms?.find(r => r.id === roomId);
  if (!room || roomPurpose(room) !== 'staff') return {id: roomId, ok: false, reasons: ['Комната отдыха мастеров не найдена.'], seats: []};
  const boundary = roomBoundaryStatus(layout, roomId), reasons = [...boundary.reasons];
  const objects = layout.objects.filter(o => o.roomId === roomId);
  if (!objects.some(o => BUILD_CATALOG[o.kind]?.family === 'light' && o.enabled !== false)) reasons.push('Включите свет в комнате отдыха.');
  const seats = [];
  for (const object of objects.filter(o => BUILD_CATALOG[o.kind]?.family === 'staffSeat' && o.enabled !== false)) {
    const item = BUILD_CATALOG[object.kind], approaches = objectApproaches(layout, object);
    // Each visible cushion has its own adjacent approach. Reaching only one end
    // of a bench cannot make three blocked cushions count as three staff places.
    const cells = objectCells(object);
    if (object.rotation === 2 || object.rotation === 3) cells.reverse();
    for (const [seatIndex, cell] of cells.slice(0, item.staffCapacity).entries()) {
      if (approaches.some(a => sameCell(a.destination, cell))) seats.push({roomId, objectId: object.id, seatIndex, ...cell, rotation: object.rotation, restRate: item.restRate});
    }
  }
  if (!seats.length) reasons.push('Поставьте места отдыха и оставьте подход к каждому сиденью.');
  // Incomplete rooms can be drafted, but contribute no staff capacity.
  return {id: roomId, name: room.name, ok: !reasons.length, reasons, seats: reasons.length ? [] : seats};
}

export function staffRoomStatus(club) {
  const staff = club.staff ?? [], rooms = (club.layout?.rooms ?? []).filter(r => roomPurpose(r) === 'staff').map(r => inspectStaffRoom(club.layout, r.id));
  const seats = rooms.flatMap(r => r.seats), staffIds = new Set(staff.map(m => m.id));
  const legacyIds = [...new Set(club.staffRoomLegacyIds ?? [])].filter(id => staffIds.has(id));
  // Legacy credit belongs only to migrated people. Physical places replace it,
  // never add to it; new hires always need a genuinely free physical place.
  const capacity = Math.max(seats.length, legacyIds.length), hired = staff.length;
  const assignments = staff.map((master, index) => ({masterId: master.id, seat: seats[index] ?? null}));
  const reason = capacity < hired ? `Мест отдыха ${capacity}, нанято мастеров ${hired}. Сначала добавьте доступные места.` :
    seats.length < hired ? 'Часть мастеров из старого сохранения ещё не имеет физического места отдыха.' :
      !capacity ? 'Разметьте комнату «Отдых мастеров», добавьте свет и доступные места.' : '';
  return {capacity, physicalCapacity: seats.length, hired, used: hired, available: Math.max(0, seats.length - hired), free: Math.max(0, seats.length - hired), rooms, seats, assignments, legacyCount: legacyIds.length, ready: capacity >= hired && seats.length >= hired, reason};
}

export function staffSeatForMaster(club, masterId) {
  return staffRoomStatus(club).assignments.find(a => a.masterId === masterId)?.seat ?? null;
}

export function staffCanRest(club, masterId) {
  const master = club.staff?.find(m => m.id === masterId);
  return Boolean(master && !master.training && staffSeatForMaster(club, masterId) &&
    !club.rooms?.some(r => r.status === 'running' && (r.masterId === masterId || r.run?.room?.master?.id === masterId)));
}

export function canHireStaff(club) {
  return staffRoomStatus(club).free > 0;
}

// The transition is permanent once every hired master has a real place. Keep
// the legacy list during a partial retrofit so old staff can be housed in steps;
// after completion, later demolition cannot revive abstract migration credit.
// Mutates only the caller's draft (or explicitly migrated save), never geometry.
export function retireStaffRoomLegacyCredit(club) {
  if (Array.isArray(club.staffRoomLegacyIds) && staffRoomStatus(club).physicalCapacity >= (club.staff?.length ?? 0)) club.staffRoomLegacyIds = [];
  return club;
}

export function validateStaffCapacity(club) {
  if (!Array.isArray(club.staff)) return {ok: true};
  const status = staffRoomStatus(club);
  return status.capacity >= status.hired ? {ok: true} : {ok: false, reason: status.reason};
}

export function physicalServiceAccess(club, itemId) {
  const item = club.layout?.objects?.find(o => o.id === itemId);
  if (!item) return {ok: false, zoneId: null, reason: 'Предмет сервиса не найден.'};
  const ok = objectApproaches(club.layout, item).length > 0;
  return {ok, zoneId: item.roomId ?? null, reason: ok ? '' : 'К предмету нет прохода от входа.'};
}
