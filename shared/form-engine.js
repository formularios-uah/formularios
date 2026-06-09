// ─── Validación RUT chileno ───────────────────────────────────────────────────
function validarRUT(rut) {
  const cleaned = rut.replace(/[.\-\s]/g, '');
  if (cleaned.length < 2) return false;
  const cuerpo = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();
  let suma = 0, multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvChar = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);
  return dv === dvChar;
}

function formatearRUT(rut) {
  const cleaned = rut.replace(/[^0-9kK]/g, '');
  if (cleaned.length < 2) return cleaned;
  const cuerpo = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFmt}-${dv}`;
}

// ─── Render campo ─────────────────────────────────────────────────────────────
function renderCampo(campo) {
  const required = campo.requerido ? 'required' : '';
  const reqMark = campo.requerido ? '' : ' <span style="opacity:0.4;font-size:0.65rem">(opcional)</span>';

  if (campo.tipo === 'select') {
    const opts = campo.opciones.map(o => `<option value="${o}">${o}</option>`).join('');
    return `
      <div class="field-group" id="group-${campo.id}">
        <label for="${campo.id}">${campo.label}${reqMark}</label>
        <div class="select-wrapper">
          <select id="${campo.id}" name="${campo.id}" ${required}>
            <option value="" disabled selected>Selecciona una opción</option>
            ${opts}
          </select>
        </div>
        <span class="field-error" id="err-${campo.id}"></span>
      </div>`;
  }

  return `
    <div class="field-group" id="group-${campo.id}">
      <label for="${campo.id}">${campo.label}${reqMark}</label>
      <input
        type="${campo.tipo === 'rut' ? 'text' : campo.tipo}"
        id="${campo.id}"
        name="${campo.id}"
        placeholder="${campo.placeholder || ''}"
        ${required}
        ${campo.tipo === 'rut' ? 'maxlength="12" autocomplete="off"' : ''}
        ${campo.tipo === 'tel' ? 'inputmode="tel"' : ''}
      >
      <span class="field-error" id="err-${campo.id}"></span>
    </div>`;
}

// ─── Validación ───────────────────────────────────────────────────────────────
function validarCampo(campo, value) {
  if (campo.requerido && !value.trim()) return 'Este campo es obligatorio.';
  if (!value.trim()) return null;
  if (campo.tipo === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ingresa un correo válido.';
  }
  if (campo.tipo === 'rut') {
    if (!validarRUT(value)) return 'RUT inválido. Verifica el dígito verificador.';
  }
  if (campo.tipo === 'tel') {
    if (!/^[\d\s\+\-\(\)]{7,15}$/.test(value)) return 'Teléfono inválido.';
  }
  return null;
}

// ─── Honeypot ─────────────────────────────────────────────────────────────────
function renderHoneypot() {
  return `<div style="position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;" aria-hidden="true">
    <input type="text" name="website" id="hp-website" tabindex="-1" autocomplete="off">
  </div>`;
}

// ─── Meta item del evento ─────────────────────────────────────────────────────
function renderMetaItem(item) {
  // Caso 1: Fecha
  if (item.tipo === 'fecha') {
    const [dia, mes] = item.valor.split(' ');
    return `
      <div class="event-meta-item">
        <div class="event-meta-dot date">
          <span class="day">${dia}</span>
          <span class="month">${mes}</span>
        </div>
        <div class="event-meta-text">${item.texto}</div>
      </div>`;
  }

  // Caso 2: Ubicación (detecta si hay link, si no, lo muestra como texto)
  if (item.tipo === 'ubicacion') {
    return `
      <div class="event-meta-wrapper">
        <div class="event-meta-item">
          <div class="event-meta-dot">
            <svg width="24" height="24" fill="none" stroke="black" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="event-meta-text">${item.texto}</div>
        </div>
        ${item.mapa ? `
          <div class="map-container">
            <iframe src="${item.mapa}" frameborder="0" allowfullscreen="" loading="lazy"></iframe>
          </div>` : ''}
      </div>`;
  }

  // Caso por defecto
  return `
    <div class="event-meta-item">
      <div class="event-meta-text">${item.texto}</div>
    </div>`;
}

// ─── Envío HubSpot ────────────────────────────────────────────────────────────
async function enviarHubSpot(config, datos) {
  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${config.hubspot.portalId}/${config.hubspot.formGuid}`;
  
  const datosParaHubSpot = { ...datos };
  delete datosParaHubSpot['taller_interes']; 

  const fields = Object.entries(datosParaHubSpot).map(([name, value]) => ({ name, value }));
  const payload = {
    fields,
    context: { pageUri: window.location.href, pageName: config.titulo }
  };
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HubSpot error ${res.status}`);
  }
  return true;
}

// ─── Envío Sheets ─────────────────────────────────────────────────────────────
async function enviarSheets(config, datos) {
  await fetch(config.sheets.webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...datos, formulario: config.titulo, timestamp: new Date().toISOString() })
  });
  return true;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initForm(config) {
  const app = document.getElementById('form-app');
  const logoPath = config.logoPath || '../shared/assets/img/uah-logo.png';
  const logoCNA = config.logoCNA || '../shared/assets/img/sello-acreditacion-cna.png';

  const metaHTML = (config.meta || []).map(renderMetaItem).join('');
  const descHTML = (config.descripcion || []).map(p => `<p>${p}</p>`).join('');

  app.innerHTML = `
    <header class="site-header">
      <a href="/" class="logo">
        <img src="${logoPath}" alt="Universidad Alberto Hurtado">
      </a>
      <span class="header-tag">${config.headerTag || 'Admisión'}</span>
    </header>

    <div class="page-layout">

      <!-- Imagen del título: área propia en el grid -->
      <div class="titulo-imagen-block">
        <img src="${config.tituloImagen}" alt="${config.titulo || ''}" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>

      <!-- Columna izquierda: info evento -->
      <div class="event-col">
        ${config.descripcionTitulo || descHTML ? `
        <div class="event-description">
          ${config.descripcionTitulo ? `<h2>${config.descripcionTitulo}</h2>` : ''}
          ${descHTML}
        </div>` : ''}
        ${metaHTML ? `<div class="event-meta">${metaHTML}</div>` : ''}
      </div>

      <!-- Columna derecha: formulario -->
      <div class="form-col">
        <div class="form-col-header">
          <h2>Formulario de Inscripción</h2>
          <p>${config.subtitulo}</p>
        </div>

        <div id="form-body">
          <form id="main-form" novalidate>
            ${renderHoneypot()}
            ${config.campos.map(renderCampo).join('')}
            ${config.notaLegal ? `<p class="form-legal">* ${config.notaLegal}</p>` : ''}
            <button type="submit" class="btn-submit" id="btn-submit">
              <div class="spinner"></div>
              <span class="btn-text">${config.botonTexto || 'Inscribirme'}</span>
            </button>
          </form>
        </div>

        <div class="success-screen" id="success-screen">
          <div class="success-icon">
            <svg width="26" height="26" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2>¡Inscripción enviada!</h2>
          <p>Hemos recibido tu información.<br>Te contactaremos pronto al correo indicado.</p>
        </div>
      </div>

    </div>

    <footer class="site-footer">
      <div class="footer-accreditation">
        <img src="${logoCNA}" alt="Acreditación CNA">
      </div>
      <span class="footer-copy">© ${new Date().getFullYear()} Universidad Alberto Hurtado</span>
    </footer>
  `;

  // ── RUT: formateo en tiempo real ──────────────────────────────────────────
  const rutField = document.getElementById('rut');
  if (rutField) {
    rutField.addEventListener('input', e => {
      const pos = e.target.selectionStart;
      e.target.value = formatearRUT(e.target.value);
      try { e.target.setSelectionRange(pos, pos); } catch(_) {}
    });
  }

  // ── Validación blur ───────────────────────────────────────────────────────
  config.campos.forEach(campo => {
    const el = document.getElementById(campo.id);
    if (!el) return;
    el.addEventListener('blur', () => {
      const err = validarCampo(campo, el.value);
      const group = document.getElementById(`group-${campo.id}`);
      const errEl = document.getElementById(`err-${campo.id}`);
      if (err) { group.classList.add('error'); errEl.textContent = err; }
      else { group.classList.remove('error'); errEl.textContent = ''; }
    });
    el.addEventListener('input', () => {
      if (document.getElementById(`group-${campo.id}`).classList.contains('error')) {
        const err = validarCampo(campo, el.value);
        if (!err) {
          document.getElementById(`group-${campo.id}`).classList.remove('error');
          document.getElementById(`err-${campo.id}`).textContent = '';
        }
      }
    });
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  document.getElementById('main-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (document.getElementById('hp-website').value !== '') return;

    let hayErrores = false;
    const datos = {};

    config.campos.forEach(campo => {
      const el = document.getElementById(campo.id);
      if (!el) return;
      const err = validarCampo(campo, el.value);
      const group = document.getElementById(`group-${campo.id}`);
      const errEl = document.getElementById(`err-${campo.id}`);
      if (err) { group.classList.add('error'); errEl.textContent = err; hayErrores = true; }
      datos[campo.id] = el.value.trim();
    });

    if (config.interes) datos['interes'] = config.interes;
    if (hayErrores) return;

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.classList.add('loading');

    try {
      await Promise.all([
        enviarHubSpot(config, datos),
        enviarSheets(config, datos)
      ]);
      document.getElementById('form-body').style.display = 'none';
      document.getElementById('success-screen').classList.add('visible');
    } catch (err) {
      console.error('Error al enviar:', err);
      btn.disabled = false;
      btn.classList.remove('loading');
      alert('Hubo un problema al enviar. Por favor intenta nuevamente.');
    }
  });
}