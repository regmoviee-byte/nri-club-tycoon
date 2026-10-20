import {decodeClub,encodeClub} from '../model/campaign.js';

// Bound memory use before reading a user-selected file. IndexedDB itself has
// a browser-managed quota, not a fixed file-size limit.
export const MAX_SAVE_FILE_BYTES = 100 * 1024 * 1024;

export function saveDownload(club, date = new Date()) {
  return {
    raw: encodeClub(club),
    filename: `nri-club-v${club.version}-${date.toISOString().replace(/[:.]/g, '-')}.json`,
  };
}

export async function readSaveFile(file) {
  if (!file || !Number.isSafeInteger(file.size) || file.size <= 0) throw new Error('Выберите непустой файл сохранения JSON.');
  if (file.size > MAX_SAVE_FILE_BYTES) throw new Error('Файл слишком большой. Можно загрузить сохранение размером до 100 МиБ.');
  let raw;
  try { raw = await file.text(); }
  catch { throw new Error('Не удалось прочитать файл. Выберите его ещё раз.'); }
  try {
    const club = decodeClub(raw);
    if (!club) throw new Error('empty');
    return club;
  } catch {
    throw new Error('Файл сохранения повреждён или создан неподдерживаемой версией игры. Текущий прогресс не изменён.');
  }
}
