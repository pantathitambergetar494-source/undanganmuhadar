(() => {
  'use strict';

  const cfg = window.SUPABASE_CONFIG;
  const form = document.querySelector('#rsvpForm');
  const statusEl = document.querySelector('#rsvpStatus');

  if (!form) {
    console.error('[RSVP] Form #rsvpForm tidak ditemukan.');
    return;
  }

  function setStatus(message, state = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
  }

  function normalizeAttendance(value) {
    const map = {
      hadir: 'hadir',
      'tidak-hadir': 'tidak_hadir',
      tidak_hadir: 'tidak_hadir',
      tentatif: 'tentatif'
    };
    return map[value] || value;
  }

  function headers(prefer) {
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
    let body = '';
    try {
      const data = await response.json();
      body = data?.message || data?.error_description || data?.hint || JSON.stringify(data);
    } catch (_) {
      try { body = await response.text(); } catch (_) {}
    }
    return body || `HTTP ${response.status}`;
  }

  async function resolveWeddingId() {
    const url = new URL('/rest/v1/weddings', cfg.url);
    url.searchParams.set('select', 'id');
    url.searchParams.set('slug', `eq.${cfg.weddingSlug}`);
    url.searchParams.set('is_active', 'eq.true');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers()
    });

    if (!response.ok) {
      throw new Error(`Wedding lookup gagal (${response.status}): ${await readError(response)}`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || !rows[0]?.id) {
      throw new Error(`Wedding slug "${cfg.weddingSlug}" tidak ditemukan.`);
    }
    return rows[0].id;
  }

  async function submitRsvp(payload) {
    const url = new URL('/rest/v1/rsvps', cfg.url);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: headers('return=minimal'),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Insert RSVP gagal (${response.status}): ${await readError(response)}`);
    }
  }

  // Capture phase: handler ini berjalan sebelum handler localStorage lama di app.js.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!cfg?.url || !cfg?.anonKey || !cfg?.weddingSlug) {
      console.error('[RSVP] SUPABASE_CONFIG:', cfg);
      setStatus('Config Supabase belum lengkap. Cek js/supabase-config.js', 'error');
      return;
    }

    const honeypot = form.elements.namedItem('company')?.value;
    if (honeypot) return;

    if (!form.reportValidity()) return;

    const guestName = String(form.elements.namedItem('name')?.value || '').trim();
    const attendance = normalizeAttendance(
      String(form.elements.namedItem('attendance')?.value || '')
    );
    const guestCount = Number(form.elements.namedItem('guestCount')?.value || 1);
    const message = String(form.elements.namedItem('message')?.value || '').trim();

    const button = form.querySelector('button[type="submit"]');
    const oldText = button?.textContent || 'Kirim RSVP';

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Mengirim...';
      }

      setStatus('Menghubungkan ke Supabase...', 'loading');

      const weddingId = await resolveWeddingId();

      await submitRsvp({
        wedding_id: weddingId,
        guest_name: guestName.slice(0, 100),
        attendance,
        guest_count: Math.min(10, Math.max(1, guestCount)),
        message: message ? message.slice(0, 500) : null
      });

      setStatus('RSVP berhasil dikirim ke database ✓', 'success');

      const messageField = form.elements.namedItem('message');
      if (messageField) messageField.value = '';

      console.info('[RSVP] Berhasil masuk Supabase.');
    } catch (error) {
      console.error('[RSVP ERROR]', error);
      setStatus(`Gagal: ${error.message}`, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }, true);

  console.info('[RSVP] Supabase REST patch aktif.');
})();