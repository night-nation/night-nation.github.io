(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('submit-btn');
  const clearBtn = document.getElementById('clear-btn');
  const resultBox = document.getElementById('form-result');

  const FIELDS = ['vardas', 'pavarde', 'email', 'telefonas', 'adresas', 'q1', 'q2', 'q3'];
  const touched = new Set();

  const NAME_RE = /^\p{L}+(?:[ -]\p{L}+)*$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^\+370 6\d{2} \d{5}$/;

  const validators = {
    vardas: (v) => !v ? 'Įveskite vardą.' : NAME_RE.test(v) ? '' : 'Vardą gali sudaryti tik raidės.',
    pavarde: (v) => !v ? 'Įveskite pavardę.' : NAME_RE.test(v) ? '' : 'Pavardę gali sudaryti tik raidės.',
    email: (v) => !v ? 'Įveskite el. pašto adresą.' : EMAIL_RE.test(v) ? '' : 'Neteisingas el. pašto formatas (pvz., vardas@pastas.lt).',
    telefonas: (v) => !v ? 'Įveskite telefono numerį.' : PHONE_RE.test(v) ? '' : 'Numeris turi atitikti formatą +370 6xx xxxxx.',
    adresas: (v) => v ? '' : 'Įveskite adresą.',
    q1: (v) => ratingError(v),
    q2: (v) => ratingError(v),
    q3: (v) => ratingError(v),
  };

  function ratingError(v) {
    if (!v) return 'Pasirinkite įvertinimą.';
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? '' : 'Įvertinimas turi būti nuo 1 iki 10.';
  }

  const getValue = (name) => {
    const el = form.elements[name];
    return (el && el.value !== undefined ? String(el.value) : '').trim();
  };

  const errorFor = (name) => validators[name](getValue(name));

  function showError(name, message) {
    const out = form.querySelector(`[data-error-for="${name}"]`);
    if (out) out.textContent = message;
    const holder = /^q\d$/.test(name)
      ? out && out.closest('fieldset')
      : form.elements[name];
    if (holder) {
      holder.classList.toggle('is-invalid', Boolean(message));
      if (holder.tagName === 'INPUT') holder.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
  }

  function updateSubmitState() {
    submitBtn.disabled = FIELDS.some((name) => errorFor(name) !== '');
  }

  function formatPhone(raw, deleting) {
    let digits = raw.replace(/\D/g, '');
    if (digits.length < 3 && '370'.startsWith(digits)) {
      if (deleting && !digits) return '';
      return (digits || raw.includes('+')) ? '+' + digits : '';
    }
    if (deleting && digits === '370') return '';
    if (digits.startsWith('370')) digits = digits.slice(3);
    else if (digits.startsWith('8')) digits = digits.slice(1);
    digits = digits.slice(0, 8);
    if (!digits) return '+370 ';
    return '+370 ' + digits.slice(0, 3) + (digits.length > 3 ? ' ' + digits.slice(3) : '');
  }

  form.addEventListener('input', (e) => {
    const name = e.target.name;
    if (!FIELDS.includes(name)) return;
    if (name === 'telefonas') {
      const deleting = (e.inputType || '').startsWith('delete');
      e.target.value = formatPhone(e.target.value, deleting);
    }
    touched.add(name);
    showError(name, errorFor(name));
    updateSubmitState();
  });

  form.addEventListener('change', (e) => {
    const name = e.target.name;
    if (!FIELDS.includes(name)) return;
    touched.add(name);
    showError(name, errorFor(name));
    updateSubmitState();
  });

  form.addEventListener('focusout', (e) => {
    const name = e.target.name;
    if (!FIELDS.includes(name) || /^q\d$/.test(name)) return;
    touched.add(name);
    showError(name, errorFor(name));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstError = FIELDS.find((name) => errorFor(name) !== '');
    if (firstError) {
      FIELDS.forEach((name) => showError(name, errorFor(name)));
      updateSubmitState();
      return;
    }

    const data = {
      vardas: getValue('vardas'),
      pavarde: getValue('pavarde'),
      email: getValue('email'),
      telefonas: getValue('telefonas'),
      adresas: getValue('adresas'),
      vertinimai: {
        dizainas: Number(getValue('q1')),
        turinys: Number(getValue('q2')),
        navigacija: Number(getValue('q3')),
      },
    };

    console.log(data);

    const ratings = Object.values(data.vertinimai);
    const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;

    const lines = [
      `Vardas: ${data.vardas}`,
      `Pavardė: ${data.pavarde}`,
      `El. paštas: ${data.email}`,
      `Tel. Numeris: ${data.telefonas}`,
      `Adresas: ${data.adresas}`,
      `Dizaino vertinimas: ${data.vertinimai.dizainas}`,
      `Turinio vertinimas: ${data.vertinimai.turinys}`,
      `Navigacijos vertinimas: ${data.vertinimai.navigacija}`,
    ];

    resultBox.replaceChildren();
    lines.forEach((text) => {
      const line = document.createElement('div');
      line.textContent = text;
      resultBox.appendChild(line);
    });
    const avg = document.createElement('div');
    avg.className = 'form-result-average';
    avg.textContent = `${data.vardas} ${data.pavarde}: vidurkis ${average.toFixed(1)}`;
    resultBox.appendChild(avg);
    resultBox.hidden = false;
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    touched.clear();
    FIELDS.forEach((name) => showError(name, ''));
    resultBox.replaceChildren();
    resultBox.hidden = true;
    updateSubmitState();
  });

  updateSubmitState();
})();

(() => {
  'use strict';

  const board = document.getElementById('kanban-board');
  if (!board) return;

  const STATUSES = ['Planuojama', 'Mokomasi', 'Atlikta'];
  const DONE = 'Atlikta';
  const STORAGE_KEY = 'cvSkillStatuses';

  const DEFAULT_SKILLS = [
    { id: 'pcb',      name: 'PCB projektavimas (KiCad)', icon: 'bi-motherboard',  xp: 40, status: 'Planuojama' },
    { id: 'rtos',     name: 'FreeRTOS',                  icon: 'bi-cpu',          xp: 50, status: 'Planuojama' },
    { id: 'matlab',   name: 'MATLAB',                    icon: 'bi-graph-up',     xp: 40, status: 'Mokomasi' },
    { id: 'sql',      name: 'SQL duomenų bazės',         icon: 'bi-database',     xp: 30, status: 'Mokomasi' },
    { id: 'cpp',      name: 'C / C++ (ESP32)',           icon: 'bi-code-slash',   xp: 80, status: 'Atlikta' },
    { id: 'linux',    name: 'Linux ir Proxmox',          icon: 'bi-hdd-network',  xp: 40, status: 'Atlikta' },
    { id: 'htmlcss',  name: 'HTML ir CSS',               icon: 'bi-filetype-html', xp: 30, status: 'Atlikta' },
    { id: 'git',      name: 'Git ir GitHub',             icon: 'bi-github',       xp: 30, status: 'Atlikta' },
  ];


  const LEVELS = [
    { level: 1, min: 0,   rank: 'Pradedantysis' },
    { level: 2, min: 50,  rank: 'Praktikantas' },
    { level: 3, min: 150, rank: 'Specialistas' },
    { level: 4, min: 300, rank: 'Profesionalas' },
  ];

  const $ = (id) => document.getElementById(id);


  function saveSkills(list) {
    try {
      const statuses = Object.fromEntries(list.map((s) => [s.id, s.status]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    } catch (err) {
    }
  }

  function loadSkills() {
    const list = DEFAULT_SKILLS.map((s) => ({ ...s })); 
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return list;               
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return list;
      list.forEach((skill) => {
        if (STATUSES.includes(saved[skill.id])) skill.status = saved[skill.id];
      });
    } catch (err) {

    }
    return list;
  }

  let skills = loadSkills();

  function calculateXp(list) {
    return list.filter((s) => s.status === DONE).reduce((sum, s) => sum + s.xp, 0);
  }

  function getLevelInfo(xp) {
    let index = 0;
    LEVELS.forEach((lvl, i) => { if (xp >= lvl.min) index = i; });
    const current = LEVELS[index];
    const next = LEVELS[index + 1];
    const percent = next ? Math.round(((xp - current.min) / (next.min - current.min)) * 100) : 100;
    return { level: current.level, rank: current.rank, percent, remaining: next ? next.min - xp : 0 };
  }

  function createSkillCard(skill) {
    const card = document.createElement('article');
    card.className = 'skill-card';
    card.dataset.skillId = skill.id;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'skill-icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('i');
    icon.className = `bi ${skill.icon}`;
    iconWrap.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'skill-info';

    const title = document.createElement('h4');
    title.textContent = skill.name;

    const meta = document.createElement('div');
    meta.className = 'skill-meta';
    const xpBadge = document.createElement('span');
    xpBadge.className = 'skill-xp';
    xpBadge.textContent = `XP: ${skill.xp}`;
    meta.appendChild(xpBadge);

    const select = document.createElement('select');
    select.className = 'skill-select';
    select.setAttribute('aria-label', `Keisti įgūdžio „${skill.name}“ būseną`);
    STATUSES.forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });
    select.value = skill.status;
    select.addEventListener('change', (e) => changeSkillStatus(skill.id, e.target.value));

    info.append(title, meta, select);
    card.append(iconWrap, info);
    return card;
  }

  function renderSkillCards() {
    board.querySelectorAll('.kanban-column').forEach((column) => {
      const list = column.querySelector('.kanban-list');
      const items = skills.filter((s) => s.status === column.dataset.status);
      list.replaceChildren();
      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'kanban-empty';
        empty.textContent = 'Šioje kategorijoje įgūdžių nėra';
        list.appendChild(empty);
        return;
      }
      items.forEach((skill) => list.appendChild(createSkillCard(skill)));
    });
  }

  /* ----- XP, lygio, rango ir progreso juostos atnaujinimas ----- */
  function updateXpPanel() {
    const xp = calculateXp(skills);
    const info = getLevelInfo(xp);

    $('xp-total').textContent = `${xp} XP`;
    $('xp-level').textContent = String(info.level);
    $('xp-rank').textContent = info.rank;
    $('xp-percent').textContent = `${info.percent}%`;
    $('xp-bar-fill').style.width = `${info.percent}%`;
    $('xp-bar').setAttribute('aria-valuenow', String(info.percent));
    $('xp-note').textContent = info.remaining > 0
      ? `Iki kito lygio liko ${info.remaining} XP`
      : 'Pasiektas aukščiausias lygis';
  }

  function updateStats() {
    const total = skills.length;
    const done = skills.filter((s) => s.status === DONE).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    $('stat-total').textContent = String(total);
    $('stat-done').textContent = String(done);
    $('stat-percent').textContent = `${percent}%`;
  }

  
  function renderAll() {
    renderSkillCards();
    updateXpPanel();
    updateStats();
  }

  function changeSkillStatus(id, newStatus) {
    const skill = skills.find((s) => s.id === id);
    if (!skill || !STATUSES.includes(newStatus) || skill.status === newStatus) return;
    skill.status = newStatus;
    saveSkills(skills);
    renderAll();
    const moved = board.querySelector(`[data-skill-id="${id}"] .skill-select`);
    if (moved) moved.focus();
  }

  renderAll();
})();