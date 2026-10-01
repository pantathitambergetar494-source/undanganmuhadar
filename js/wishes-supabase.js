(() => {
  'use strict';

  const cfg = window.SUPABASE_CONFIG;
  const form = document.querySelector('#wishForm');
  const list = document.querySelector('#wishesList');
  const more = document.querySelector('#loadMoreWishes');
  const statusEl = document.querySelector('#wishStatus');

  if (!form || !list || !more) {
    console.error('[WISHES] Elemen form/list/load-more tidak ditemukan.');
    return;
  }

  const PAGE_SIZE = 5;
  let weddingId = null;
  let offset = 0;
  let busy = false;

  function setStatus(message, state = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function apiHeaders(prefer) {
    const key = cfg?.anonKey || '';
    const h = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }

  async function readError(response) {
    try {
      const data = await response.json();
      return data?.message || data?.error_description || data?.hint || JSON.stringify(data);
    } catch (_) {
      try { return await response.text(); } catch (_) {}
    }
    return `HTTP ${response.status}`;
  }

  async function resolveWeddingId() {
    if (weddingId) return weddingId;

    if (!cfg?.url || !cfg?.anonKey || !cfg?.weddingSlug) {
      throw new Error('Config Supabase belum lengkap.');
    }

    const url = new URL('/rest/v1/weddings', cfg.url);
    url.searchParams.set('select', 'id');
    url.searchParams.set('slug', `eq.${cfg.weddingSlug}`);
    url.searchParams.set('is_active', 'eq.true');
    url.searchParams.set('limit', '1');

    const response = await fetch(url, { headers: apiHeaders() });

    if (!response.ok) {
      throw new Error(`Wedding lookup gagal (${response.status}): ${await readError(response)}`);
    }

    const rows = await response.json();
    if (!rows?.[0]?.id) {
      throw new Error(`Wedding slug "${cfg.weddingSlug}" tidak ditemukan.`);
    }

    weddingId = rows[0].id;
    return weddingId;
  }

  function renderRow(row) {
    const date = new Date(row.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return `
      <article class="wish-card">
        <strong>${esc(row.guest_name)}</strong>
        <p>${esc(row.message)}</p>
        <small>${esc(date)}</small>
      </article>
    `;
  }

  async function loadPage(reset = false) {
    if (busy) return;
    busy = true;

    try {
      const id = await resolveWeddingId();
      if (reset) {
        offset = 0;
        list.innerHTML = '';
      }

      const url = new URL('/rest/v1/wishes', cfg.url);
      url.searchParams.set('select', 'id,guest_name,message,created_at');
      url.searchParams.set('wedding_id', `eq.${id}`);
      url.searchParams.set('approved', 'eq.true');
      url.searchParams.set('order', 'created_at.desc');
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(PAGE_SIZE + 1));

      const response = await fetch(url, { headers: apiHeaders() });

      if (!response.ok) {
        throw new Error(`Gagal memuat ucapan (${response.status}): ${await readError(response)}`);
      }

      const rows = await response.json();
      const visibleRows = rows.slice(0, PAGE_SIZE);

      if (reset && visibleRows.length === 0) {
        list.innerHTML = '<p class="section-copy">Belum ada ucapan yang ditampilkan.</p>';
      } else {
        if (reset) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', visibleRows.map(renderRow).join(''));
      }

      offset += visibleRows.length;
      more.hidden = rows.length <= PAGE_SIZE;
    } catch (error) {
      console.error('[WISHES LOAD ERROR]', error);
      if (offset === 0) {
        list.innerHTML = '<p class="section-copy">Ucapan belum dapat dimuat.</p>';
      }
      more.hidden = true;
    } finally {
      busy = false;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (form.elements.namedItem('website')?.value) return;
    if (!form.reportValidity()) return;

    const name = String(form.elements.namedItem('name')?.value || '').trim();
    const message = String(form.elements.namedItem('message')?.value || '').trim();
    const button = form.querySelector('button[type="submit"]');
    const oldText = button?.textContent || 'Kirim Ucapan';

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Mengirim...';
      }

      setStatus('Mengirim ucapan...', 'loading');
      const id = await resolveWeddingId();

      const url = new URL('/rest/v1/wishes', cfg.url);
      const response = await fetch(url, {
        method: 'POST',
        headers: apiHeaders('return=minimal'),
        body: JSON.stringify({
          wedding_id: id,
          guest_name: name.slice(0, 100),
          message: message.slice(0, 500),
          approved: true
        })
      });

      if (!response.ok) {
        throw new Error(`Insert ucapan gagal (${response.status}): ${await readError(response)}`);
      }

      form.elements.namedItem('message').value = '';
      setStatus('Ucapan berhasil dikirim ✓', 'success');

      // langsung refresh feed supaya ucapan baru muncul
      await loadPage(true);

      console.info('[WISHES] Ucapan auto-approved berhasil masuk Supabase.');
    } catch (error) {
      console.error('[WISHES SUBMIT ERROR]', error);
      setStatus(`Gagal: ${error.message}`, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }, true);

  more.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    loadPage(false);
  }, true);

  setTimeout(() => loadPage(true), 0);

  console.info('[WISHES] Supabase auto-approve patch aktif.');
})();