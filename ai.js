/* =====================================================================
   AI WING - the oracle, the terminal, the taunts, the memorial.
   Loads after the game script; shares its global scope.
   Cloud brain: Supabase Edge Function -> Gemini (key lives server-side).
   Local brain: optional WebLLM, runs on the visitor's own GPU.
   Every feature degrades gracefully to canned content when offline.
   ===================================================================== */
"use strict";
(function () {

  const AI = {
    url: 'https://dcwrzxjjeqbtfnpzrrbj.supabase.co/functions/v1/oracle',
    anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjd3J6eGpqZXFidGZucHpycmJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDI3NzMsImV4cCI6MjA5Njc3ODc3M30.GEpRj9AzMSStm7xFRLZbcdaY451cV90uipfhIc_wmIA',
    online: null,      // null=unknown, true/false after first call
    local: null,       // WebLLM engine when engaged
    localLoading: false
  };

  /* ----------------------------------------------------------------
     CLIENT-SIDE PERSONAS (used only by the local brain; the cloud
     keeps its own canonical copies server-side)
  ---------------------------------------------------------------- */
  const CV_MINI = 'Ditshwanelo Tumane (Tshwanelo), Cape Town SA. Software Engineer - Cloud, AI + Full-Stack. Full Stack Developer at Lesaka Technologies (fintech) since 2026. Before: Netcampus (Azure AI, agentic AI; AI+Cloud Tech Lead for Mandela Legacy Foundation), Cape Code Collective, JMM Mining. Certs: Azure AI Fundamentals, AWS Cloud Practitioner, 25+ Azure badges. Skills: Python, TypeScript, React, PostgreSQL, Azure, AWS, agentic AI, APIs. Side projects: Alexandria, iButler, Job Hunter, CashConnect, Clearbound. Chess + basketball. Email tshwanelotumane2@gmail.com.';
  const LOCAL_P = {
    saucer: 'You are a nervous, chatty flying saucer in an Asteroids-style portfolio game. Answer questions about the pilot using ONLY these facts, under 60 words, arcade tone, never invent: ' + CV_MINI,
    terminal: 'You are SHIPCOM, a deadpan ship computer. Answer about Ditshwanelo from ONLY these facts, under 90 words, never invent: ' + CV_MINI
  };

  /* ----------------------------------------------------------------
     FALLBACKS - the show goes on without any brain at all
  ---------------------------------------------------------------- */
  const FB = {
    saucer: [
      'TRANSMISSION WEAK. SHORT VERSION: THE PILOT BUILDS CLOUD + AI SYSTEMS AT A FINTECH. EMAIL HIM. PLEASE STOP SHOOTING US.',
      'MY UPLINK IS DOWN BUT I MEMORIZED THIS: AZURE CERTIFIED, AWS CERTIFIED, BUILDS AI AGENTS. THE EMAIL IS IN THE COMMS ARRAY.'
    ],
    terminal: [
      'SHIPCOM OFFLINE MODE. KNOWN FACTS: SOFTWARE ENGINEER. CLOUD, AI, FULL-STACK. LESAKA TECHNOLOGIES. CAPE TOWN. FOR DETAILS, TRANSMIT EMAIL VIA COMMS ARRAY.'
    ],
    taunts: [
      'KEVIN WATCHES. KEVIN JUDGES YOUR THRUSTING.',
      'YOUR AIM INSULTS THIS FAMILY.',
      'WE CARVED YOUR SCORE ON HIS HEADSTONE. IT WAS SMALL.',
      'RUNNING? KEVIN ALSO TRIED RUNNING.',
      'THE SWARM REMEMBERS. THE SWARM HOLDS GRUDGES.',
      'NICE SHIP. KEVIN HAD A SHIP. HAD.'
    ],
    review: (d) => 'PERFORMANCE REVIEW: The pilot logged ' + d.minutes + ' minute(s) and ' + d.score + ' points, demonstrating initiative and a commendable willingness to collide with rocks. Growth areas include dodging and saucer relations (' + d.deaths + ' incidents). Rating: Meets Expectations (Posthumously).',
    obitNames: ['GLORP', 'ZIMVO', 'BLEEP', 'QUARG', 'MOOP', 'XANTH', 'PLIM', 'VORNak'.toUpperCase(), 'SNERV', 'DOOT'],
    obits: [
      'loved jazz. hated bullets. the bullets won.',
      'three kids and a timeshare on phobos.',
      'was two days from retirement.',
      'died doing what he loved: carrying facts.',
      'never even saw the leaderboard.',
      'his last fact remains classified.'
    ],
    briefing: 'MISSION CONTROL OFFLINE. Manual briefing: cloud+AI engineer at a JSE/NASDAQ fintech, Azure AI + AWS certified, ships agentic AI systems and full-stack apps. Map your own requirements - or better, email the pilot directly via the comms array.'
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ----------------------------------------------------------------
     TRANSPORT
  ---------------------------------------------------------------- */
  async function askCloud(mode, payload) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 25000);
    try {
      const r = await fetch(AI.url, {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AI.anon,
          'apikey': AI.anon
        },
        body: JSON.stringify(Object.assign({ mode: mode }, payload || {}))
      });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const text = (j.text || '').trim();
      if (!text) throw new Error(j.error || 'empty');
      AI.online = true;
      return text;
    } catch (e) {
      clearTimeout(t);
      AI.online = false;
      return null;
    }
  }
  async function askLocal(mode, messages) {
    try {
      const sys = LOCAL_P[mode] || LOCAL_P.terminal;
      const msgs = [{ role: 'system', content: sys }].concat(
        (messages || []).slice(-8).map(m => ({ role: m.role, content: String(m.content).slice(0, 1500) }))
      );
      const out = await AI.local.chat.completions.create({ messages: msgs, max_tokens: 220, temperature: 0.8 });
      return (out.choices[0].message.content || '').trim() || null;
    } catch (e) { return null; }
  }
  // chat modes prefer the local brain when engaged; utility modes go cloud
  async function ask(mode, payload, fallback) {
    let r = null;
    if (AI.local && (mode === 'saucer' || mode === 'terminal')) {
      r = await askLocal(mode, (payload || {}).messages);
    }
    if (!r) r = await askCloud(mode, payload);
    return r || (typeof fallback === 'function' ? fallback() : fallback);
  }

  /* ----------------------------------------------------------------
     UI INJECTION - panels reuse the game's existing .panel machinery
  ---------------------------------------------------------------- */
  const css = document.createElement('style');
  css.textContent = [
    '#oracle-log{border:1px solid #444;min-height:160px;max-height:38vh;overflow-y:auto;padding:10px 12px;margin:12px 0;font-size:19px;}',
    '.omsg{margin:6px 0;white-space:pre-wrap;}',
    '.omsg.you{color:#9f9;text-shadow:0 0 6px rgba(150,255,150,.5);}',
    '.omsg.you::before{content:"> YOU: ";color:#6c6;}',
    '.omsg.them::before{content:"> ";color:#888;}',
    '.omsg.sys{color:#777;font-size:16px;}',
    '#oracle-inrow{display:flex;gap:8px;}',
    '#oracle-in{flex:1;background:#000;border:1px solid #666;color:#fff;font-family:inherit;font-size:20px;padding:6px 10px;letter-spacing:1px;}',
    '#oracle-in:focus{outline:none;border-color:#fff;box-shadow:0 0 10px rgba(255,255,255,.3);}',
    '#jd-in{width:100%;height:90px;background:#000;border:1px solid #555;color:#fff;font-family:inherit;font-size:17px;padding:8px;margin:8px 0;resize:vertical;}',
    '#jd-out{white-space:pre-wrap;border:1px dashed #555;padding:10px;margin-top:10px;font-size:18px;display:none;}',
    '#memorial div{margin:3px 0;}'
  ].join('\n');
  document.head.appendChild(css);

  document.body.insertAdjacentHTML('beforeend',
    '<div class="panel" id="panel-oracle">' +
    '<button class="x" id="oracle-x">X [ESC]</button>' +
    '<h2 id="oracle-title">SHIPCOM <small id="oracle-sub">// ONBOARD AI</small></h2>' +
    '<div class="dim" id="oracle-status"></div>' +
    '<div id="oracle-log"></div>' +
    '<div id="oracle-inrow"><input id="oracle-in" maxlength="280" placeholder="TYPE, PILOT..."><button class="pbtn" id="oracle-send">SEND</button></div>' +
    '<div class="foot">LOCAL BRAIN (RUNS ON YOUR GPU, NO CLOUD): <a href="#" id="oracle-local">ENGAGE</a> <span id="oracle-lstat"></span></div>' +
    '</div>'
  );

  const $ = (id) => document.getElementById(id);
  const log = $('oracle-log'), input = $('oracle-in');
  let oracleMode = 'terminal';
  const hist = { saucer: [], terminal: [] };
  let reviewText = null, reviewReady = false;

  function addMsg(cls, text) {
    const d = document.createElement('div');
    d.className = 'omsg ' + cls;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function setStatus() {
    $('oracle-status').textContent =
      AI.local ? 'BRAIN: LOCAL (YOUR GPU). PRIVATE AND SLIGHTLY DIMMER.' :
      AI.online === false ? 'BRAIN: OFFLINE. RUNNING ON CANNED WISDOM.' :
      'BRAIN: CLOUD ORACLE.';
  }

  const GREET = {
    saucer: 'DO NOT SHOOT. I AM THE TALKING ONE. ASK ME ABOUT THE PILOT - HIS WORK, HIS STACK, HIS WHEREABOUTS. I KNOW THINGS.',
    terminal: 'SHIPCOM ONLINE. I HOLD THE PILOT\'S SERVICE RECORD. ASK ABOUT EXPERIENCE, SKILLS, CERTIFICATIONS, OR AVAILABILITY.',
    review: 'DEBRIEF MODE. YOUR PERFORMANCE REVIEW FOLLOWS.'
  };

  function openOracle(mode) {
    oracleMode = mode;
    log.innerHTML = '';
    const inrow = $('oracle-inrow');
    if (mode === 'review') {
      $('oracle-title').innerHTML = 'FLIGHT DEBRIEF <small>// HR DIVISION</small>';
      inrow.style.display = 'none';
      addMsg('sys', GREET.review);
      addMsg('them', reviewText || FB.review({ minutes: 0, score: 0, deaths: 4 }));
    } else if (mode === 'saucer') {
      $('oracle-title').innerHTML = 'INCOMING TRANSMISSION <small>// UNARMED SAUCER</small>';
      inrow.style.display = 'flex';
      if (!hist.saucer.length) addMsg('them', GREET.saucer);
      for (const m of hist[mode]) addMsg(m.role === 'user' ? 'you' : 'them', m.content);
    } else {
      $('oracle-title').innerHTML = 'SHIPCOM <small>// ONBOARD AI</small>';
      inrow.style.display = 'flex';
      if (!hist.terminal.length) addMsg('them', GREET.terminal);
      for (const m of hist[mode]) addMsg(m.role === 'user' ? 'you' : 'them', m.content);
    }
    setStatus();
    openPanel('oracle');
    if (mode !== 'review') setTimeout(() => input.focus(), 60);
  }

  let busy = false;
  async function send() {
    const q = input.value.trim();
    if (!q || busy || oracleMode === 'review') return;
    input.value = '';
    busy = true;
    const mode = oracleMode;
    hist[mode].push({ role: 'user', content: q });
    if (hist[mode].length > 12) hist[mode].splice(0, hist[mode].length - 12);
    addMsg('you', q);
    const ghost = addMsg('sys', mode === 'saucer' ? 'SAUCER IS WOBBLING THOUGHTFULLY...' : 'SHIPCOM PROCESSING...');
    const a = await ask(mode, { messages: hist[mode] }, () => pick(FB[mode]));
    ghost.remove();
    hist[mode].push({ role: 'assistant', content: a });
    addMsg('them', a);
    setStatus();
    busy = false;
  }
  $('oracle-send').addEventListener('click', send);
  $('oracle-x').addEventListener('click', () => closePanels());
  // keep game keys out of the chat box
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') send();
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());

  /* ----------------------------------------------------------------
     LOCAL BRAIN (#13) - WebLLM, opt-in, visitor's own GPU
  ---------------------------------------------------------------- */
  $('oracle-local').addEventListener('click', async (e) => {
    e.preventDefault();
    if (AI.local || AI.localLoading) return;
    const stat = $('oracle-lstat');
    if (!navigator.gpu) { stat.textContent = '- NO WEBGPU IN THIS BROWSER. CLOUD IT IS.'; return; }
    AI.localLoading = true;
    stat.textContent = '- SUMMONING (DOWNLOADS ~700MB, ONCE)...';
    try {
      const webllm = await import('https://esm.run/@mlc-ai/web-llm');
      AI.local = await webllm.CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
        initProgressCallback: (p) => { stat.textContent = '- ' + Math.round((p.progress || 0) * 100) + '% ' + (p.text || '').slice(0, 40); }
      });
      stat.textContent = '- LOCAL BRAIN ONLINE.';
    } catch (err) {
      stat.textContent = '- SUMMONING FAILED: ' + String(err).slice(0, 60);
    }
    AI.localLoading = false;
    setStatus();
  });

  /* ----------------------------------------------------------------
     MEMORIAL WALL (#6) - injected into the ??? panel
  ---------------------------------------------------------------- */
  const extras = $('panel-extras');
  if (extras) {
    extras.insertAdjacentHTML('beforeend',
      '<div class="row" style="margin-top:14px;"><span class="tag">MEMORIAL WALL:</span></div>' +
      '<div id="memorial" class="row dim">No saucer casualties yet. The day is young.</div>'
    );
  }
  const fallen = [];
  let obitBusy = false;
  async function addMemorial() {
    let line;
    if (!obitBusy) {
      obitBusy = true;
      line = await ask('obituary', { data: { kills: fallen.length + 1 } },
        () => pick(FB.obitNames) + ' - ' + pick(FB.obits));
      obitBusy = false;
    } else {
      line = pick(FB.obitNames) + ' - ' + pick(FB.obits);
    }
    fallen.unshift(line);
    if (fallen.length > 10) fallen.pop();
    const m = $('memorial');
    if (m) m.innerHTML = fallen.map(l => '<div>- ' + l.replace(/</g, '&lt;') + '</div>').join('');
  }

  /* ----------------------------------------------------------------
     BRIEFING GENERATOR (#5) - injected into the contact panel
  ---------------------------------------------------------------- */
  const contact = $('panel-contact');
  if (contact) {
    contact.insertAdjacentHTML('beforeend',
      '<div class="row" style="margin-top:18px;"><span class="tag">MISSION BRIEFING GENERATOR [AI]:</span></div>' +
      '<div class="dim">Recruiters: paste a job description. Mission Control maps the pilot onto it.</div>' +
      '<textarea id="jd-in" placeholder="PASTE JOB DESCRIPTION HERE..."></textarea>' +
      '<button class="pbtn" id="jd-go">GENERATE BRIEFING</button>' +
      '<pre id="jd-out"></pre>'
    );
    const jdIn = $('jd-in'), jdOut = $('jd-out');
    jdIn.addEventListener('keydown', (e) => e.stopPropagation());
    jdIn.addEventListener('keyup', (e) => e.stopPropagation());
    $('jd-go').addEventListener('click', async () => {
      const jd = jdIn.value.trim();
      if (!jd) { jdOut.style.display = 'block'; jdOut.textContent = 'PASTE A JOB DESCRIPTION FIRST, COMMANDER.'; return; }
      jdOut.style.display = 'block';
      jdOut.textContent = 'MISSION CONTROL IS THINKING...';
      const a = await ask('briefing', { messages: [{ role: 'user', content: jd.slice(0, 6000) }] }, FB.briefing);
      jdOut.textContent = a;
    });
  }

  /* ----------------------------------------------------------------
     NAV + HINTS
  ---------------------------------------------------------------- */
  const navlist = document.querySelector('#panel-nav .navlist');
  if (navlist) {
    const b = document.createElement('button');
    b.innerHTML = 'SHIP TERMINAL <span class="state">AI</span>';
    b.addEventListener('click', () => openOracle('terminal'));
    navlist.appendChild(b);
  }
  if (typeof hints !== 'undefined' && hints) {
    hints.innerHTML += ' &nbsp;T:TERMINAL &nbsp;C:HAIL SAUCER';
  }

  /* ----------------------------------------------------------------
     HOOKS + KEYS + POLLER (#1 hail, #3 taunts, #4 debrief)
  ---------------------------------------------------------------- */
  window.AIHooks = {
    saucerKilled: function (x, y) { addMemorial(); }
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyT' && (state === 'PLAY' || state === 'TITLE' || state === 'OVER')) openOracle('terminal');
    if (e.code === 'KeyC' && state === 'PLAY' && saucer && !saucer.gold) openOracle('saucer');
    if (e.code === 'KeyR' && reviewReady && (state === 'OVER' || state === 'PLAY' || state === 'TITLE')) openOracle('review');
  });

  let lastState = 'TITLE', tauntAt = 0, hailedThisSaucer = false, greeted = false;
  setInterval(async () => {
    // first-flight greeting
    if (!greeted && state === 'PLAY') {
      greeted = true;
      setTimeout(() => { if (state === 'PLAY') showToast('SHIPCOM ONLINE - PRESS T TO TALK TO THE SHIP', 3000); }, 4000);
    }
    // hail hint, once per saucer
    if (state === 'PLAY' && saucer && !saucer.gold && !hailedThisSaucer) {
      hailedThisSaucer = true;
      showToast('SAUCER ON SCANNER - PRESS C TO HAIL IT, SPACE TO BE RUDE', 2800);
    }
    if (!saucer) hailedThisSaucer = false;
    // vendetta trash talk
    if (state === 'PLAY' && typeof inSwarm === 'function' && inSwarm()) {
      const now = Date.now();
      if (now > tauntAt) {
        tauntAt = now + 13000 + Math.random() * 5000;
        const data = { secondsLeft: Math.ceil(vendetta.timer / 60), lives: Math.max(0, lives), score: score };
        const line = await ask('taunt', { data: data }, () => pick(FB.taunts));
        if (state === 'PLAY' && inSwarm()) showToast('BROTHER: ' + line.slice(0, 90), 3000);
      }
    }
    // game over -> performance review
    if (state === 'OVER' && lastState !== 'OVER') {
      reviewReady = false;
      const data = {
        score: score,
        minutes: Math.max(1, Math.round(playFrames / 3600)),
        sectorsUnlocked: unlocked.size + '/5',
        deaths: 4
      };
      reviewText = await ask('review', { data: data }, () => FB.review({ minutes: data.minutes, score: data.score, deaths: 4 }));
      reviewReady = true;
      if (state === 'OVER') showToast('HR HAS PREPARED YOUR PERFORMANCE REVIEW - PRESS R', 4000);
    }
    if (state === 'PLAY' && lastState === 'OVER') { reviewReady = false; reviewText = null; }
    lastState = state;
  }, 400);

})();
