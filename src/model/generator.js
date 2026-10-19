import { DATA_VERSION, names, motifs, dimensions, priorities, formats, experiences, boundaries, company, values, politics, contexts } from '../data/catalog.js';

export const MODEL_VERSION = 1;
export const DEFAULT_SEED = 'первый-вечер';
export const MAX_BATCH = 24;
export const MAX_INDEX = 1_000_000;

export function normalizeSeed(seed) {
  return Array.from(String(seed ?? '').normalize('NFC').trim().toWellFormed()).slice(0, 120).join('') || DEFAULT_SEED;
}

export function hash(text) {
  let value = 2166136261;
  for (const ch of text) {
    value ^= ch.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function randomFor(seed, index, channel) {
  let value = hash(`${MODEL_VERSION}|${DATA_VERSION}|${seed}|${index}|${channel}`);
  return () => {
    value += 0x6D2B79F5;
    let x = Math.imul(value ^ (value >>> 15), 1 | value);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list, random) { return list[Math.floor(random() * list.length)]; }
function sample(list, count, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// Every channel is isolated. Identity and cultural tastes cannot determine temperament,
// boundaries, format, values, politics, experience or disagreement behaviour.
export function generateVisitor(seed = DEFAULT_SEED, index = 0) {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_INDEX) throw new RangeError('Номер посетителя должен быть целым от 0 до 999999.');
  const canonical = normalizeSeed(seed);
  const rng = channel => randomFor(canonical, index, channel);
  const identity = rng('identity');
  const tasteRng = rng('tastes');
  // Seeded decks give small parties varied names and primary interests, while
  // individual generation still produces the same visitor at any index.
  const nameDeck = sample(names, names.length, randomFor(canonical, Math.floor(index / names.length), 'name-deck'));
  const genreDeck = sample(motifs, motifs.length, randomFor(canonical, Math.floor(index / motifs.length), 'genre-deck'));
  const primary = genreDeck[index % motifs.length];
  const genres = [primary, pick(motifs.filter(motif => motif.id !== primary.id), tasteRng)];
  const tastes = ['book', 'film', 'game'].map(type => {
    const motif = tasteRng() < 0.72 ? genres[0] : genres[1];
    return { ...pick(motif.works[type], tasteRng), motif: motif.id };
  });
  const traits = Object.fromEntries(Object.entries(dimensions).map(([key, data]) => [key, pick(data.options, rng(`trait:${key}`))]));
  const format = pick(formats, rng('format'));
  const visitor = {
    id: `v${MODEL_VERSION}.${DATA_VERSION}:${encodeURIComponent(canonical)}:${index}`,
    modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION, seed: canonical, index,
    name: nameDeck[index % names.length], age: 21 + Math.floor(identity() * 46),
    accent: Math.floor(rng('visual')() * 5),
    genres: genres.map(({ id, label, short }) => ({ id, label, short })), tastes,
    wish: genres[0].wish, traits, format,
    priorities: sample(priorities, 2, rng('priorities')),
    boundaries: sample(boundaries, 2, rng('boundaries')),
    experience: pick(experiences, rng('experience')),
    company: format.id === 'solo' ? null : pick(company, rng('company')),
    values: pick(values, rng('values')),
    politics: pick(politics, rng('politics')),
    context: pick(contexts, rng('context')),
    question: genres[0].question,
  };
  visitor.table = {
    story: genres[0].hook,
    format: format.table,
    needs: [traits.pace.table, traits.rules.table],
    reason: `Зацепка из вкусов — ${genres[0].short.toLocaleLowerCase('ru')}. Формат, темп и правила взяты из отдельных пожеланий. Границы действуют независимо от жанра.`,
  };
  // Detach the result from catalogue objects so future editors and seating tools
  // can change a profile without changing every later generated visitor.
  return structuredClone(visitor);
}

export function generateBatch(seed, count = 6, startIndex = 0) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) throw new RangeError(`Размер партии — от 1 до ${MAX_BATCH}.`);
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex + count > MAX_INDEX) throw new RangeError('Недопустимое начало партии.');
  return Array.from({ length: count }, (_, offset) => generateVisitor(seed, startIndex + offset));
}
