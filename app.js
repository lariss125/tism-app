import {emptyState, loadState, persistState, validateState, today, stimuli, traits, needs, socialChoices, exampleData} from './state.js';
import {findPatterns} from './patterns.js';

const icons = {
  vandaag: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  energie: '<rect x="3" y="6" width="17" height="12" rx="3"/><path d="M23 10v4M7 10v4m4-4v4m4-4v4"/>',
  prikkels: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2 2m8.8 8.8 2 2m0-12.8-2 2m-8.8 8.8-2 2"/><circle cx="12" cy="12" r="3"/>',
  brein: '<path d="M12 5c-4-6-10 0-7 4-4 3-2 8 2 8-1 5 5 6 5 2V5Zm0 0c4-6 10 0 7 4 4 3 2 8-2 8 1 5-5 6-5 2M8 9l4 2m4 3-4 2"/>',
  sociaal: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-17a3 3 0 0 1 0 6m2 5a5 5 0 0 1 2 4v2"/>',
  behoeften: '<path d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z"/>',
  gebruiksaanwijzing: '<path d="M4 3h11l5 5v13H4V3Zm11 0v6h5M8 13h8m-8 4h6"/>',
  patronen: '<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/><path d="M3 21h18"/>',
};
const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] || icons.gebruiksaanwijzing}</svg>`;
const routes = [['vandaag', 'Vandaag'], ['energie', 'Mijn energie'], ['prikkels', 'Mijn prikkels'], ['brein', 'Mijn brein'], ['sociaal', 'Mijn sociale batterij'], ['behoeften', 'Wat heb ik nodig?'], ['gebruiksaanwijzing', 'Mijn gebruiksaanwijzing'], ['patronen', 'Mijn patronen'], ['gegevens', 'Mijn samenvatting']];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const formatDate = date => new Intl.DateTimeFormat('nl-NL', {day:'numeric', month:'short'}).format(new Date(`${date}T12:00:00`));
let state;
let loadError = '';
try {state = loadState(localStorage);} catch {state = emptyState(); loadError = 'Je opgeslagen gegevens konden niet worden gelezen. Ze worden niet overschreven. Download eerst de oorspronkelijke gegevens via Mijn samenvatting, of herstel een geldige back-up.';}
let route = '';
let toastTimer;
const content = document.querySelector('#content');
const toast = message => {document.querySelector('#toast').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => document.querySelector('#toast').textContent = '', 6000);};
function save(next, message = 'Opgeslagen in deze browser.') {
  if (loadError) {toast('Opslaan is geblokkeerd om je bestaande gegevens te beschermen. Ga naar Mijn samenvatting.'); return false;}
  try {state = persistState(localStorage, next); toast(message); return true;}
  catch {toast('Opslaan is niet gelukt. Controleer of deze browser lokale opslag toestaat en of er ruimte beschikbaar is. Je invoer blijft op het scherm.'); return false;}
}
const head = (title, text, action = '') => `<div class="page-head"><div><span class="eyebrow">Jouw persoonlijke ruimte</span><h1>${title}</h1></div>${action}</div><p class="intro">${text}</p>`;
const textField = (name, label, value, hint = '') => `<label class="field"><span>${label}</span><textarea name="${name}" maxlength="5000">${esc(value)}</textarea>${hint ? `<small>${hint}</small>` : ''}</label>`;
const chips = (name, choices, selected) => `<div class="chips">${choices.map(s => `<label class="chip"><input type="checkbox" name="${name}" value="${esc(s)}" ${selected.includes(s) ? 'checked' : ''}>${esc(s)}</label>`).join('')}</div>`;

const faces = ['😴','🙁','😐','🙂','🤩'];
const face = value => value === undefined ? '❔' : faces[Math.min(4,Math.max(0,Math.round(value/25)))];
const activityChoices = [['😌','Rust'],['🙂','Wandelen'],['🤩','Mijn interesse'],['😵','Boodschappen'],['😐','Werk of school'],['🥰','Samen zijn']];
function emojiChoice(name,label,choices,value,required=false) {
  return '<fieldset class="emoji-question"><legend>'+esc(label)+'</legend><div class="emoji-options">'+choices.map(([v,emoji,meaning]) => '<label class="emoji-option"><input type="radio" name="'+esc(name)+'" value="'+esc(v)+'" '+(String(v)===String(value)?'checked ':'')+(required?'required ':'')+'aria-label="'+esc(label+': '+meaning)+'"><span aria-hidden="true">'+emoji+'</span><small>'+esc(meaning)+'</small></label>').join('')+'</div></fieldset>';
}
const moodChoice = (name,label,value) => emojiChoice(name,label,[0,25,50,75,100].map((v,i)=>[v,faces[i],['Leeg','Weinig','Halverwege','Veel','Vol'][i]]),[0,25,50,75,100].includes(value)?value:undefined,value===undefined) + (value!==undefined?'<input type="hidden" name="previous-'+name+'" value="'+value+'">':'');
const thumbRow = (name,label,value) => emojiChoice(name,label,[[-1,'👎','Nee'],[1,'👍','Ja']],value);
const oldNotes = text => text ? '<details class="legacy-notes"><summary>Eerdere notities</summary><p>'+esc(text)+'</p></details>' : '';
const otherAnswer = (name,label,value='',max=5000) => '<details class="other-answer"><summary>➕ Iets anders toevoegen</summary><label class="field"><span>'+esc(label)+'</span><textarea name="'+esc(name)+'" aria-label="'+esc(label)+'" maxlength="'+max+'">'+esc(value)+'</textarea><small>Optioneel. Gebruik je eigen woorden.</small></label></details>';
const autoNote = () => '<p class="autosave-note" role="status">Wordt automatisch bewaard.</p>';
const moreQuestions = html => '<details class="more-questions"><summary>Meer</summary>'+html+'</details>';
const confirmButton = label => '<button type="submit" class="emoji-save" aria-label="'+esc(label)+'"><span aria-hidden="true">👍</span><small>'+esc(label)+'</small></button>';
function readReactions(form,prefix,items) {
  const reactions = {...state.reactions};
  items.forEach(item=>{const key=prefix+':'+item; const value=form.get(key); if(value!==null) reactions[key]=Number(value);});
  return reactions;
}
const yesSelections = (reactions,prefix,choices,previous) => choices.filter(item=>reactions[prefix+':'+item]===1 || (reactions[prefix+':'+item]===undefined && previous.includes(item)));

const lastCheck = () => state.checkins.filter(c => c.date === today()).at(-1);
const sortedChecks = () => [...state.checkins].sort((a,b) => a.date.localeCompare(b.date));
const empty = (text, action = '') => `<div class="empty">${text}${action ? `<br>${action}` : ''}</div>`;
function activityRows(list, removable = false) {
  return list.length ? list.map(a => `<div class="row"><div><strong>${esc(a.title)}</strong><p>${formatDate(a.date)}${a.recovery ? ` · ${a.recovery} min hersteltijd` : ''}${(a.stimuli.length || a.customStimulus) ? ` · ${[...a.stimuli, a.customStimulus].filter(Boolean).map(esc).join(', ')}` : ''}</p></div><span class="effect ${a.effect < 0 ? 'negative' : ''}">${a.effect>0?'👍':a.effect<0?'👎':'😐'}</span>${removable ? `<button class="text-button" type="button" data-delete-activity="${esc(a.id)}" aria-label="Verwijder activiteit ${esc(a.title)}">Verwijder</button>` : ''}</div>`).join('') : empty('Nog geen activiteiten. Voeg iets toe dat je energie geeft of kost.');
}
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
function metric(title, value, social = false, order = 0) {
  const filled = value !== undefined;
  const level = filled ? value : 0;
  const progress = filled ? `role="progressbar" aria-label="${title}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"` : `role="img" aria-label="${title}: nog geen check-in"`;
  const number = `<strong class="face-reading">${face(value)}</strong>`;
  const visual = social
    ? `<div class="social-display" ${progress}><div class="battery-illustration" aria-hidden="true"><div class="battery-cap"></div><div class="battery-body">${Array.from({length:5},(_,i) => `<div class="battery-cell"><span style="height:${Math.max(0,Math.min(100,(level-i*20)*5))}%;--d:${i}"></span></div>`).reverse().join('')}</div></div><div class="social-reading">${number}<span class="reading-caption">sociale batterij</span></div></div>`
    : `<div class="energy-display" ${progress}><svg class="energy-ring" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="energy-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#87dbd0"/><stop offset="55%" stop-color="#88bcff"/><stop offset="100%" stop-color="#efae99"/></linearGradient></defs><circle class="ring-decoration" cx="100" cy="100" r="94"/><circle class="ring-track" cx="100" cy="100" r="79"/>${level > 0 ? `<circle class="ring-fill" cx="100" cy="100" r="79" pathLength="100" stroke-dasharray="100 100" style="stroke-dashoffset:${100 - level}" transform="rotate(-90 100 100)"/><g class="ring-cap" style="--angle:${level * 3.6}deg"><circle cx="100" cy="21" r="10" class="cap-glow"/><circle cx="100" cy="21" r="4.5" class="cap-dot"/></g>` : ''}</svg><div class="ring-reading">${number}<span class="reading-caption">mijn energieniveau</span></div></div>`;
  return `<section class="card dash-card wellbeing-card reveal ${social ? 'social-card' : 'energy-card'}" style="--i:${order}"><div class="card-head"><h2>${title}</h2><span class="badge">Vandaag</span></div>${visual}<div class="wellbeing-footer"><p>${filled ? 'Jouw inschatting, op dit moment.' : 'Hoe voelt je batterij vandaag?'}</p><a class="wellbeing-link" href="#energie">${filled ? 'Opnieuw inchecken' : 'Doe een check-in'} ${arrow}</a></div></section>`;
}
// The five parts that feed the personal guide, with a short status for the dashboard.
const modules = [
  ['energie', 'Mijn energie', 'Wat geeft en wat kost je energie?', '#87dbd0', s => s.activities.length ? `${s.activities.length} ${s.activities.length === 1 ? 'activiteit' : 'activiteiten'}` : ''],
  ['prikkels', 'Mijn prikkels', 'Welke prikkels komen bij jou binnen?', '#f3cf8f', s => Object.keys(s.sensory).length ? `${Object.keys(s.sensory).length} van ${stimuli.length} ingevuld` : s.sensoryNotes ? 'Notities bewaard' : ''],
  ['brein', 'Mijn brein', 'Hoe verwerk jij informatie?', '#c3b5ff', s => Object.keys(s.reactions).some(k=>k.startsWith('brain:')) ? '👍 Reacties bewaard' : s.brain.length ? `${s.brain.length} herkend` : s.brainNotes ? 'Notities bewaard' : ''],
  ['sociaal', 'Mijn sociale batterij', 'Waar en bij wie kun je jezelf zijn?', '#f2ad98', s => Object.keys(s.reactions).some(k=>k.startsWith('social:')) ? '👍 Reacties bewaard' : Object.values(s.social).some(Boolean) ? `${Object.values(s.social).filter(Boolean).length} van 4 vragen` : ''],
  ['behoeften', 'Wat heb ik nodig?', 'Wat geeft jou rust en ruimte?', '#8cc8ff', s => Object.keys(s.reactions).some(k=>k.startsWith('needs:')) ? '👍 Reacties bewaard' : s.needs.length ? `${s.needs.length} gekozen` : s.needsNotes ? 'Notities bewaard' : ''],
];
const greeting = () => {const h = new Date().getHours(); return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';};
function weekCard(order) {
  const days = Array.from({length:7}, (_,i) => {
    const day = new Date(); day.setDate(day.getDate() + i - 6); const date = today(day);
    return {date, label:new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(day).replace('.', ''), check:state.checkins.filter(c => c.date === date).at(-1)};
  });
  const filled = days.filter(d => d.check);
  const top = '<div class="card-head"><h2>Mijn week</h2><span class="badge">7 dagen</span></div>';
  if (!filled.length) return `<section class="card dash-card week-card reveal" style="--i:${order}">${top}<div class="week-empty"><div class="week-ghost" aria-hidden="true">${days.map((_,i) => `<span style="--h:${[40,62,48,75,55,68,50][i]}%"></span>`).join('')}</div><p>Na een paar check-ins zie je hier hoe je week verloopt.</p></div></section>`;
  const x = i => 16 + i * 268 / 6, y = v => 112 - v * 0.96;
  const points = key => days.map((d,i) => d.check && [x(i), y(d.check[key])]).filter(Boolean);
  const line = key => points(key).map(([px,py],j) => `${j ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const energyPoints = points('energy');
  const area = energyPoints.length > 1 ? `${line('energy')} L${energyPoints.at(-1)[0].toFixed(1)} 112 L${energyPoints[0][0].toFixed(1)} 112 Z` : '';
  const avg = key => Math.round(filled.reduce((sum,d) => sum + d.check[key], 0) / filled.length);
  const dots = key => points(key).map(([px,py],j) => `<circle class="week-dot ${key}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" style="--d:${j}"/>`).join('');
  return `<section class="card dash-card week-card reveal" style="--i:${order}">${top}<div class="week-legend"><span class="energy"><i></i>Energie <strong>${face(avg('energy'))}</strong></span><span class="social"><i></i>Sociaal <strong>${face(avg('social'))}</strong></span></div>
    <svg class="week-chart" viewBox="0 0 300 120" role="img" aria-label="Energie en sociale batterij van de afgelopen zeven dagen. Gemiddeld ${face(avg('energy'))} energie en ${face(avg('social'))} sociale batterij over ${filled.length} check-ins."><defs><linearGradient id="week-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8cc8ff" stop-opacity=".35"/><stop offset="100%" stop-color="#8cc8ff" stop-opacity="0"/></linearGradient></defs>${[16,64,112].map(v => `<line class="week-grid" x1="8" x2="292" y1="${v}" y2="${v}"/>`).join('')}${area ? `<path class="week-area" d="${area}"/>` : ''}<path class="week-line social" pathLength="1" d="${line('social')}"/><path class="week-line energy" pathLength="1" d="${line('energy')}"/>${dots('social')}${dots('energy')}</svg>
    <div class="week-days" aria-hidden="true">${days.map(d => `<span class="${d.date === today() ? 'is-today' : ''}">${d.label}</span>`).join('')}</div></section>`;
}
function todayCard(order) {
  const list = state.activities.filter(a => a.date === today()).toReversed();
  const balance = list.reduce((sum,a) => sum + a.effect, 0);
  const recovery = list.reduce((sum,a) => sum + a.recovery, 0);
  const items = list.map(a => `<li style="--tone:${a.effect < 0 ? '#f2ad98' : a.effect > 0 ? '#87dbd0' : '#8cc8ff'}"><div><strong>${esc(a.title)}</strong><p>${[a.recovery ? `${a.recovery} min hersteltijd` : '', ...a.stimuli.map(esc), esc(a.customStimulus)].filter(Boolean).join(' · ') || 'Geen prikkels genoteerd'}</p></div><span class="effect-pill ${a.effect < 0 ? 'negative' : ''}">${a.effect > 0 ? '+' : ''}${a.effect}</span></li>`).join('');
  return `<section class="card dash-card today-card reveal" style="--i:${order}"><div class="card-head"><h2>Vandaag gedaan</h2><a href="#energie" class="pill-link">Activiteit toevoegen ${arrow}</a></div>
    <div class="today-stats"><div class="stat"><strong class="${balance < 0 ? 'negative' : balance > 0 ? 'positive' : ''}">${balance>0?'👍':balance<0?'👎':'😐'}</strong><span>gevoel bij je activiteiten</span></div><div class="stat"><strong>${list.length}</strong><span>${list.length === 1 ? 'activiteit' : 'activiteiten'}</span></div><div class="stat"><strong>${recovery}</strong><span>min hersteltijd</span></div></div>
    ${list.length ? `<ul class="timeline">${items}</ul>` : '<div class="today-empty"><p>Nog niets genoteerd vandaag. Wat heb je gedaan, en hoe voelde dat?</p></div>'}</section>`;
}
function guideCard(order) {
  const done = modules.map(m => Boolean(m[4](state)));
  const count = done.filter(Boolean).length;
  const next = modules.find((_,i) => !done[i]);
  return `<section class="card dash-card guide-card reveal" style="--i:${order}"><div class="card-head"><h2>Mijn gebruiksaanwijzing</h2>${icon('gebruiksaanwijzing')}</div>
    <div class="guide-count"><strong>${count}<small>/5</small></strong><span>onderdelen hebben inhoud</span></div>
    <div class="segments" role="img" aria-label="${count} van 5 onderdelen ingevuld">${done.map((on,i) => `<span class="${on ? 'on' : ''}" style="--d:${i};--tone:${modules[i][3]}"></span>`).join('')}</div>
    <ul class="guide-parts">${modules.map(([key,title,,tone],i) => `<li class="${done[i] ? 'on' : ''}" style="--tone:${tone}"><span class="part-check" aria-hidden="true">${done[i] ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>' : ''}</span><a href="#${key}">${title}</a><span class="sr-only">${done[i] ? ', heeft inhoud' : ', nog leeg'}</span></li>`).join('')}</ul>
    <p class="guide-next">${next ? `Een volgende stap kan zijn: <a href="#${next[0]}">${next[1]}</a>` : 'Alle onderdelen hebben inhoud. Je overzicht groeit mee met wat je ontdekt.'}</p>
    <a class="button btn-soft" href="#gebruiksaanwijzing">Bekijk mijn overzicht ${arrow}</a></section>`;
}
// Patterns: links in the user's own answers, shown only with enough check-ins.
const patternText = p => esc(p.parts[0])+'<strong>'+esc(p.parts[1])+'</strong>'+esc(p.parts[2]);
const patternEmoji = p => p.up ? (p.keys.includes('energy') ? '🔋' : '🤗') : (p.keys.includes('energy') ? '🪫' : '😮‍💨');
const patternItem = p => '<li class="pattern '+(p.up?'up':'down')+'"><span class="pattern-emoji" aria-hidden="true">'+patternEmoji(p)+'</span><div><p>'+patternText(p)+'</p><small>'+p.times+' keer gezien</small></div></li>';
const patternProgress = result => '<div class="pattern-progress" role="img" aria-label="'+result.days+' van '+result.needed+' dagen ingecheckt"><span style="width:'+Math.round(Math.min(1,result.days/result.needed)*100)+'%"></span></div><p class="small">'+result.days+' van '+result.needed+' dagen ingecheckt. Na ongeveer twee weken check-ins zie je hier wat opvalt.</p>';
function patternCard(order) {
  const result = findPatterns(state);
  const body = result.days < result.needed ? patternProgress(result) : result.patterns.length ? '<ul class="pattern-list">'+result.patterns.slice(0,2).map(patternItem).join('')+'</ul>' : '<p class="small">Er valt nog niets duidelijks op. Blijf inchecken; patronen worden zichtbaar als iets vaker gebeurt.</p>';
  return '<section class="card dash-card pattern-card reveal" style="--i:'+order+'"><div class="card-head"><h2>Wat opvalt</h2><a href="#patronen" class="pill-link">Mijn patronen '+arrow+'</a></div>'+body+'</section>';
}
function patternsPage() {
  const result = findPatterns(state);
  const note = '<p class="small pattern-note">Dit zijn dingen die in jouw antwoorden vaak samen voorkomen. Het zegt niet waarom, en het is geen advies. Jij weet zelf het beste wat klopt.</p>';
  if (result.days < result.needed) return head('Mijn patronen','Wat valt op in jouw check-ins en activiteiten?')+'<section class="card"><h2>Nog even verzamelen</h2>'+patternProgress(result)+'<p class="small">Noteer ook je activiteiten en de prikkels die erbij waren. Dan kan Tism laten zien wat er de dag erna gebeurt.</p><a class="pill-link" href="#energie">Doe een check-in '+arrow+'</a></section>'+note;
  return head('Mijn patronen','Wat valt op in jouw check-ins en activiteiten?')+'<section class="card">'+(result.patterns.length ? '<h2>Dit valt op</h2><ul class="pattern-list">'+result.patterns.map(patternItem).join('')+'</ul>' : '<h2>Nog niets duidelijks</h2><p class="small">In je '+result.days+' dagen check-ins valt nog niets duidelijk op. Dat is ook een uitkomst. Blijf inchecken en activiteiten noteren.</p>')+'</section>'+note;
}
function dashboard() {
  const check = lastCheck();
  return `<div class="dash">
    <section class="dash-hero reveal"><div class="hero-copy"><span class="greeting">${greeting()}</span><h1>Welkom${state.name ? `, ${esc(state.name)}` : ''}.</h1><p class="lead">Even stilstaan bij jezelf. Wat voel je, wat kost energie en wat heb je vandaag nodig? Op jouw tempo.</p>
      <div class="status-pill ${check ? 'done' : ''}"><span class="status-dot" aria-hidden="true"></span>${check ? `Je hebt vandaag ingecheckt · energie ${face(check.energy)}, sociaal ${face(check.social)}` : 'Je hebt vandaag nog niet ingecheckt'}</div>
      <div class="hero-actions"><a class="button btn-glow" href="#energie">${check ? 'Check-in bijwerken' : 'Hoe gaat het met je?'} ${arrow}</a><a class="button btn-quiet" href="#gebruiksaanwijzing">Mijn gebruiksaanwijzing</a></div></div>
      <div class="hero-visual" aria-hidden="true"><div class="orbit orbit-1"><span class="satellite"></span></div><div class="orbit orbit-2"><span class="satellite"></span></div><div class="orbit orbit-3"></div><svg class="hero-symbol" viewBox="0 0 56 56"><defs><linearGradient id="hero-infinity" x1="0" x2="1" y1="0" y2="0"><stop stop-color="#72a9e8"/><stop offset="1" stop-color="#edac98"/></linearGradient></defs><path d="M28 28C20 17 16 14 11 14C1 14 1 42 11 42C17 42 21 35 28 28C35 21 39 14 45 14C55 14 55 42 45 42C39 42 35 35 28 28Z" fill="none" stroke="url(#hero-infinity)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="spark" style="--sx:14%;--sy:22%;--sd:0s"></span><span class="spark" style="--sx:84%;--sy:30%;--sd:1.2s"></span><span class="spark" style="--sx:76%;--sy:84%;--sd:2.1s"></span><span class="spark" style="--sx:20%;--sy:78%;--sd:.6s"></span></div></section>
    <div class="dash-row dash-metrics">${metric('Mijn energie', check?.energy, false, 1)}${metric('Mijn sociale batterij', check?.social, true, 2)}${weekCard(3)}</div>
    <div class="dash-row dash-split">${todayCard(4)}${guideCard(5)}</div>
    ${patternCard(6)}
    <div class="section-title reveal" style="--i:6"><h2>Ontdek jezelf</h2><span>Begin waar het voor jou logisch voelt</span></div>
    <div class="module-grid">${modules.map(([key,title,text,tone,status],i) => {const s = status(state); return `<a class="module reveal" href="#${key}" style="--tone:${tone};--i:${7 + i}"><span class="module-icon">${icon(key)}</span><strong>${title}</strong><p>${text}</p><span class="module-foot"><span class="module-status ${s ? 'done' : ''}">${s || 'Nog leeg'}</span><span class="module-arrow">${arrow}</span></span></a>`;}).join('')}</div>
  </div>`;
}
const calm = matchMedia('(prefers-reduced-motion: reduce)');
function countUp() {
  if (calm.matches) return;
  content.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count), start = performance.now();
    const step = now => {const t = Math.min(1, (now - start) / 1300); el.textContent = Math.round(target * (1 - (1 - t) ** 3)); if (t < 1) requestAnimationFrame(step);};
    el.textContent = '0'; requestAnimationFrame(step);
  });
}
function energy() {
  const draft=state.drafts.checkin;
  const value=key=>draft?.[key]===undefined?undefined:Number(draft[key]);
  const check=lastCheck() || (draft?._date===today()?{energy:value('energy'),social:value('social')}:undefined); const days=sortedChecks().slice(-7);
  return head('Mijn energie','Kies een smiley. Meer hoef je niet in te vullen.')+
  '<div class="split"><div><form id="checkin-form" class="card"><h2>Hoe voelt het vandaag?</h2>'+moodChoice('energy','Mijn energie',check?.energy)+moodChoice('social','Mijn sociale batterij',check?.social)+oldNotes(check?.note)+autoNote()+'</form><form id="activity-form" class="card"><h2>Wat heb je gedaan?</h2>'+emojiChoice('title','Mijn activiteit',[...activityChoices.filter(([,title])=>['Rust','Wandelen','Samen zijn'].includes(title)).map(([emoji,title])=>[title,emoji,title]),['anders','➕','Anders']],undefined,true)+'<label class="field" id="custom-title-field" hidden><span>Welke andere activiteit?</span><input type="text" name="customTitle" maxlength="100" disabled required></label>'+thumbRow('effect','Gaf dit mij energie?',undefined)+moreQuestions(emojiChoice('recovery','Hoeveel rust had ik nodig?',[[0,'🙂','Geen'],[15,'😌','Een beetje'],[60,'😴','Veel']],0,false)+'<h3>Welke prikkels waren erbij?</h3>'+stimuli.map(s=>thumbRow('stimulus:'+s,s,undefined)).join('')+otherAnswer('customStimulus','Welke andere prikkel speelde een rol?','',500))+autoNote()+'<button type="button" id="new-activity" class="outline">➕ Nieuwe activiteit</button>'+'</form></div><div><section class="card"><h2>Mijn laatste check-ins</h2>'+ (days.length?days.toReversed().map(c=>'<div class="row"><div><strong>'+formatDate(c.date)+'</strong><p class="emoji-history">'+face(c.energy)+' <span>Energie</span> · '+face(c.social)+' <span>Sociaal</span></p>'+oldNotes(c.note)+'</div><button class="text-button" type="button" data-delete-check="'+esc(c.id)+'" aria-label="Verwijder check-in '+formatDate(c.date)+'">🗑️</button></div>').join(''):empty('Je eerste smiley komt hier.'))+'</section><section class="card"><h2>Mijn activiteiten</h2>'+activityRows(state.activities.toReversed(),true)+'</section></div></div>';
}

function sensory() {
  return head('Mijn prikkels','👍 gaat goed · 👎 is lastig.')+'<form id="sensory-form" class="card compact-profile">'+stimuli.slice(0,3).map(s=>thumbRow(s,s,state.sensory[s]===undefined?undefined:state.sensory[s]>=2?-1:1)).join('')+moreQuestions(stimuli.slice(3).map(s=>thumbRow(s,s,state.sensory[s]===undefined?undefined:state.sensory[s]>=2?-1:1)).join(''))+otherAnswer('sensoryNotes','Welke andere prikkels zijn belangrijk voor jou?',state.sensoryNotes)+autoNote()+'</form>';
}

function brain() {
  return head('Mijn brein','Herken je dit?')+'<form id="brain-form" class="card compact-profile">'+traits.slice(0,3).map(s=>thumbRow('brain:'+s,s,state.reactions['brain:'+s]??(state.brain.includes(s)?1:undefined))).join('')+moreQuestions(traits.slice(3).map(s=>thumbRow('brain:'+s,s,state.reactions['brain:'+s]??(state.brain.includes(s)?1:undefined))).join(''))+oldNotes(state.brainNotes)+autoNote()+'</form>';
}

function social() {
  return head('Mijn sociale batterij','Past dit bij jou?')+'<div class="split"><form id="social-form" class="card compact-profile">'+socialChoices.slice(0,3).map(s=>thumbRow('social:'+s,s,state.reactions['social:'+s])).join('')+moreQuestions(socialChoices.slice(3).map(s=>thumbRow('social:'+s,s,state.reactions['social:'+s])).join(''))+oldNotes(Object.values(state.social).filter(Boolean).join(' · '))+autoNote()+'</form><div>'+metric('Mijn sociale batterij',lastCheck()?.social,true)+'</div></div>';
}

function needsPage() {
  return head('Wat heb ik nodig?','Wat helpt jou?')+'<form id="needs-form" class="card compact-profile">'+needs.slice(0,3).map(s=>thumbRow('needs:'+s,s,state.reactions['needs:'+s]??(state.needs.includes(s)?1:undefined))).join('')+moreQuestions(needs.slice(3).map(s=>thumbRow('needs:'+s,s,state.reactions['needs:'+s]??(state.needs.includes(s)?1:undefined))).join(''))+otherAnswer('needsNotes','Wat helpt jou nog meer?',state.needsNotes)+autoNote()+'</form>';
}

const guideText = (label, text) => text ? `<h3>${label}</h3><p>${esc(text)}</p>` : '';
function guide() {
  const cost = [...new Set(state.activities.filter(a => a.effect < 0).map(a => a.title))];
  const gain = [...new Set(state.activities.filter(a => a.effect > 0).map(a => a.title))];
  const sensitive = Object.entries(state.sensory).filter(([,v]) => v >= 2).map(([key,v]) => `${key} (${v === 3 ? 'erg gevoelig' : 'gevoelig'})`);
  return head('Mijn gebruiksaanwijzing','Jouw inzichten bij elkaar. Een persoonlijk overzicht dat meegroeit met wat je ontdekt.', '<button type="button" class="outline" id="print-guide">Afdrukken / PDF</button>') + `<article class="card" id="guide"><div class="guide-header"><span class="eyebrow">Zo werk ik</span><h2>De gebruiksaanwijzing van ${esc(state.name || 'mij')}</h2><p class="small">Samengesteld uit mijn eigen ervaringen · ${formatDate(today())}</p></div>
    <section class="guide-section"><h2>01 · Mijn energie</h2>${guideText('Dit geeft mij energie',gain.join(', '))}${guideText('Dit kost mij energie',cost.join(', '))}${!gain.length && !cost.length ? '<p class="small">Voeg activiteiten toe bij Mijn energie om hier je ervaringen terug te zien.</p>' : ''}</section>
    <section class="guide-section"><h2>02 · Mijn prikkels</h2>${guideText('Hier ben ik gevoelig voor',sensitive.join(', '))}${state.sensoryNotes ? `<p>${esc(state.sensoryNotes)}</p>` : !sensitive.length ? '<p class="small">Je kunt je prikkelprofiel invullen bij Mijn prikkels.</p>' : ''}</section>
    <section class="guide-section"><h2>03 · Mijn brein</h2>${state.brain.length ? `<p>${state.brain.map(esc).join(' · ')}</p>` : ''}${state.brainNotes ? `<p>${esc(state.brainNotes)}</p>` : !state.brain.length ? '<p class="small">Verzamel je inzichten bij Mijn brein.</p>' : ''}</section>
    <section class="guide-section"><h2>04 · Mijn sociale grenzen</h2>${socialChoices.filter(s=>state.reactions['social:'+s]!==undefined).map(s=>'<p>'+esc(s)+' '+(state.reactions['social:'+s]===1?'👍':'👎')+'</p>').join('')}${guideText('Hier kan ik mezelf zijn',state.social.safe)}${guideText('Dit kost mij sociale energie',state.social.draining)}${guideText('Over aanpassen en maskeren',state.social.masking)}${guideText('Dit helpt mij herstellen',state.social.recovery)}${!Object.values(state.social).some(Boolean) && !Object.keys(state.reactions).some(k=>k.startsWith('social:')) ? '<p class="small">Vul je sociale profiel in om je grenzen en hersteltijd zichtbaar te maken.</p>' : ''}</section>
    <section class="guide-section"><h2>05 · Dit heb ik nodig</h2>${state.needs.length ? `<ul>${state.needs.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}${state.needsNotes ? `<p>${esc(state.needsNotes)}</p>` : !state.needs.length ? '<p class="small">Kies wat jou helpt bij Wat heb ik nodig?</p>' : ''}</section>${state.guideNotes ? `<section class="guide-section"><h2>Wat ik verder wil meegeven</h2><p>${esc(state.guideNotes)}</p></section>` : ''}</article>
    <form id="guide-form" class="card no-print">${thumbRow("guide:klopt","Past dit overzicht bij mij?",state.reactions["guide:klopt"])}${autoNote()}</form>`;
}
function dataPage() {
  const helpful = [...new Set(state.needs)].slice(0,3);
  const gain = [...new Set(state.activities.filter(a => a.effect > 0).map(a => a.title))].slice(0,3);
  const sensitive = Object.entries(state.sensory).filter(([,value]) => value >= 2).map(([key]) => key).slice(0,3);
  const support = (emoji,title,items,key,prompt) => '<section class="card support-card"><span class="support-emoji" aria-hidden="true">'+emoji+'</span><h2>'+title+'</h2>'+(items.length?'<ul>'+items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>':'<p class="small">'+prompt+'</p>')+'<a class="pill-link" href="#'+key+'">'+(items.length?'Aanpassen':'Kiezen')+' '+arrow+'</a></section>';
  return head('Mijn samenvatting','Wat helpt mij? Alles kort bij elkaar.') + '<div class="support-grid">'+support('😌','Dit helpt mij',helpful,'behoeften','Kies wat jou rust geeft.')+support('🙂','Dit geeft mij energie',gain,'energie','Ontdek welke activiteiten fijn voelen.')+support('😵','Hier let ik op',sensitive,'prikkels','Geef aan welke prikkels lastig zijn.')+'</div><p class="small">Dit overzicht groeit mee met jouw antwoorden.</p>' + `<details class="card app-manage" ${loadError ? 'open' : ''}><summary>App beheren</summary><section><h2>Mijn antwoorden bewaren</h2><p class="small">Alles wordt automatisch bewaard in deze browser. Download een back-up om je antwoorden ook zelf te bewaren.</p><div class="actions"><button id="export-data" class="secondary" type="button">Back-up downloaden</button><label class="button outline" for="import-data">Back-up herstellen</label><input id="import-data" type="file" accept="application/json,.json" hidden></div>${loadError ? '<div class="actions"><button id="export-raw" type="button" class="outline">Oorspronkelijke gegevens downloaden</button></div>' : ''}</section><section><h2>Een voorbeeld bekijken</h2><p class="small">Probeer drie fictieve weken, met patronen om te ontdekken. Je eigen antwoorden blijven bewaard.</p><div class="actions"><button id="add-demo" type="button" class="secondary">Voorbeeldweken toevoegen</button><button id="remove-demo" type="button" class="outline">Voorbeeldgegevens verwijderen</button></div></section><section><h2>Opnieuw beginnen</h2><p class="small">Dit wist je antwoorden. Download eerst een back-up als je ze wilt bewaren.</p><button id="reset-data" type="button" class="danger">Alle gegevens verwijderen</button></section></details>`;
}
function render(focus = false) {
  const requested = location.hash.slice(1) || 'vandaag';
  route = [...routes.map(([key]) => key), 'gegevens'].includes(requested) ? requested : 'vandaag';
  document.querySelector('#nav').innerHTML = routes.map(([key,label]) => `<a href="#${key}" ${route === key ? 'aria-current="page"' : ''}>${icon(key)}${label}</a>`).join('');
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('nl-NL',{weekday:'long', day:'numeric',month:'long'}).format(new Date());
  content.innerHTML = (loadError ? `<div class="error-banner" role="alert">${esc(loadError)}</div>` : '') + ({vandaag:dashboard,energie:energy,prikkels:sensory,brein:brain,sociaal:social,behoeften:needsPage,gebruiksaanwijzing:guide,patronen:patternsPage,gegevens:dataPage}[route])();
  document.title = `Tism — ${routes.find(([key]) => key === route)?.[1] || 'Mijn samenvatting'}`;
  bind();
  countUp();
  if (focus) {content.focus({preventScroll:true}); window.scrollTo(0,0);}
}
const formBind = (id, handler) => {
 const form=document.getElementById(id);if(!form)return;
 const apply=()=>{
  form.dataset.dirty='true';const before=state;
  handler(new FormData(form));
  const note=form.querySelector('.autosave-note');
  if(state!==before){delete form.dataset.dirty;if(note)note.textContent='✓ Bewaard';}
  else if(note)note.textContent='Niet bewaard. Probeer opnieuw of download je gegevens.';
 };
 form.addEventListener('input',apply);form.addEventListener('change',apply);
 form.addEventListener('submit',e=>{e.preventDefault();apply();});
};
function bind() {
  document.getElementById('add-demo')?.addEventListener('click', () => {
    const example = exampleData();
    const checkins = [...state.checkins, ...example.checkins.filter(c => !state.checkins.some(x => x.date === c.date))];
    const activities = [...state.activities, ...example.activities.filter(a => !state.activities.some(x => x.id === a.id))];
    if (save({...state,checkins,activities},'De fictieve voorbeeldweken zijn toegevoegd.')) location.hash = 'vandaag';
  });
  document.getElementById('remove-demo')?.addEventListener('click', () => {
    if (!confirm('Alleen de fictieve voorbeeldgegevens verwijderen? Eigen gegevens blijven behouden.')) return;
    if (save({...state,checkins:state.checkins.filter(c => !c.id.startsWith('_tism_example_')),activities:state.activities.filter(a => !a.id.startsWith('_tism_example_'))},'De voorbeeldgegevens zijn verwijderd.')) render();
  });
  content.querySelectorAll('input[type=range]').forEach(input => input.addEventListener('input', () => document.getElementById(`${input.id}-value`).textContent = `${input.value}${input.id === 'effect' ? '' : '%'}`));

  formBind('checkin-form', f => {
    const draft={...Object.fromEntries(f),_date:today()};
    const energy=f.get('energy')??f.get('previous-energy');const social=f.get('social')??f.get('previous-social');
    const next={...state,drafts:{...state.drafts,checkin:draft}};
    if(energy!==null && social!==null && Number.isFinite(Number(energy)) && Number.isFinite(Number(social))) {
      const check={id:lastCheck()?.id||crypto.randomUUID(),date:today(),energy:Number(energy),social:Number(social),note:lastCheck()?.note||''};
      next.checkins=[...state.checkins.filter(c=>c.date!==today()),check];
    }
    save(next);
  });
  const activityForm = document.getElementById('activity-form');
  activityForm?.querySelectorAll('input[name="title"]').forEach(input => input.addEventListener('change', () => {
    const field = document.getElementById('custom-title-field');
    const chosen = activityForm.elements.title.value === 'anders';
    field.hidden = !chosen;
    field.querySelector('input').disabled = !chosen;
    if (chosen) field.querySelector('input').focus();
  }));
  formBind('activity-form', f => {
    const draft={...Object.fromEntries(f),_date:today(),_id:activityForm.dataset.activityId || crypto.randomUUID()};
    const title=f.get('title')==='anders'?String(f.get('customTitle')||'').trim():f.get('title');
    const next={...state,drafts:{...state.drafts,activity:draft}};
    if(title && f.get('effect')!==null) {
      const activity={id:draft._id,date:today(),title,effect:Number(f.get('effect'))*20,recovery:Number(f.get('recovery')||0),stimuli:stimuli.filter(s=>f.get('stimulus:'+s)==='1'),customStimulus:String(f.get('customStimulus')||'').trim()};
      next.activities=[...state.activities.filter(a=>a.id!==draft._id),activity];
    }
    if(save(next)) activityForm.dataset.activityId=draft._id;
  });
  document.getElementById('new-activity')?.addEventListener('click',()=>{
    if(!activityForm.dataset.activityId || !state.activities.some(a=>a.id===activityForm.dataset.activityId)){toast('Kies eerst een activiteit en een duimpje.');return;}
    const drafts={...state.drafts};delete drafts.activity;
    if(save({...state,drafts}))render();
  });
  formBind('sensory-form', f =>{const sensory={...state.sensory}; stimuli.forEach(s=>{const vote=f.get(s); const previous=state.sensory[s]; if(vote!==null && (previous===undefined || vote!==(previous>=2?'-1':'1')))sensory[s]=vote==='1'?0:3;});save({...state,sensory,sensoryNotes:String(f.get('sensoryNotes') ?? state.sensoryNotes)});});
  formBind('brain-form', f =>{const reactions=readReactions(f,'brain',traits);save({...state,reactions,brain:yesSelections(reactions,'brain',traits,state.brain)});});
  formBind('social-form', f =>save({...state,reactions:readReactions(f,'social',socialChoices)}));
  formBind('needs-form', f =>{const reactions=readReactions(f,'needs',needs);save({...state,reactions,needs:yesSelections(reactions,'needs',needs,state.needs),needsNotes:String(f.get('needsNotes') ?? state.needsNotes)});});
  formBind('guide-form', f =>save({...state,reactions:readReactions(f,'guide',['klopt'])}));
  content.querySelectorAll('[data-delete-activity]').forEach(button => button.addEventListener('click', () => {if (confirm('Deze activiteit verwijderen?') && save({...state,activities:state.activities.filter(a => a.id !== button.dataset.deleteActivity),drafts:state.drafts.activity?._id===button.dataset.deleteActivity?Object.fromEntries(Object.entries(state.drafts).filter(([key])=>key!=='activity')):state.drafts})) render();}));
  content.querySelectorAll('[data-delete-check]').forEach(button => button.addEventListener('click', () => {if (confirm('Deze check-in verwijderen?') && save({...state,checkins:state.checkins.filter(a => a.id !== button.dataset.deleteCheck),drafts:Object.fromEntries(Object.entries(state.drafts).filter(([key])=>key!=='checkin'))})) render();}));
  document.getElementById('print-guide')?.addEventListener('click', () => window.print());
  document.getElementById('export-data')?.addEventListener('click', () => {if (loadError) {toast('Download eerst de oorspronkelijke gegevens hieronder.'); return;} download(JSON.stringify(state,null,2),`tism-backup-${today()}.json`);});
  document.getElementById('export-raw')?.addEventListener('click', () => {try {download(localStorage.getItem('tism.app.v1') || '',`tism-oorspronkelijk-${today()}.json`);} catch {toast('Deze browser geeft geen toegang tot de opgeslagen gegevens.');}});
  document.getElementById('import-data')?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('De back-up is te groot (maximaal 5 MB).');
      const incoming = validateState(JSON.parse(await file.text()));
      if (!confirm(`Back-up herstellen met ${incoming.checkins.length} check-ins en ${incoming.activities.length} activiteiten? Dit vervangt je huidige gegevens.`)) return;
      state = persistState(localStorage,incoming); loadError = ''; toast('Je back-up is hersteld.'); render();
    } catch (err) {toast(`Herstellen is niet gelukt. ${err instanceof SyntaxError ? 'Dit bestand bevat geen geldige JSON.' : err.message}`);}
    finally {e.target.value = '';}
  });
  document.getElementById('reset-data')?.addEventListener('click', () => {
    if (!confirm('Alle Tism-gegevens in deze browser definitief verwijderen? Dit kun je niet ongedaan maken zonder back-up.')) return;
    try {state = persistState(localStorage,emptyState()); loadError = ''; toast('Je gegevens zijn verwijderd.'); render();} catch {toast('Verwijderen is niet gelukt. De browser geeft geen toegang tot lokale opslag.');}
  });
  if(activityForm && state.drafts.activity?._date===today()) {
    const draft=state.drafts.activity;
    activityForm.dataset.activityId=draft._id || '';
    for(const input of activityForm.querySelectorAll('input,textarea')) {
      const value=draft[input.name];if(value===undefined)continue;
      if(input.type==='radio')input.checked=input.value===value;else input.value=value;
    }
    const custom=document.getElementById('custom-title-field');
    const other=draft.title==='anders';custom.hidden=!other;custom.querySelector('input').disabled=!other;
  }

}
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a?.hash === '#content') {e.preventDefault(); content.focus(); content.scrollIntoView();}
});
window.addEventListener('beforeunload', e => {if (content.querySelector('[data-dirty="true"]')) {e.preventDefault(); e.returnValue = '';}});
window.addEventListener('hashchange', () => {
  if (content.querySelector('[data-dirty="true"]') && !confirm('Je hebt wijzigingen nog niet bewaard. Deze pagina toch verlaten?')) {
    history.replaceState(null,'',`#${route}`); return;
  }
  render(true);
});
// Prevent a second tab from silently replacing this tab's saved answers.
window.addEventListener('storage', e => {if (e.key === 'tism.app.v1') {loadError = 'Je gegevens zijn in een ander tabblad veranderd. Herlaad deze pagina voordat je verder invult. Kopieer eerst eventuele onbewaarde antwoorden.'; toast(loadError);}});
render();
// Installable on a phone: offline copy of the app files, and ask the browser not to clear the saved answers.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
navigator.storage?.persist?.().catch(() => {});
