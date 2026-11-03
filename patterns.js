import {today} from './state.js';

// Patterns are only shown with enough data, and only when a difference is clear (one smiley step is 25).
export const MIN_DAYS = 14;
const MIN_TIMES = 3;
const MIN_DIFF = 15;
const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const shift = (date, days) => {const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return today(d);};
const average = (list, key) => list.reduce((sum, c) => sum + c[key], 0) / list.length;
const verb = (keys, one, two) => keys.length === 2 ? two : one;
const what = keys => keys.length === 2 ? 'energie en sociale batterij' : keys[0] === 'energy' ? 'energie' : 'sociale batterij';

// Compares a group of check-ins with all other check-ins; returns the measures that clearly differ, in one direction.
function compare(group, others) {
  if (group.length < MIN_TIMES || others.length < MIN_TIMES) return null;
  const diffs = ['energy', 'social'].map(key => [key, average(group, key) - average(others, key)]).filter(([, diff]) => Math.abs(diff) >= MIN_DIFF);
  if (!diffs.length) return null;
  const strongest = diffs.reduce((a, b) => Math.abs(b[1]) > Math.abs(a[1]) ? b : a);
  const same = diffs.filter(([, diff]) => Math.sign(diff) === Math.sign(strongest[1]));
  return {keys: same.map(([key]) => key), diff: strongest[1], up: strongest[1] > 0};
}

// Finds simple links in the user's own answers. Never a conclusion: only "this often happens together".
export function findPatterns(state, now = today()) {
  const checks = new Map();
  for (const c of [...state.checkins].sort((a, b) => a.date.localeCompare(b.date))) checks.set(c.date, c);
  const all = [...checks.values()];
  const result = {days: checks.size, needed: MIN_DAYS, patterns: []};
  if (checks.size < MIN_DAYS) return result;
  const add = (pattern, found, times) => result.patterns.push({...pattern, up: found.up, keys: found.keys, times, strength: Math.abs(found.diff) * Math.sqrt(times)});

  // What happens the day after an activity or a stimulus.
  const groups = new Map();
  const seen = new Set();
  const remember = (key, kind, label, date) => {if (!groups.has(key)) groups.set(key, {kind, label, dates: new Set()}); groups.get(key).dates.add(date);};
  for (const a of state.activities) {
    remember(`activity:${a.title}`, 'activity', a.title, a.date);
    for (const s of a.stimuli) remember(`stimulus:${s}`, 'stimulus', s, a.date);
  }
  // Activities first, so a stimulus that always comes with the same activity is not repeated.
  for (const {kind, label, dates} of [...groups.values()].sort((a, b) => (a.kind === 'stimulus') - (b.kind === 'stimulus'))) {
    const after = new Set([...dates].map(d => shift(d, 1)).filter(d => checks.has(d)));
    const key = [...after].sort().join();
    if (seen.has(key)) continue;
    seen.add(key);
    const found = compare([...after].map(d => checks.get(d)), all.filter(c => !after.has(c.date)));
    if (!found) continue;
    const parts = kind === 'activity' ? ['Na ', label, ` ${verb(found.keys, 'is', 'zijn')} je ${what(found.keys)} de dag erna vaak ${found.up ? 'hoger' : 'lager'}.`] : ['Na een dag met ', label.toLowerCase(), ` als prikkel ${verb(found.keys, 'is', 'zijn')} je ${what(found.keys)} vaak ${found.up ? 'hoger' : 'lager'}.`];
    add({kind, parts}, found, after.size);
  }

  // A weekday that stands out.
  for (let day = 0; day < 7; day++) {
    const group = all.filter(c => new Date(`${c.date}T12:00:00`).getDay() === day);
    const found = compare(group, all.filter(c => !group.includes(c)));
    if (found) add({kind: 'weekday', parts: ['Op ', WEEKDAYS[day], ` ${verb(found.keys, 'is', 'zijn')} je ${what(found.keys)} meestal ${found.up ? 'hoger' : 'lager'} dan op andere dagen.`]}, found, group.length);
  }

  // The last seven days compared with the seven before.
  const recent = all.filter(c => c.date > shift(now, -7) && c.date <= now);
  const before = all.filter(c => c.date > shift(now, -14) && c.date <= shift(now, -7));
  if (recent.length >= 4 && before.length >= 4) {
    const found = compare(recent, before);
    if (found) add({kind: 'trend', parts: [`Je ${what(found.keys)} ${verb(found.keys, 'was', 'waren')} `, 'de afgelopen week', ` ${found.up ? 'hoger' : 'lager'} dan de week ervoor.`]}, found, recent.length);
  }

  result.patterns.sort((a, b) => b.strength - a.strength);
  return result;
}
