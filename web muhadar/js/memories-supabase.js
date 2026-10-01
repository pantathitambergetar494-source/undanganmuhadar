(() => {
  'use strict';

  const cfg = window.SUPABASE_CONFIG;
  const form = document.querySelector('#memoryForm');
  const photoInput = document.querySelector('#memoryPhoto');
  const preview = document.querySelector('#memoryPreview');
  const wall = document.querySelector('#memoryWall');
  const statusEl = document.querySelector('#memoryStatus');

  if (!form || !photoInput || !wall) {
    console.error('[MEMORIES] Elemen Sharing Memories tidak ditemukan.');
    return;
  }

  const BUCKET = 'wedding-memories';
  const PAGE_SIZE = 12;
  let weddingId = null;
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
      Authorization: `Bearer ${key}`
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

  function makePublicUrl(path) {
    const encodedPath = String(path)
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `${cfg.url}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
  }

  function randomId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        reject(new Error('Gunakan foto JPG, PNG, atau WebP.'));
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        reject(new Error('Ukuran foto terlalu besar. Maksimal 15 MB sebelum kompresi.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca foto.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format foto tidak dapat dibaca.'));
        img.onload = () => {
          const maxSide = 1400;
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

          const ctx = canvas.getContext('2d', { alpha: false });
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Gagal mengompres foto.'));
              return;
            }
            if (blob.size > 5 * 1024 * 1024) {
              reject(new Error('Foto hasil kompresi masih lebih dari 5 MB.'));
              return;
            }
            resolve(blob);
          }, 'image/jpeg', 0.78);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderMemory(row) {
    const src = makePublicUrl(row.image_path);
    return `
      <article class="memory-card">
        <img src="${esc(src)}" alt="Momen dari ${esc(row.guest_name)}" loading="lazy">
        <div>
          <strong>${esc(row.guest_name)}</strong>
          ${row.caption ? `<p>${esc(row.caption)}</p>` : ''}
        </div>
      </article>
    `;
  }

  async function loadMemories() {
    try {
      const id = await resolveWeddingId();
      const url = new URL('/rest/v1/memories', cfg.url);
      url.searchParams.set('select', 'id,guest_name,caption,image_path,created_at');
      url.searchParams.set('wedding_id', `eq.${id}`);
      url.searchParams.set('approved', 'eq.true');
      url.searchParams.set('order', 'created_at.desc');
      url.searchParams.set('limit', String(PAGE_SIZE));

      const response = await fetch(url, { headers: apiHeaders() });
      if (!response.ok) {
        throw new Error(`Gagal memuat memories (${response.status}): ${await readError(response)}`);
      }

      const rows = await response.json();
      wall.innerHTML = rows.length
        ? rows.map(renderMemory).join('')
        : '<p class="section-copy">Belum ada momen yang dibagikan.</p>';
    } catch (error) {
      console.error('[MEMORIES LOAD ERROR]', error);
      wall.innerHTML = '<p class="section-copy">Momen belum dapat dimuat.</p>';
    }
  }

  async function uploadBlob(blob, path) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const url = `${cfg.url}/storage/v1/object/${BUCKET}/${encodedPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...apiHeaders(),
        'Content-Type': 'image/jpeg',
        'x-upsert': 'false'
      },
      body: blob
    });

    if (!response.ok) {
      throw new Error(`Upload foto gagal (${response.status}): ${await readError(response)}`);
    }
  }

  async function insertMemory(payload) {
    const url = new URL('/rest/v1/memories', cfg.url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...apiHeaders('return=minimal'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Simpan memory gagal (${response.status}): ${await readError(response)}`);
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (busy) return;
    if (!form.reportValidity()) return;

    const file = photoInput.files?.[0];
    if (!file) {
      setStatus('Pilih foto terlebih dahulu.', 'error');
      return;
    }

    const guestName = String(form.elements.namedItem('name')?.value || '').trim();
    const caption = String(form.elements.namedItem('caption')?.value || '').trim();
    const button = form.querySelector('button[type="submit"]');
    const oldText = button?.textContent || 'Bagikan Momen';

    busy = true;

    try {
      if (button) {
        button.disabled = true;
        button.textContent = 'Mengunggah...';
      }

      setStatus('Mengompres foto...', 'loading');
      const [id, blob] = await Promise.all([
        resolveWeddingId(),
        compressImage(file)
      ]);

      const path = `${cfg.weddingSlug}/${Date.now()}-${randomId()}.jpg`;

      setStatus('Mengunggah foto...', 'loading');
      await uploadBlob(blob, path);

      setStatus('Menyimpan momen...', 'loading');
      await insertMemory({
        wedding_id: id,
        guest_name: guestName.slice(0, 100),
        caption: caption ? caption.slice(0, 300) : null,
        image_path: path,
        approved: true
      });

      setStatus('Momen berhasil dibagikan ✓', 'success');

      form.reset();
      if (preview) {
        preview.innerHTML = '';
        preview.hidden = true;
      }

      await loadMemories();

      console.info('[MEMORIES] Upload Supabase berhasil.');
    } catch (error) {
      console.error('[MEMORIES SUBMIT ERROR]', error);
      setStatus(`Gagal: ${error.message}`, 'error');
    } finally {
      busy = false;
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }, true);

  // app.js lebih dulu merender localStorage. Timpa dengan data Supabase.
  setTimeout(loadMemories, 0);

  console.info('[MEMORIES] Supabase Storage patch aktif.');
})();