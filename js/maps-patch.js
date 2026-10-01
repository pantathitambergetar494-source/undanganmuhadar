(() => {
  'use strict';

  // Patch lokal khusus tombol Google Maps pada dua EventCard.
  // Tidak mengubah data acara, countdown, RSVP, atau section lain.
  const MAPS = [
    {
      name: 'Akad Nikah',
      url: 'https://maps.app.goo.gl/YKJje9DsWWNvdQTR8'
    },
    {
      name: 'Resepsi',
      url: 'https://maps.app.goo.gl/aqjTYYWxcUvs9FK16'
    }
  ];

  function findLocationControl(card) {
    const controls = [...card.querySelectorAll('a, button')];
    return controls.find(el =>
      /lihat\s*lokasi|lokasi|google\s*maps|maps/i.test(el.textContent || '') ||
      /maps\.app\.goo\.gl|google\.com\/maps/i.test(el.getAttribute('href') || '')
    ) || null;
  }

  function patchControl(control, url) {
    if (!control) return false;

    if (control.tagName === 'A') {
      control.href = url;
      control.target = '_blank';
      control.rel = 'noopener noreferrer';
    }

    // Capture phase supaya handler lama (kalau ada) tidak membuka URL lama.
    control.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(url, '_blank', 'noopener,noreferrer');
    }, true);

    return true;
  }

  function applyMapsPatch() {
    const container = document.querySelector('#eventsList');
    if (!container) return false;

    // Cari card berdasarkan teks nama event agar tidak bergantung class internal.
    const candidates = [...container.querySelectorAll(':scope > *')];
    let patched = 0;

    MAPS.forEach(map => {
      let card = candidates.find(node =>
        (node.textContent || '').toLowerCase().includes(map.name.toLowerCase())
      );

      // Fallback: urutan event saat ini adalah Akad lalu Resepsi.
      if (!card) {
        const index = MAPS.indexOf(map);
        card = candidates[index] || null;
      }

      if (card && patchControl(findLocationControl(card), map.url)) {
        patched += 1;
      }
    });

    return patched === MAPS.length;
  }

  function boot() {
    if (applyMapsPatch()) {
      console.info('[MAPS] Akad & Resepsi map patch aktif.');
      return;
    }

    // eventsList di-render JS; tunggu bila belum tersedia.
    const target = document.querySelector('#eventsList');
    if (!target) return;

    const observer = new MutationObserver(() => {
      if (applyMapsPatch()) {
        observer.disconnect();
        console.info('[MAPS] Akad & Resepsi map patch aktif.');
      }
    });

    observer.observe(target, { childList: true, subtree: true });

    // Safety stop.
    setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();