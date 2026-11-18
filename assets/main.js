/* paid to wait · no dependencies, no build step. All schedule dates use browser local time. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORE = 'paid-to-wait-v1';
  const LAUNCH_STORE = 'paid-to-wait-launch-days-v1';
  const NAMES = { pepe: 'Pepe', capybara: 'Capybara', cat: 'Mèo cam' };
  const CITIES = { hcm: [10.8231,106.6297], hanoi: [21.0285,105.8542], danang: [16.0544,108.2022], dalat: [11.9404,108.4583], cantho: [10.0452,105.7469] };
  const pad = n => String(n).padStart(2, '0');
  const timeText = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dayKey = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  function validTime(value) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  function schedule(date, checkin) {
    const [h,m] = (validTime(checkin) ? checkin : '08:45').split(':').map(Number);
    const at = (hour,minute=0) => new Date(date.getFullYear(),date.getMonth(),date.getDate(),hour,minute,0,0);
    const checkoutMinutes=Math.max(8*60,Math.min(9*60,h*60+m))+570;
    const start = at(h,m), end = at(Math.floor(checkoutMinutes/60),checkoutMinutes%60);
    return { start, end, lunch:at(12), relax:at(12,30), dread:at(13), afternoon:at(13,30), helmet:new Date(+end-300000) };
  }
  function phaseAt(now, s) {
    if (now >= s.end) return 'done';
    if (now < s.start) return 'waiting';
    if (now < s.lunch) return 'morning';
    if (now < s.dread) return 'lunch';
    if (now < s.afternoon) return 'dread';
    if (now < s.helmet) return 'afternoon';
    if (now < s.end) return 'helmet';
    return 'done';
  }
  function countdown(ms) { const secs = Math.max(0,Math.ceil(ms/1000)); return `${pad(Math.floor(secs/3600))}:${pad(Math.floor(secs/60)%60)}:${pad(secs%60)}`; }
  function progressAt(now,s) { return now>=s.end?1:Math.max(0,Math.min(1,(now-s.start)/Math.max(1,s.end-s.start))); }
  // Launch only on a witnessed, recent boundary crossing; opening after checkout never launches.
  function shouldLaunch(previous, now, s, alreadyLaunched) {
    return !alreadyLaunched && s.start<s.end && previous !== null && dayKey(previous) === dayKey(now) && previous < s.end && now >= s.end && now-s.end < 5000 && now-previous < 5000;
  }
  const saved = readJSON(STORE, {});
  let config = { checkin:validTime(saved.checkin)?saved.checkin:'08:45', character:NAMES[saved.character]?saved.character:'pepe', city:CITIES[saved.city]?saved.city:'hcm', started:saved.started===true };
  let editing = !config.started;
  let draft = { ...config };
  let previousReal = null, sceneKey = '', lastAnnouncement = '', launch = null;
  let demo = null, weather = { type:'sunny', temp:null, ready:false }, weatherRequest = 0;
  let reaction = null;
  let workScene = null, badgeKey = '';
  const workSteps=[0,1400,2800,4300,6000,7800];
  const isWorking=phase=>['morning','afternoon','helmet'].includes(phase);
  const reactionSteps = [0,1300,2700,3500,4200,4900,5600,7000];
  const storedDays = readJSON(LAUNCH_STORE,[]);
  const launchDays = new Set(Array.isArray(storedDays)?storedDays.filter(x => typeof x==='string'):[]);
  function persist() { if (!writeJSON(STORE,config)) $('time-note').textContent='Trình duyệt đang chặn lưu trữ. Thiết lập chỉ giữ trong phiên này.'; }

  /* Local vector character kit. Each companion has its own silhouette and gestures. */
  function face(character, mood=0, sleeping=false, glance=false, focused=false) {
    const sad=!focused&&mood<-.25, happy=!focused&&mood>.35;
    let eyes = sleeping ? '<path d="M-33-14q10 9 21 0m19 0q10 9 21 0" fill="none"/>' : character==='pepe'
      ? `<g class="eye"><ellipse cx="-20" cy="-25" rx="19" ry="19" fill="#f8f3d6"/><ellipse cx="20" cy="-25" rx="19" ry="19" fill="#f8f3d6"/><g class="${glance?'clock-glance':''}"><ellipse cx="-17" cy="${-22+mood*2}" rx="5" ry="${7+mood*2}" fill="#303f31"/><ellipse cx="23" cy="${-22+mood*2}" rx="5" ry="${7+mood*2}" fill="#303f31"/></g><path d="M-39-${Math.round(27+mood*9)}q19 -7 38 0l-3-12q-16-16-32 0Zm40 0q19 -7 38 0l-3-12q-16-16-32 0Z" fill="#8eae62" stroke-width="2"/></g>`
      : `<g class="eye ${glance?'clock-glance':''}">${character==='capybara'?'<path d="M-30-12h12m24 0h12" fill="none" stroke-width="4"/>':`<ellipse cx="-23" cy="-14" rx="5" ry="${7+mood*2}" fill="#35402f"/><ellipse cx="23" cy="-14" rx="5" ry="${7+mood*2}" fill="#35402f"/>`}</g>`;
    let shape = character==='pepe' ? '<path d="M-56 2q-8-29 15-42q5-27 28-16q15-10 32 0q23-10 28 16q23 17 12 44q-5 29-57 30Q-52 32-56 2Z" fill="#8eae62"/>'
      : character==='capybara' ? '<ellipse cx="-39" cy="-42" rx="13" ry="16" fill="#b08c63"/><ellipse cx="36" cy="-42" rx="13" ry="16" fill="#b08c63"/><path d="M-54-15q0-32 46-33q49-5 58 30q24 29-3 46q-12 13-44 11q-58 3-57-54Z" fill="#bfa17b"/><ellipse cx="-38" cy="-42" rx="5" ry="8" fill="#d1b18b" stroke="none"/>'
      : '<path d="M-51-7l-5-49l33 23q26-10 47 0l31-23l-4 49q12 39-48 43Q-58 35-51-7Z" fill="#e8a04c"/><path d="M-46-39l15 13l-16 6m88-19L27-26l16 6" fill="#dc8170" stroke="none"/><path d="M-10-35l4 12m13-13l-2 12M-52 0l13 3m-11 9l12-1m89-11l-13 3m11 9l-12-1" stroke="#b67332" stroke-width="5"/>';
    // Bold, readable silhouettes: drooping eyes + inner raised brows versus smiling crescents.
    if(sad&&!sleeping) eyes=`<g class="eye ${glance?'clock-glance':''}">${character==='pepe'?'<ellipse cx="-21" cy="-23" rx="19" ry="16" fill="#f8f3d6"/><ellipse cx="21" cy="-23" rx="19" ry="16" fill="#f8f3d6"/><path d="M-39-25l35 8m8 0l35-8" fill="none" stroke-width="5"/><circle cx="-16" cy="-13" r="4" fill="#303f31"/><circle cx="16" cy="-13" r="4" fill="#303f31"/>':'<path d="M-34-15q12 9 23 0m22 0q12 9 23 0" fill="none" stroke-width="4"/>'}<path d="M-36-34l22-9m28 0l22 9" fill="none" stroke-width="4"/></g>`;
    if(happy&&!sleeping) eyes=`<g class="eye ${glance?'clock-glance':''}">${character==='pepe'?'<ellipse cx="-21" cy="-26" rx="19" ry="19" fill="#f8f3d6"/><ellipse cx="21" cy="-26" rx="19" ry="19" fill="#f8f3d6"/>':''}<path d="M-34-13q12-23 25 0m18 0q12-23 25 0" fill="none" stroke-width="4"/></g>`;
    if(focused) eyes='<g class="eye focused-eyes"><path d="M-37-26l28 10q-15 15-28-10Zm46 10l28-10q-13 25-28 10Z" fill="#faf6df"/><path d="M-41-34l32 12m18 0l32-12" fill="none" stroke-width="5"/><path d="M-23-18v7m46-7v7" fill="none" stroke-width="6"/></g>';
    let mouth = character==='pepe' ? `<path d="M-38 10q37 ${mood>0?29:mood<-.2?-12:9} 76 0q-39 25-76 0Z" fill="#bf765c"/><path d="M-36 12q36 ${mood>0?14:mood<-.2?-8:3} 72 0" fill="none"/>`
      : character==='capybara' ? '<ellipse cx="10" cy="10" rx="31" ry="20" fill="#cbae87" stroke="none"/><path d="M1 3l5 1m20-1l5 1M7 22h14" fill="none"/>'
      : `<path d="M-5 2h10L0 8Z" fill="#b86550"/><path d="M0 8q-4 12-13 5M0 8q4 12 13 5" fill="none"/>${mood<0?'<path d="M-33-28l16 6m33 0l16-6" fill="none"/>':''}<path d="M-31 6l-23-4m22 13l-23 5m86-14l23-4m-22 13l23 5" fill="none" stroke-width="1.5"/>`;
    const muzzle=character==='capybara'?'<ellipse cx="8" cy="9" rx="31" ry="20" fill="#cbae87" stroke="none"/><path d="M-2 1h5m19 0h5" fill="none"/>':character==='cat'?'<path d="M-5 0h10L0 6Z" fill="#b86550"/><path d="M-34 4l-20-4m20 12l-20 5m88-13l20-4m-20 12l20 5" fill="none" stroke-width="1.5"/>':'';
    if(sad) mouth=`${muzzle}<path class="sad-mouth" d="M${character==='pepe'?'-31 21q31-27 62 0':'-16 22q16-20 32 0'}" fill="none" stroke-width="4"/><path d="M-31 26l-5 4m67-4l5 4" stroke="#8f7863" stroke-width="2"/>`;
    if(happy) mouth=`${muzzle}<path class="happy-mouth" d="M${character==='pepe'?'-35 3q35 8 70 0q-4 38-35 38Q-31 41-35 3':'-20 8q20 5 40 0q-2 26-20 26Q-18 34-20 8'}Z" fill="#754b3b"/><path d="M-11 28q11-10 22 0" stroke="#df8b79" stroke-width="6" fill="none"/>`;
    if(focused) mouth=`${muzzle}<path class="focused-mouth" d="M-20 19h40m-15 5H-5" fill="none" stroke-width="3"/>`;
    const cheeks=happy?'<g fill="#dc8e70" fill-opacity=".65" stroke="none"><ellipse cx="-41" cy="4" rx="9" ry="5"/><ellipse cx="41" cy="4" rx="9" ry="5"/></g>':'';
    return `<g class="line face-expression" data-emotion="${focused?'focused':sad?'sad':happy?'happy':'neutral'}">${shape}${eyes}${mouth}${cheeks}${sad&&!sleeping?'<path class="sad-tear" d="M44-10q-11 15 0 17q11-2 0-17" fill="#a3c6cf" stroke="#6d98a4" stroke-width="1.5"/>':''}${sleeping?'<text class="sleep-z" x="44" y="-51" stroke="none" fill="#6e8461" font-family="Arial" font-size="25">z<tspan dy="-16" font-size="17">z</tspan></text>':''}</g>`;
  }
  function emotionMarks(mood,x=350,y=177) {
    if(mood<-.25) return `<g class="sad-aura" fill="none" stroke="#8d9aa0" stroke-width="3" stroke-linecap="round"><path d="M${x-83} ${y-51}v20m-10-15v15m20-10v13"/><path class="sigh" d="M${x+74} ${y+19}q18-14 25 0q16-8 19 4q-8 15-36 3" fill="#edf1e6" stroke-width="2"/></g>`;
    if(mood>.35) return `<g class="joy-aura" stroke="#d6a24d" stroke-width="3" stroke-linecap="round"><path d="M${x-86} ${y-38}l-12-9m13 28l-15-1m179-18l12-9m-13 28l15-1"/><path class="joy-spark" d="M${x+72} ${y-68}v20m-10-10h20"/><path class="joy-spark" d="M${x-75} ${y+19}v14m-7-7h14"/></g>`;
    return '';
  }
  function portrait(character) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-72 -65 144 120" aria-hidden="true">${face(character,.3)}</svg>`; }
  document.querySelectorAll('.portrait').forEach(el => { el.innerHTML = portrait(el.dataset.character); });
  function coffee(x,y,scale=1) { return `<g transform="translate(${x} ${y}) scale(${scale})" class="line"><path class="steam" d="M8-12q-8-9 0-18" fill="none" stroke="#a4ab8b" stroke-width="2"/><path class="steam second" d="M21-10q-8-9 0-18" fill="none" stroke="#a4ab8b" stroke-width="2"/><path d="M28 1h7q12 0 8 12q-2 6-15 5" fill="none"/><path d="M0-2h30v22q-15 13-30 0Z" fill="#f6f0d6"/><ellipse cx="15" cy="-2" rx="15" ry="4" fill="#825c3d"/><path d="M-4 29h40" stroke="#9ba486" stroke-width="2"/></g>`; }
  function office(now, s) {
    const angle = (now.getHours()%12)*30+now.getMinutes()*.5;
    return `<defs><pattern id="wall-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#dfe5ce" stroke-width=".7"/></pattern><pattern id="floor-grid" width="70" height="24" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)"><path d="M70 0H0V24" fill="none" stroke="#cfd7bb" stroke-width="1"/></pattern><clipPath id="window-clip"><rect x="45" y="24" width="222" height="179" rx="4"/></clipPath></defs>
      <path fill="#e8ecd9" d="M0 0h700v400H0Z"/><path fill="url(#wall-grid)" d="M0 0h700v290H0Z"/><path fill="#dce3c9" d="M0 290h700v110H0Z"/><path fill="url(#floor-grid)" d="M0 290h700v110H0Z"/><path d="M0 290h700" stroke="#bbc7a7" stroke-width="2"/>
      <g clip-path="url(#window-clip)"><path class="sky" fill="#c9ded4" d="M45 24h222v179H45Z"/><g class="sun-disc"><circle class="sun" cx="215" cy="66" r="24" fill="#f2cc71"/><circle cx="215" cy="66" r="33" fill="none" stroke="#f1d79c" stroke-width="1"/></g><g fill="#ebeee0" class="cloud"><path d="M55 67q-5-13 10-14q5-20 25-10q14-7 19 9q18 0 16 15Z"/><path d="M158 112q-5-12 10-14q8-17 23-7q14-4 17 9q15 0 14 12Z"/></g><path fill="#adc5b5" d="M45 174v-35h23v-29h31v50h16v-35h27v45h20v-50h38v29h22v-13h30v-17h15v84H45Z"/><path fill="#b9cfc0" d="M45 178h30v-22h22v27h28v-22h33v22h49v-19h34v17h26v22H45Z"/><g class="rain" stroke="#779ba4" stroke-width="2" opacity=".6">${Array.from({length:16},(_,i)=>`<path d="M${55+i*14} 28l-9 25m4 24l-9 25m9 22l-9 25m6 22l-9 25"/>`).join('')}</g></g>
      <g class="line" fill="none" stroke="#71816a"><rect x="40" y="19" width="232" height="190" rx="5" stroke-width="5"/><path d="M155 21v186M42 119h228" stroke-width="4"/><path d="M31 211h250" stroke-width="6"/></g>
      <g class="line"><circle cx="576" cy="60" r="30" fill="#f5f1d9" stroke="#8c967a" stroke-width="2"/><g stroke="#b9bea6" stroke-width="2"><path d="M576 34v5m0 42v5m-26-26h5m42 0h5"/></g><path d="M576 60v-17" stroke="#6d7d61" transform="rotate(${angle} 576 60)"/><path d="M576 60v-23" stroke="#6d7d61" stroke-width="2" transform="rotate(${now.getMinutes()*6} 576 60)"/><circle cx="576" cy="60" r="2" fill="#6d7d61"/></g>
      <g transform="rotate(-5 548 154)"><path d="M512 112h75v86h-75Z" fill="#f5edcc" stroke="#b9bc9c"/><path d="M535 109h26v8h-26Z" fill="#bdc4a0"/><text x="550" y="144" text-anchor="middle" font-size="9" fill="#7d8866" font-family="Arial">WORK HARD</text><text x="550" y="163" text-anchor="middle" font-size="14" fill="#da754c" font-weight="bold" font-family="Arial">GO HOME.</text><path d="M538 177h24" stroke="#d1bd8a" stroke-width="2"/></g>
      <g class="line" stroke="#778564" stroke-width="2"><path d="M619 275q-19-47-12-66m11 36q-1-48 15-63m-15 62q21-37 33-33" fill="none"/><path d="M608 228q-30-2-27-25q24-3 27 25m16-15q-2-32 21-34q8 23-21 34m11 22q9-23 30-16q-1 21-30 16" fill="#9dae7d"/><path d="M596 260h48l-9 40h-31Z" fill="#cda789"/></g>`;
  }
  function worker(character, mood, helmet=false, finalSecond=false, focused=false) {
    helmet=helmet&&character==='pepe';
    const skin = character==='pepe'?'#8eae62':character==='capybara'?'#bfa17b':'#e8a04c';
    return `<g class="line"><path d="M300 251v64h87v-64" fill="#82968a"/><path d="M339 309v51m-34 0h69" fill="none" stroke="#6c7b68" stroke-width="5"/><g class="foot"><path d="M318 300l-7 40h22l7-40" fill="#6c7d81"/><path d="M309 338q-18 8-10 15h35v-15Z" fill="#4d584b"/></g><path d="M350 300l10 40h22l-10-40" fill="#6c7d81"/><path d="M361 338v15h35q8-8-14-15Z" fill="#4d584b"/><path d="M301 255q1-41 48-42q43 0 52 42l-10 54h-84Z" fill="${character==='cat'?skin:'#7191a1'}"/><path d="M342 224l9 13l11-13" fill="none" stroke="#bfd0ca" stroke-width="2"/>
      <g transform="translate(350 190)"><g class="head-emote">${face(character,mood,false,false,focused)}${helmet?'<circle class="astronaut-helmet" cy="-10" r="73" fill="#dfeef0" fill-opacity=".22" stroke="#758b87" stroke-width="5"/><path d="M-55 32q54 20 110 0l-3 17q-54 16-104 0Z" fill="#eee9d3"/><path class="helmet-shine" d="M-49-35q9-24 32-29" stroke="#fffaf0" stroke-width="7" fill="none"/>':''}</g></g>
      <g class="arm"><path d="M305 240q-11 17 0 30l39 5l4-13l-31-5" fill="${character==='cat'?skin:'#7191a1'}"/><path d="M339 261q15-4 16 4l10-2q6 5-2 9l-21 3Z" fill="${skin}"/></g><g class="arm other"><path d="M386 240q17 17 8 30l-28 3l-2-12l17-7" fill="${character==='cat'?skin:'#7191a1'}"/><path d="M371 260q-15 0-15 7l-8 2q-2 7 9 5l16-1Z" fill="${skin}"/></g>
      ${character==='cat'?'<path class="foot" d="M396 303q48 19 45-16q-2-15-16-10" fill="none" stroke="#df9645" stroke-width="13"/>':''}</g>
      <g class="line"><path d="M207 284v81m281-81v81" stroke="#9b8867" stroke-width="10"/><path d="M188 276h322v15H188Z" fill="#c2a983"/><path d="M353 270h91l15 6H342Z" fill="#d2d8c5"/><path d="M363 273h71" stroke="#8e9986" stroke-width="2"/><path d="M225 204h93v58h-93Z" fill="#8faaa2"/><path d="M234 213h75v40h-75Z" fill="#d5e1cc" stroke="#748c7e" stroke-width="1.5"/><path d="M267 262v12m-12 0h26" stroke="#7a8c78" stroke-width="4"/><path d="M244 223h25m-25 7h40m-40 7h19" stroke="#92af97" stroke-width="2"/></g>
      <g class="${character==='pepe'&&!focused?'sip':''}">${coffee(465,246,.72)}</g>
      ${character==='cat'?'<g class="arm other line"><path d="M381 302q25-2 28-34l20-2q12 6 3 11l-16 1q-1 34-35 37" fill="#e8a04c"/><path d="M418 267v7m7-7v7" stroke="#b67332" stroke-width="2"/></g>':''}
      ${focused?'<g class="focus-marks" fill="none" stroke="#7c8b6b" stroke-width="3" stroke-linecap="round"><path d="M280 140l-10-9m12 24h-15m149-15l10-9m-12 24h15"/><path class="typing-lines" d="M346 255l-3-7m14 5v-7m15 9l3-7m-14 13h14"/></g>':emotionMarks(mood)}${finalSecond&&character==='cat'?'<g class="cat-button"><circle cx="425" cy="264" r="10" fill="#ee6940" stroke="#664833" stroke-width="2"/><path d="M397 244q23-4 29 13" stroke="#df9645" stroke-width="10" fill="none"/><text x="417" y="239" font-size="11" fill="#a25637">bấm thử?</text></g>':''}`;
  }
  function lunch(character,dread,mood) {
    const look = dread?'clock-glance':'';
    if(character==='pepe') return `<g class="hammock-swing line"><path d="M177 164v174m282-174v174" stroke="#ae9170" stroke-width="8"/><path d="M172 189q139 151 293 0q-30 154-145 120Q219 296 172 189Z" fill="#c7a87e"/><path d="M185 210q140 124 267 0" stroke="#f3dfad" fill="none" stroke-width="5"/><path d="M258 249q60-35 124 13l-1 28h-89Z" fill="#7898a3"/><g transform="translate(277 244) rotate(-15)">${face('pepe',mood,!dread,dread)}</g>${window.PaidToWaitWork.limb([[355,263],[380,268],[403,275]],"#7898a3","#8eae62",{width:20})}${window.PaidToWaitWork.limb([[372,273],[393,281],[418,270]],"#718581","#718581",{width:22,leg:true})}</g>${dread?'<text x="407" y="170" fill="#7b8268" font-size="17">…13:00 rồi á?</text>':''}`;
    if(character==='capybara') return `<g class="line"><ellipse cx="354" cy="327" rx="118" ry="15" fill="#bdc9ae" stroke="none"/><path d="M235 267h229l-18 55q-91 32-193 0Z" fill="#e9e8cc"/><ellipse cx="350" cy="267" rx="115" ry="30" fill="#c9ded1"/><g transform="translate(350 231)">${face('capybara',mood,false,dread)}<circle cx="2" cy="-64" r="18" fill="#eaa24f" stroke="#b88744" stroke-width="2"/><path d="M3-81q12-16 22-5q-4 10-22 5" fill="#7e9a61" stroke-width="2"/></g><path d="M245 273q20 12 40 0m63 6q22 10 44-1m21-8q19 9 35-1" fill="none" stroke="#93b3a1" stroke-width="2"/><path class="steam" d="M274 214q-10-20 0-33m150 27q-10-20 0-33" fill="none" stroke="#afbca2" stroke-width="2"/></g><text x="456" y="216" class="${look}" fill="#7b8268" font-size="13">${dread?'hết giờ chill rồi sao…':'đây mới là cuộc sống!'}</text>`;
    return `<g class="line"><path d="M205 289h295v14H205Zm18 14v59m255-59v59" fill="#c3aa86" stroke="#a18d6b"/><path d="M269 276h163l20 13H249Z" fill="#9dad9d"/><path d="M273 276l-12-59h89l14 59" fill="#a9bbb0"/><ellipse cx="367" cy="259" rx="65" ry="31" fill="#e8a04c"/><g transform="translate(342 251) rotate(-13)">${face('cat',mood,!dread,dread)}</g><path d="M402 242q57 15 22 40q-22 14-42 0q-13-12 8-19" fill="none" stroke="#be7b37" stroke-width="16"/><path d="M411 246q17 8 10 17" fill="none" stroke="#e8a04c" stroke-width="9"/></g><text x="440" y="203" fill="#7b8268" font-size="13">${dread?'ngủ thêm 5 phút…':'laptop: chế độ ủ ấm.'}</text>`;
  }
  function rocket(character) {
    return `<g class="rocket-group line"><ellipse cx="350" cy="347" rx="70" ry="12" fill="#bec9aa" stroke="none"/><g class="flame"><path d="M324 311q-8 62 26 87q35-31 27-87" fill="#ef9551" stroke="#da7842"/><path d="M337 316q-8 38 13 57q18-20 13-57" fill="#f9d888" stroke="none"/></g><path d="M312 259q-53 21-48 72l55-21m69-51q53 21 48 72l-55-21" fill="#dd7c51"/><path d="M312 310q-21-130 38-185q58 55 38 185Z" fill="#f6ecd0"/><path d="M324 159q26-46 52 0Z" fill="#df7b50"/><path d="M315 288h70v24h-70Z" fill="#7f9b89"/><circle cx="350" cy="219" r="48" fill="#c2d8cf"/><g transform="translate(350 225) scale(.65)">${face(character,1)}<circle cy="-10" r="73" fill="#dfeef0" fill-opacity=".15" stroke="#7f9c8c" stroke-width="4"/></g>${character==='pepe'?coffee(376,253,.55):character==='capybara'?'<path d="M322 267h55m-48 0l40 35m-38 0l38-35" fill="none" stroke="#977a55" stroke-width="3"/><path d="M328 255h42v15h-42Z" fill="#b8c99b"/>':'<circle cx="385" cy="269" r="9" fill="#ee6940"/><path d="M362 256l23 12" stroke="#e8a04c" stroke-width="9"/>'}</g>`;
  }
  function wheel(x,y,r) {
    return `<g transform="translate(${x} ${y})"><g class="vehicle-wheel"><circle r="${r}" fill="#f1eedb" stroke="#566653" stroke-width="6"/><circle r="${r-7}" fill="none" stroke="#b6c1a8" stroke-width="2"/><path d="M-${r-6} 0h${2*(r-6)}M0-${r-6}v${2*(r-6)}" stroke="#97a58c" stroke-width="2"/><circle r="4" fill="#566653"/></g></g>`;
  }
  function departure(character) {
    if(character==='pepe') return rocket('pepe');
    if(character==='capybara') return `<g class="departure-group scooter-group line" data-vehicle="scooter">
      <ellipse cx="353" cy="368" rx="112" ry="9" fill="#bdc9ae" stroke="none"/>
      ${wheel(305,350,17)}${wheel(451,350,17)}
      <path d="M300 332h128l15-13" fill="none" stroke="#de7c50" stroke-width="10"/><path d="M444 337l-17-116m-17-2h36" fill="none" stroke="#6f8b7c" stroke-width="7"/>
      <g class="rider-bounce"><rect class="backpack" x="284" y="219" width="43" height="68" rx="13" fill="#d77c4b"/><path d="M289 245h29v28h-29m12-54v-9h10v9" fill="none" stroke="#a65e3e" stroke-width="3"/>
      <path d="M321 219q30-15 62 5l-12 65h-50Z" fill="#7999a2"/><path d="M326 224q-16 32-2 61" fill="none" stroke="#d8ae70" stroke-width="7"/>
      <path d="M353 281l12 42l-13 10h38q5-8-13-13l-7-40" fill="#6c7d81"/>
      <g class="scooter-kick"><path d="M333 280l-24 31l-32 4l-8 13l44-3l35-37" fill="#6c7d81"/><path d="M270 316l-8 16l24-4" fill="#4d584b"/></g>
      ${window.PaidToWaitWork.limb([[377,234],[401,240],[427,219]],'#7999a2','#bfa17b',{width:23})}
      <g transform="translate(353 189) rotate(5)">${face('capybara',1)}</g></g>
      ${emotionMarks(1,353,182)}<path class="speed-lines" d="M236 286h38m-52 18h41m-17 37h24" fill="none" stroke="#9bac8c" stroke-width="3"/>
      </g>`;
    return `<g class="departure-group bicycle-group line" data-vehicle="bicycle">
      <ellipse cx="350" cy="386" rx="139" ry="8" fill="#bdc9ae" stroke="none"/>
      ${wheel(266,335,43)}${wheel(444,335,43)}
      <path d="M266 335l57-76l43 76H266l57-76h92l-49 76m49-76l29 76m-32-76l-8-24h27" fill="none" stroke="#e47d4e" stroke-width="6"/><path d="M323 259l-7-17m-15 0h32" fill="none" stroke="#576851" stroke-width="6"/>
      <g class="rider-bounce"><path class="cat-tail" d="M322 251q-59 8-47-24q6-14 17-7" fill="none" stroke="#d99041" stroke-width="14"/>
      <path d="M328 213q21-13 42-2l21 36l-52 16l-22-27Z" fill="#c88458"/>
      ${window.PaidToWaitWork.limb([[365,216],[390,232],[425,237]],'#c88458','#e8a04c',{width:22})}
      <g class="pedal-leg leg-back">${window.PaidToWaitWork.limb([[338,252],[379,278],[352,317]],'#60776f','#60776f',{width:22,leg:true})}</g>
      <g class="pedal-leg leg-front">${window.PaidToWaitWork.limb([[342,253],[326,291],[365,317]],'#7c9287','#7c9287',{width:23,leg:true})}</g>
      <g transform="translate(350 181) rotate(7)">${face('cat',1)}</g></g>
      <g transform="translate(366 335)"><g class="bike-crank"><circle r="12" fill="#e9e3cd" stroke="#6a7e64" stroke-width="3"/><path d="M-16-13l32 26m-39-26h14m14 26h14" fill="none" stroke="#667960" stroke-width="4"/></g></g>
      ${emotionMarks(1,350,174)}<path class="speed-lines" d="M198 252h48m-64 20h52m-35 31h24" fill="none" stroke="#9bac8c" stroke-width="3"/>
      </g>`;
  }
  const departureCopy = {
    pepe:['Hết giờ. Ôm cà phê, phóng thôi!','tạm biệt trái đất, tạm biệt deadline.'],
    capybara:['Cặp đã đeo. Scooter đã lên. Về thôi!','lướt về nhà, lòng nhẹ tênh.'],
    cat:['Hết ca rồi! Đạp một mạch về nhà!','bốn chân đạp phím, hai chân đạp xe.']
  };
  const captions = {
    waiting:['Chưa tới giờ. Cà phê cứ thong thả.','vào ca đúng giờ, bình tĩnh đúng lúc.'],
    morning:['Một ngón tay làm việc. Cả tâm hồn chờ về.','cà phê trước, deadline sau.'],
    lunch:['Nghỉ trưa là một bộ môn nghệ thuật.','đang sạc lại pin xã hội.'],
    dread:['Vẫn nghỉ trưa. Nhưng lòng không còn yên.','đồng hồ ơi, chậm một chút.'],
    afternoon:['Làm thêm chút nữa. Tự do đang tới gần.','cố lên, chiếc giường đang đợi.'],
    helmet:['Còn 5 phút. Đừng ai nhắn ‘em rảnh không?’','tay vẫn gõ. tâm hồn ở bãi phóng.'],
    launch:['Hết giờ. Xin phép được bay!','hẹn gặp lại vào ca sau.'],
    done:['Đã tan làm. Hôm nay bạn làm tốt rồi.','đóng máy, mở cuộc sống.']
  };
  function moneyRain() {
    return `<g class="money-rain" aria-hidden="true">${Array.from({length:12},(_,i)=>`<g transform="translate(${25+i*59} -60)"><g class="dollar-bill" style="--fall-delay:-${(i*1.37).toFixed(2)}s;--fall-duration:${6+i%4}s"><g transform="rotate(${i%2?18:-17})"><rect x="-22" y="-11" width="44" height="22" rx="2" fill="#bad29a" stroke="#6e965f" stroke-width="1.5"/><rect x="-18" y="-7" width="36" height="14" rx="2" fill="none" stroke="#83a66a"/><ellipse rx="8" ry="9" fill="#dce8bb"/><text y="5" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#658953">$</text></g></g></g>`).join('')}</g>`;
  }
  function renderScene(character, phase, now, s) {
    $('scene').dataset.demo=String(!!demo);
    if(workScene&&isWorking(phase)){
      const elapsed=performance.now()-workScene.started;
      const stage=workSteps.reduce((last,time,index)=>elapsed>=time?index:last,0);
      const key=`work-${workScene.kind}-${character}-${workScene.started}-${stage}`;
      if(sceneKey!==key){
        sceneKey=key;
        $('scene').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 400" aria-hidden="true">${window.PaidToWaitWork.render(workScene.kind,character,stage,face)}</svg>`;
        $('scene').dataset.phase=phase;$('scene').dataset.emotion='neutral';$('scene').dataset.workScene=workScene.kind;
        const description=window.PaidToWaitWork.describe(workScene.kind,stage);
        $('scene').setAttribute('aria-label',description);$('scene-caption').textContent=description;
        $('scene-sticker').textContent=window.PaidToWaitWork.names[workScene.kind];$('announcer').textContent=description;
      }
      return;
    }
    delete $('scene').dataset.workScene;
    if(reaction&&phase==='done'){
      const elapsed=performance.now()-reaction.started;
      const stage=reactionSteps.reduce((last,time,index)=>elapsed>=time?index:last,0);
      const key=`reaction-${character}-${reaction.started}-${stage}`;
      if(key!==sceneKey){
        sceneKey=key;
        $('scene').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 400" aria-hidden="true">${window.PaidToWaitReactions.render(character,stage,face)}</svg>`;
        $('scene').dataset.phase='done';$('scene').dataset.emotion='neutral';$('scene').dataset.reaction=character;
        const description=window.PaidToWaitReactions.describe(character,stage);
        $('scene').setAttribute('aria-label',description);$('scene-caption').textContent=description;
        $('scene-sticker').textContent='đã tan làm là đã tan làm.';$('announcer').textContent=description;
      }
      return;
    }
    delete $('scene').dataset.reaction;
    const mood = phase==='morning'?Math.max(-1,Math.min(1,(now-s.start)/(s.lunch-s.start)*2-1)):phase==='afternoon'?Math.max(-1,Math.min(1,(now-s.afternoon)/(s.helmet-s.afternoon)*2-1)):phase==='dread'?.2-(now-s.dread)/(s.afternoon-s.dread)*1.2:1;
    const focused=phase==='morning'||(phase==='afternoon'&&mood<=.35);
    $('scene').dataset.emotion=focused?'focused':mood<-.25?'sad':mood>.35?'happy':'neutral';
    const bucket=Math.round(mood*4), finalSecond=phase==='helmet'&&s.end-now<=1000;
    const eating=phase==='lunch'&&now.getHours()===12&&now.getMinutes()<30;
    const key = `${character}-${phase}-${$('scene').dataset.emotion}-${eating}-${bucket}-${now.getMinutes()}-${finalSecond}`;
    if(key!==sceneKey){
      sceneKey=key;
      const middle = eating?window.PaidToWaitWork.lunch(character,face)+emotionMarks(1,350,177):['lunch','dread'].includes(phase) ? lunch(character,phase==='dread',mood)+emotionMarks(mood,character==='pepe'?277:350,character==='pepe'?235:225) : phase==='launch'?departure(character):phase==='done'
        ? `<g class="line"><path d="M224 280h252v13H224Zm20 14v58m212-58v58" fill="#c3ac88" stroke="#9d8d6c"/><path d="M274 269h117l13 10H263Z" fill="#a2b3a0"/><path d="M311 314v39m-26 0h51" stroke="#8b9b82" stroke-width="5"/><path d="M282 291v35h60v-35" fill="#a5b49b"/></g><g transform="rotate(-5 350 175)"><rect x="258" y="134" width="184" height="78" rx="5" fill="#f8edcb" stroke="#bfb58f" stroke-width="2"/><text x="350" y="165" text-anchor="middle" font-family="Arial" fill="#eb7245" font-size="21" font-weight="700">Đã tan làm</text><text x="350" y="190" text-anchor="middle" font-family="Arial" fill="#8b9478" font-size="11">offline, nhưng đang sống tốt.</text></g><text class="spark" x="242" y="130" font-size="27" fill="#d9a64f">✦</text><text class="spark" x="456" y="196" font-size="22" fill="#d9a64f">✧</text>`
        : worker(character,phase==='waiting'?0:mood,phase==='helmet',finalSecond,focused);
      const working=(!editing||!!demo)&&['morning','afternoon','helmet'].includes(phase);
      $('scene').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${office(now,s)}${middle}${working?moneyRain():''}</svg>`;
      $('scene').dataset.phase=phase;
      const description = phase==='launch'?`${NAMES[character]} cười vui sướng. ${departureCopy[character][0]}`:focused?`${NAMES[character]} tập trung cao độ, mắt cau có nghiêm túc, tay gõ phím liên tục.`:phase==='morning'||phase==='afternoon'?`${NAMES[character]} cười rạng rỡ, mắt cong và má hồng.`:`${NAMES[character]}. ${captions[phase][0]}`;
      $('scene').setAttribute('aria-label',description);
      $('scene-caption').textContent=phase==='morning'&&character!=='pepe'?(character==='capybara'?'Mặt bình thản. Chân rung theo nhịp deadline.':'Bàn phím là để đạp. Deadline là để mai.'):captions[phase][0];
      $('scene-sticker').textContent=captions[phase][1];
      if(focused){$('scene-caption').textContent='Tập trung cao độ. Tay gõ không ngừng.';$('scene-sticker').textContent='đang cày, xin đừng cám dỗ.';}
      if(eating){$('scene-caption').textContent='Vừa ăn vừa xem máy tính. Tai nghe bật, thế giới tắt.';$('scene-sticker').textContent='12:00 – 12:30 · nạp cơm, nạp nhạc.';$('scene').setAttribute('aria-label',`${NAMES[character]} đeo tai nghe, vừa ăn vừa xem máy tính.`);}
      if(phase==='launch'){$('scene-caption').textContent=departureCopy[character][0];$('scene-sticker').textContent=departureCopy[character][1];}
      if(phase==='helmet'&&character!=='pepe')$('scene-sticker').textContent='tay vẫn gõ. xe đã sẵn sàng.';
    }
    $('scene').dataset.weather = weather.type==='sunny'&&now>=s.end?'sunset':weather.type;
  }
  function demoDate(elapsed,s) {
    // Deliberate holds make 13:00, the five-minute gag and the final second observable.
    const points = [[0,+s.start],[4,+s.lunch],[7,+s.dread],[10,+s.afternoon],[14,+s.helmet],[16,+s.end-1000],[17,+s.end],[20,+s.end+4000]];
    for(let i=1;i<points.length;i++) if(elapsed<=points[i][0]) {const [a,x]=points[i-1],[b,y]=points[i];return new Date(x+(y-x)*(elapsed-a)/(b-a));}
    return new Date(+s.end+4000);
  }
  function setPanels() {
    $('setup-panel').hidden=!!demo||!editing;
    $('active-panel').hidden=!demo&&editing;
    $('demo-banner').hidden=!demo;
    $('start-label').textContent=config.started?'Lưu thay đổi':'Bắt đầu ca';
  }
  function updatePreviewTime(){
    if(!validTime($('checkin').value)){ $('checkin').setCustomValidity('Chọn giờ check-in.');$('checkout').textContent='--:--';return; }
    $('checkin').setCustomValidity(''); draft.checkin=$('checkin').value;
    $('checkout').textContent=timeText(schedule(new Date(),draft.checkin).end);
    sceneKey=''; tick();
  }
  function applyForm(){
    $('checkin').value=draft.checkin;
    document.querySelectorAll('input[name="character"]').forEach(input=>{input.checked=input.value===draft.character;});
    $('city').value=config.city;
    $('checkout').textContent=timeText(schedule(new Date(),draft.checkin).end);
  }
  function markLaunch(date){
    launchDays.add(dayKey(date));
    // Keep only a small ledger. Today's launch is never cleared by setting changes.
    writeJSON(LAUNCH_STORE,Array.from(launchDays).sort().slice(-60));
  }
  function tick(){
    const realNow=new Date();
    const current=demo?demo.config:editing?draft:config;
    const s=schedule(realNow,current.checkin);
    let now=realNow;
    if(demo){
      const elapsed=(performance.now()-demo.started)/1000;
      now=demoDate(Math.min(elapsed,20),s);
      $('demo-time').textContent=timeText(now);
      $('demo-progress').style.width=`${Math.min(100,elapsed*5)}%`;
      if(elapsed>=20){stopDemo();return;}
    }
    let phase=phaseAt(now,s);
    if(demo){
      if(phase==='done'&&!demo.launched){demo.launched=true;demo.launchStart=performance.now();sceneKey='';}
      if(demo.launched&&performance.now()-demo.launchStart<2400)phase='launch';
    }else if(config.started&&!editing){
      if(shouldLaunch(previousReal,now,s,launchDays.has(dayKey(now)))){
        markLaunch(now);launch={day:dayKey(now),started:performance.now()};sceneKey='';
      }
      if(launch&&launch.day===dayKey(now)&&performance.now()-launch.started<3600&&phase==='done')phase='launch';
      previousReal=realNow;
    }
    // Setup is an inviting preview, independent of today's actual time.
    if(editing&&!demo){now=new Date(+s.start+3600000);phase='morning';}
    if(workScene&&(!isWorking(phase)||editing||demo||workScene.day!==dayKey(realNow)||workScene.character!==current.character||performance.now()-workScene.started>=(workScene.kind==='meeting'?6500:9500))){
      workScene=null;sceneKey='';
    }
    if(reaction&&(phase!=='done'||editing||demo||reaction.day!==dayKey(realNow)||reaction.character!==current.character))reaction=null;
    renderScene(current.character,phase,now,s);
    $('off-duty-skull').toggleAttribute('hidden',!['done','launch'].includes(phase)||editing);
    $('off-duty-actions').hidden=phase!=='done'||editing||!!demo;
    $('close-reaction').hidden=!reaction;
    $('work-actions').hidden=editing||!!demo||!isWorking(phase);
    $('close-work-scene').hidden=!workScene;
    document.querySelectorAll('[data-work-scene]').forEach(button=>button.setAttribute('aria-pressed',String(workScene?.kind===button.dataset.workScene)));
    const checkinMinutes=Number(current.checkin.slice(0,2))*60+Number(current.checkin.slice(3));
    const badgeKind=checkinMinutes<=540?'early':'late';
    const showBadge=!!badgeKind&&!editing&&now>=s.start;
    const nextBadgeKey=showBadge?`${badgeKind}-${current.character}`:'';
    if(nextBadgeKey!==badgeKey){
      badgeKey=nextBadgeKey;
      $('attendance-badge').hidden=!showBadge;
      $('attendance-badge').innerHTML=showBadge?window.PaidToWaitWork.badge(badgeKind,current.character,face)+`<span>${badgeKind==='early'?'Chú ong chăm chỉ':'Kẻ hủy diệt chuyên cần'}</span>`:'';
    }
    $('local-date').textContent=realNow.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
    $('rail-start').textContent=timeText(s.start);$('rail-helmet').textContent=timeText(s.helmet);$('rail-end').textContent=timeText(s.end);
    const departureLabel=current.character==='pepe'?'Sẵn sàng phóng':'Sẵn sàng lên xe';
    document.querySelector('[data-milestone="helmet"] strong').textContent=departureLabel;
    document.querySelectorAll('[data-milestone]').forEach(el=>el.classList.toggle('current',el.dataset.milestone===(phase==='launch'?'done':phase)));
    if(!demo&&editing)return;
    const waiting=phase==='waiting', done=phase==='done'||phase==='launch';
    $('countdown').textContent=countdown(waiting?s.start-now:s.end-now);
    $('status-label').textContent=demo?'ĐỒNG HỒ MÔ PHỎNG':waiting?'CHƯA TỚI GIỜ VÀO CA':done?'HẾT CA · TẮT CHẾ ĐỘ CÔNG VIỆC':phase==='lunch'||phase==='dread'?'ĐANG NGHỈ TRƯA':'ĐANG TRONG CA';
    $('timer-title').textContent=waiting?'Chưa tới giờ đâu.':done?'Đã tan làm.':phase==='helmet'?(current.character==='pepe'?'Chuẩn bị cất cánh.':'Chuẩn bị lên xe.'):phase==='lunch'?'Giờ hồi máu rồi.':phase==='dread'?'Trưa ơi, đừng đi.':'Còn chút nữa thôi.';
    $('timer-subtitle').textContent=waiting?'Đếm ngược đến giờ vào ca.':done?'Thời gian còn lại là của bạn.':phase==='helmet'?(current.character==='pepe'?'Mũ đã đội. Tay vẫn gõ phím.':'Xe đã sẵn sàng. Tay vẫn gõ phím.'):'Đếm ngược tới chiếc cửa tự do.';
    $('shift-start').textContent=`${timeText(s.start)} vào ca`;$('shift-end').textContent=`${timeText(s.end)} về nhà`;
    const progress=Math.floor(progressAt(now,s)*100);
    $('shift-fill').style.width=`${progress}%`;$('shift-progress').setAttribute('aria-valuenow',progress);$('progress-percent').textContent=`${progress}% đã đi qua`;
    const next = [[s.start,'Bật chế độ làm'],[s.lunch,'Nạp năng lượng'],[s.relax,'Nghỉ trưa thảnh thơi'],[s.dread,'Hơi rén rồi'],[s.afternoon,'Quay lại bàn'],[s.helmet,departureLabel],[s.end,'Tự do rồi!']].find(([date])=>now<date);
    $('next-milestone').textContent=next?`${timeText(next[0])} · ${next[1]}`:'Hẹn bạn vào ca ngày mai';
    const announce=`${phase}-${current.character}-${demo?'demo':'real'}`;
    if(announce!==lastAnnouncement){lastAnnouncement=announce;$('announcer').textContent=`${demo?'Demo. ':''}${$('timer-title').textContent} ${phase==='launch'?departureCopy[current.character][0]:captions[phase][0]}`;}
  }
  function startDemo(){
    if(demo)return;
    reaction=null;workScene=null;
    const demoConfig={...(editing?draft:config)};
    // Keep a complete demo day even when real check-in is after lunch/checkout.
    if(demoConfig.checkin<'08:00'||demoConfig.checkin>'09:00')demoConfig.checkin='08:45';
    demo={started:performance.now(),config:demoConfig,launched:false};
    sceneKey='';setPanels();tick();$('exit-demo').focus();
  }
  function stopDemo(){demo=null;launch=null;reaction=null;workScene=null;previousReal=null;sceneKey='';setPanels();tick();(editing?$('start-demo'):$('active-demo')).focus();}
  function closeWorkScene(){const kind=workScene?.kind;workScene=null;sceneKey='';tick();if(kind)document.querySelector(`[data-work-scene="${kind}"]`).focus();}
  document.querySelectorAll('[data-work-scene]').forEach(button=>button.addEventListener('click',()=>{
    const now=new Date();
    if(editing||demo||!isWorking(phaseAt(now,schedule(now,config.checkin))))return;
    workScene={kind:button.dataset.workScene,character:config.character,day:dayKey(now),started:performance.now()};
    sceneKey='';tick();
  }));
  $('close-work-scene').addEventListener('click',closeWorkScene);
  function closeReaction(){reaction=null;sceneKey='';tick();$('send-message').focus();}
  $('send-message').addEventListener('click',()=>{
    const now=new Date();
    if(demo||editing||phaseAt(now,schedule(now,config.checkin))!=='done')return;
    reaction={character:config.character,day:dayKey(now),started:performance.now()};
    sceneKey='';tick();
  });
  $('close-reaction').addEventListener('click',closeReaction);
  $('setup-form').addEventListener('submit',e=>{
    e.preventDefault();if(!validTime($('checkin').value))return;
    config={...config,checkin:draft.checkin,character:draft.character,started:true};
    editing=false;previousReal=null;launch=null;persist();sceneKey='';setPanels();tick();$('edit-settings').focus();
  });
  $('checkin').addEventListener('input',updatePreviewTime);
  document.querySelectorAll('input[name="character"]').forEach(input=>input.addEventListener('change',()=>{draft.character=input.value;sceneKey='';tick();}));
  $('edit-settings').addEventListener('click',()=>{if(demo){stopDemo();}editing=true;draft={...config};applyForm();sceneKey='';setPanels();tick();$('checkin').focus();});
  $('start-demo').addEventListener('click',startDemo);$('active-demo').addEventListener('click',startDemo);$('exit-demo').addEventListener('click',stopDemo);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(demo)stopDemo();else if(reaction)closeReaction();else if(workScene)closeWorkScene();}});
  async function fetchWeather(){
    const request=++weatherRequest,city=config.city;
    const [latitude,longitude]=CITIES[city];
    weather={type:'sunny',temp:null,ready:false};$('weather').textContent='☀ Nắng nhẹ';$('weather').title='Nền mặc định trong lúc chờ thời tiết';$('weather-note').textContent=' · nền mặc định';tick();
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`,{signal:controller.signal});
      if(!response.ok)throw new Error('Weather unavailable');
      const data=await response.json();const code=data.current?.weather_code,temp=data.current?.temperature_2m;
      if(!Number.isFinite(code)||!Number.isFinite(temp))throw new Error('Invalid weather');
      if(request!==weatherRequest)return;
      const type=code<=1?'sunny':code<=3||code===45||code===48?'cloudy':'rain';
      weather={type,temp,ready:true};
      $('weather').textContent=`${type==='sunny'?'☀':type==='cloudy'?'☁':'☂'} ${Math.round(temp)}°C · ${type==='sunny'?'Trời quang':type==='cloudy'?'Nhiều mây':'Có mưa'}`;
      $('weather').title='Thời tiết hiện tại từ Open-Meteo';$('weather-note').textContent='';
    }catch{
      if(request!==weatherRequest)return;
      $('weather').title='Không tải được thời tiết; đang dùng nền mặc định';$('weather-note').textContent=' · nền mặc định';
    }finally{clearTimeout(timeout);if(request===weatherRequest)tick();}
  }
  $('city').addEventListener('change',()=>{config.city=$('city').value;draft.city=config.city;persist();fetchWeather();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  window.addEventListener('pageshow',()=>tick());window.addEventListener('focus',()=>tick());
  window.addEventListener('online',fetchWeather);
  // Expose deterministic, side-effect-free functions for schedule verification.
  window.PaidToWait=Object.freeze({validTime,schedule,phaseAt,countdown,progressAt,shouldLaunch,demoDate,dayKey});
  applyForm();setPanels();tick();fetchWeather();
  setInterval(tick,100);setInterval(fetchWeather,30*60*1000);
})();
