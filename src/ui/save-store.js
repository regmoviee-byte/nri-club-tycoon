// IndexedDB is canonical once a record exists. localStorage is read only as a
// legacy source and is never overwritten or removed by this module.
export const SAVE_DATABASE = 'nri-club-tycoon:saves';
export const SAVE_DATABASE_VERSION = 1;
const conflict = () => new Error('Сохранение изменилось в другой вкладке. Перезагрузите игру перед следующим действием.');
const versionOf = raw => { try { return JSON.parse(raw)?.version ?? null; } catch { return null; } };
const token = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const validEnvelope = record => record && typeof record.raw === 'string' && record.raw.length > 0 && Number.isSafeInteger(record.revision) && record.revision > 0 && typeof record.token === 'string' && record.token.length > 0;
const sameRecord = (a, b) => (!a && !b) || Boolean(a && b && Object.is(a.revision,b.revision) && Object.is(a.token,b.token) && (Object.is(a.raw,b.raw) || typeof a.raw === 'object' && typeof b.raw === 'object' && JSON.stringify(a.raw) === JSON.stringify(b.raw)));

export function openSaveDatabase({indexedDB = globalThis.indexedDB, databaseName = SAVE_DATABASE} = {}) {
  if (!indexedDB) return Promise.reject(new Error('Браузер не разрешает доступ к хранилищу клуба.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, SAVE_DATABASE_VERSION);
    let refused = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves', {keyPath: 'key'});
      if (!db.objectStoreNames.contains('archives')) db.createObjectStore('archives', {keyPath: 'id'});
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { refused = true; reject(new Error('Закройте старые вкладки клуба и перезагрузите эту страницу, чтобы открыть хранилище.')); };
    request.onsuccess = () => {
      const db = request.result;
      if (refused) { db.close(); return; }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

function readRecord(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('saves', 'readonly'), request = transaction.objectStore('saves').get(key);
    transaction.oncomplete = () => resolve(request.result ?? null);
    transaction.onabort = () => reject(transaction.error ?? new Error('Не удалось прочитать сохранение.'));
  });
}

export async function createSaveStore({storage, key, decode, encode, now = Date.now, ...databaseOptions}) {
  const db = await openSaveDatabase(databaseOptions);
  let expected;
  try { expected = await readRecord(db, key); } catch (error) { db.close(); throw error; }
  // Do not even access localStorage after migration: it can be unavailable or
  // contain the intentionally retained, older, original record.
  const readLegacy = () => (storage === undefined ? globalThis.localStorage : storage)?.getItem(key) ?? null;
  let legacy;
  try { legacy = expected ? null : readLegacy(); } catch (error) { db.close(); throw error; }
  let raw = expected ? expected.raw : legacy, originalVersion = versionOf(raw), loadedVersion = originalVersion, busy = false;
  return {
    read() {
      if ((expected || legacy !== null) && (typeof raw !== 'string' || !raw.length || expected && !validEnvelope(expected))) throw new Error('Повреждена запись хранилища клуба. Исходная запись сохранена для восстановления.');
      const club = decode(raw);
      loadedVersion = club?.version ?? originalVersion;
      return club;
    },
    raw: () => typeof raw === 'string' ? raw : expected ? JSON.stringify(expected) : null,
    close: () => db.close(),
    async archives() {
      const records=await new Promise((resolve,reject)=>{const tx=db.transaction('archives','readonly'),request=tx.objectStore('archives').getAll();tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error);});
      return records.filter(r=>r.key===key).sort((a,b)=>b.createdAt-a.createdAt).map(r=>{try{const c=decode(r.raw);if(!c)throw Error();return {id:r.id,createdAt:r.createdAt,valid:true,title:(c.administrator?.name??'Клуб')+' · день '+(Math.floor(c.clock/24)+1)+' · '+c.finance.cash.toLocaleString('ru-RU')+' ₽'};}catch{return{id:r.id,createdAt:r.createdAt,valid:false,title:'Запись не удалось прочитать'};}});
    },
    async archive(id) {
      const record=await new Promise((resolve,reject)=>{const tx=db.transaction('archives','readonly'),request=tx.objectStore('archives').get(id);tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error);});
      if(!record||record.key!==key)throw Error('Клуб не найден в архиве.');
      const club=decode(record.raw);if(!club)throw Error('Не удалось прочитать клуб из архива.');return club;
    },
    async write(club, {archive = false} = {}) {
      if (busy) throw new Error('Предыдущее изменение ещё сохраняется.');
      busy = true;
      try {
        const nextRaw = encode(club);
        if (typeof nextRaw !== 'string' || !nextRaw.length) throw new Error('Пустое сохранение не может заменить историю клуба.');
        const next = {key, revision: (Number.isSafeInteger(expected?.revision) && expected.revision > 0 ? expected.revision : 0) + 1, token: token(), raw: nextRaw};
        const migrating = originalVersion !== loadedVersion;
        // Backup and new record are in the SAME strict-durability transaction.
        // Failed backup, failed final put, quota or abort leaves both unchanged.
        await new Promise((resolve, reject) => {
          let failure;
          const transaction = db.transaction(['saves', 'archives'], 'readwrite', {durability: 'strict'});
          transaction.oncomplete = resolve;
          transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Запись сохранения отменена.'));
          const request = transaction.objectStore('saves').get(key);
          request.onsuccess = () => {
            try {
              if (!sameRecord(request.result ?? null, expected)) throw conflict();
              if (!expected && readLegacy() !== legacy) throw conflict();
              if ((expected || legacy !== null) && (archive || !expected || migrating)) {
                const label = archive ? 'previous' : `${!expected ? 'localStorage-' : ''}migration-v${originalVersion}-to-v${loadedVersion}`;
                transaction.objectStore('archives').add({id: `${key}:${label}:${now()}:${next.token}`, key, label, createdAt: now(), raw: typeof raw === 'string' ? raw : JSON.stringify(expected), ...(expected && !validEnvelope(expected) ? {record: expected} : {}), source: expected ? 'indexedDB' : 'localStorage'});
              }
              transaction.objectStore('saves').put(next);
            } catch (error) { failure = error; transaction.abort(); }
          };
        });
        expected = next; raw = nextRaw; legacy = null;
        originalVersion = loadedVersion = club && typeof club === 'object' && 'version' in club ? club.version : versionOf(nextRaw);
        return true;
      } finally { busy = false; }
    },
  };
}

// Explicit tooling/import entrypoint. Call from a same-origin blank page before
// loading the game. The writer lock prevents importing into an active campaign;
// replaced records (including corrupt ones) are archived atomically in IndexedDB.
export async function importSaveRecord({key, raw, decode, storage, locks = globalThis.navigator?.locks, ...databaseOptions}) {
  if (!locks?.request) throw new Error('Для импорта нужна защита сохранения между вкладками.');
  if (typeof raw !== 'string' || !raw.length || decode(raw) == null) throw new Error('Импортируемая запись пуста или повреждена.'); // Preserve the exact validated input.
  return locks.request(`nri-writer:${key}`, {ifAvailable: true}, async lock => {
    if (!lock) throw new Error('Сначала закройте вкладки с этим клубом.');
    const store = await createSaveStore({storage, key, decode: value => value, encode: value => value, ...databaseOptions});
    try { await store.write(raw, {archive: true}); } finally { store.close(); }
    return true;
  });
}

export async function claimSaveWriter(key, {locks = globalThis.navigator?.locks, lifecycle = globalThis} = {}) {
  if (!locks?.request) return {writable: false, reason: 'В этом браузере недоступна защита сохранения между вкладками. Откройте игру в современном браузере.'};
  return new Promise(resolve => {
    locks.request(`nri-writer:${key}`, {ifAvailable: true}, async lock => {
      if (!lock) { resolve({writable: false, reason: 'Этот клуб уже открыт в другой вкладке. Здесь доступен просмотр. Закройте другую вкладку и перезагрузите эту, чтобы играть.'}); return; }
      let release;
      const held = new Promise(done => { release = done; });
      lifecycle.addEventListener?.('pagehide', release, {once: true});
      resolve({writable: true, release});
      await held;
    }).catch(() => resolve({writable: false, reason: 'Не удалось защитить сохранение между вкладками. Перезагрузите игру.'}));
  });
}
