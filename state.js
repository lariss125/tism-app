export const STORAGE_KEY = 'tism.app.v1';
export const stimuli = ['Geluid', 'Licht', 'Drukte', 'Aanraking', 'Geuren', 'Veel informatie'];
export const traits = ['Voorspelbaarheid', 'Schakelen', 'Hyperfocus', 'Informatieverwerking', 'Piekeren', 'Duidelijkheid', 'Onverwachte veranderingen'];
export const needs = ['Stilte', 'Alleen zijn', 'Koptelefoon', 'Duidelijke instructies', 'Planning vooraf', 'Pauzes', 'Minder afspraken', 'Bewegen', 'Stimming', 'Tijd voor mijn interesse'];
export const today = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const socialChoices = ['Bij familie voel ik me mezelf', 'Bij vrienden voel ik me mezelf', 'In een groep voel ik me prettig', 'Ik pas me vaak aan', 'Rust na sociaal contact helpt mij'];
export const reactionKeys = [...traits.map(x => `brain:${x}`), ...needs.map(x => `needs:${x}`), ...socialChoices.map(x => `social:${x}`), 'guide:klopt'];
export const emptyState = () => ({version: 1, name: '', checkins: [], activities: [], sensory: {}, sensoryNotes: '', brain: [], brainNotes: '', social: {safe: '', draining: '', masking: '', recovery: ''}, needs: [], needsNotes: '', guideNotes: '', reactions: {}, drafts: {}});
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const string = (v, max = 5000) => typeof v === 'string' && v.length <= max;
const number = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
const date = v => string(v, 10) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const selection = (v, allowed) => Array.isArray(v) && v.length <= allowed.length && new Set(v).size === v.length && v.every(x => allowed.includes(x));
export function validateState(v) {
  if (!object(v) || v.version !== 1) throw new Error('Dit bestand is geen ondersteunde Tism-back-up.');
  const base = emptyState();
  for (const key of ['name', 'sensoryNotes', 'brainNotes', 'needsNotes', 'guideNotes']) if (!string(v[key], key === 'name' ? 80 : 5000)) throw new Error('Ongeldige tekst in de back-up.');
  if (!Array.isArray(v.checkins) || v.checkins.length > 10000 || !v.checkins.every(c => object(c) && string(c.id, 100) && date(c.date) && number(c.energy, 0, 100) && number(c.social, 0, 100) && string(c.note))) throw new Error('Ongeldige check-ins.');
  if (!Array.isArray(v.activities) || v.activities.length > 10000 || !v.activities.every(a => object(a) && string(a.id, 100) && date(a.date) && string(a.title, 100) && a.title.trim() && number(a.effect, -100, 100) && number(a.recovery, 0, 1440) && selection(a.stimuli, stimuli))) throw new Error('Ongeldige activiteiten.');
  if (!v.activities.every(a => a.customStimulus === undefined || string(a.customStimulus, 500))) throw new Error('Ongeldige eigen prikkel.');
  if ([v.checkins, v.activities].some(list => new Set(list.map(x => x.id)).size !== list.length)) throw new Error('Dubbele gegevens in de back-up.');
  if (!object(v.sensory) || !Object.entries(v.sensory).every(([key, val]) => stimuli.includes(key) && Number.isInteger(val) && number(val, 0, 3))) throw new Error('Ongeldig prikkelprofiel.');
  if (!selection(v.brain, traits) || !selection(v.needs, needs)) throw new Error('Ongeldig persoonlijk profiel.');
  if (!object(v.social) || !Object.keys(base.social).every(k => string(v.social[k]))) throw new Error('Ongeldig sociaal profiel.');
  const reactions = v.reactions ?? {};
  if (!object(reactions) || !Object.entries(reactions).every(([k,r]) => reactionKeys.includes(k) && (r === 1 || r === -1))) throw new Error('Ongeldige duimpjes.');
  const drafts=v.drafts ?? {};
  const draftKeys={checkin:['energy','social','previous-energy','previous-social','_date'],activity:['title','customTitle','effect','recovery','customStimulus','_id','_date',...stimuli.map(s=>'stimulus:'+s)]};
  if(!object(drafts) || !Object.entries(drafts).every(([key,fields])=>draftKeys[key] && object(fields) && Object.entries(fields).every(([name,value])=>draftKeys[key].includes(name) && string(value,5000)))) throw new Error('Ongeldige conceptantwoorden.');
  return Object.fromEntries(Object.keys(base).map(k => [k, k === 'reactions' ? reactions : k==='drafts'?drafts:v[k]]));
}
export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? emptyState() : validateState(JSON.parse(raw));
}
export function persistState(storage, next) {
  const valid = validateState(next);
  storage.setItem(STORAGE_KEY, JSON.stringify(valid));
  return valid;
}

// A fictional three weeks for "Voorbeeldweek toevoegen", with a few clear patterns to discover. Ids start with _tism_example_.
export function exampleData(now = new Date()) {
  const day = offset => {const d = new Date(now); d.setDate(d.getDate() + offset); return today(d);};
  const energy = [65,60,70,55,65,60,70,65,55,70,60,65,55,70,60,65,70,55,65,60,65];
  const social = [60,55,65,50,60,55,60,65,50,60,55,60,50,65,55,60,65,50,60,55,60];
  const groceries = {title:'Boodschappen doen (voorbeeld)',effect:-20,recovery:15,stimuli:['Geluid','Drukte'],customStimulus:''};
  const walk = {title:'Wandeling in het park (voorbeeld)',effect:20,recovery:0,stimuli:[],customStimulus:'Frisse buitenlucht'};
  const together = {title:'Samen zijn (voorbeeld)',effect:0,recovery:60,stimuli:['Drukte'],customStimulus:''};
  const plan = i => [...([1,5,9,13,17].includes(i) ? [groceries] : []), ...([3,7,11,15,19].includes(i) ? [walk] : []), ...([2,10,18].includes(i) ? [together] : [])];
  const checkins = [], activities = [];
  for (let i = 0; i < 21; i++) {
    const date = day(i - 20), yesterday = plan(i - 1);
    let e = energy[i], s = social[i];
    if (yesterday.includes(groceries)) {e = 35; s = 40;}
    if (yesterday.includes(walk)) e = 85;
    if (yesterday.includes(together)) s = 30;
    checkins.push({id:`_tism_example_check_${date}`,date,energy:e,social:s,note:''});
    plan(i).forEach((a, j) => activities.push({...a,id:`_tism_example_activity_${date}_${j}`,date}));
  }
  [walk, groceries, {title:'Tijd voor mijn interesse (voorbeeld)',effect:20,recovery:0,stimuli:[],customStimulus:''}].forEach((a, j) => activities.push({...a,id:`_tism_example_activity_${day(0)}_today_${j}`,date:day(0)}));
  return {checkins, activities};
}
