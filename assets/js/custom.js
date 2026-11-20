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

  /* ---------- Validacija ---------- */
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