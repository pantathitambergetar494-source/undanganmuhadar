(() => {
  'use strict';

  const data = window.WEDDING_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE = {
    rsvp: 'muhadar-nia:rsvp',
    wishes: 'muhadar-nia:wishes',
    memories: 'muhadar-nia:memories'
  };

  const guestFromUrl = () => {
    const params = new URLSearchParams(location.search);
    return (params.get('to') || params.get('guest') || 'Bapak/Ibu/Saudara/i').trim();
  };

  const safeText = (value, fallback = '') => String(value ?? fallback).trim().slice(0, 500);

  function setGuestName() {
    const guest = guestFromUrl();
    $('#guestNameCover').textContent = guest;
    $('#rsvpName').value = guest === 'Bapak/Ibu/Saudara/i' ? '' : guest;
    $('#memoryName').value = guest === 'Bapak/Ibu/Saudara/i' ? '' : guest;
    $('#wishName').value = guest === 'Bapak/Ibu/Saudara/i' ? '' : guest;
  }

  function runPreloader() {
    const percent = $('#preloaderPercent');
    const preloader = $('#preloader');
    const duration = 1500;
    const start = performance.now();

    const tick = now => {
      const p = Math.min(100, Math.round(((now - start) / duration) * 100));
      percent.textContent = `${p}%`;
      if (p < 100) requestAnimationFrame(tick);
      else setTimeout(() => preloader.classList.add('is-hidden'), 220);
    };
    requestAnimationFrame(tick);
  }

  function setupOpeningVideo() {
    const hero = $('#openingHero');
    const video = $('#openingVideo');
    if (!hero || !video) return { play: async () => {} };

    let finished = false;
    const finish = (failed = false) => {
      if (finished) return;
      finished = true;
      hero.classList.remove('video-playing', 'video-ready');
      hero.classList.add(failed ? 'video-failed' : 'video-ended');
      try { video.pause(); } catch (_) {}
    };

    video.addEventListener('loadeddata', () => hero.classList.add('video-ready'), { once: true });
    video.addEventListener('ended', () => finish(false), { once: true });
    video.addEventListener('error', () => finish(true), { once: true });

    const play = async () => {
      finished = false;
      hero.classList.remove('video-ended', 'video-failed');
      hero.classList.add('video-playing');
      try {
        video.currentTime = 0;
        video.playbackRate = 1.2;
        await video.play();
      } catch (_) {
        finish(true);
      }
    };

    return { play };
  }

  function setupOpenInvitation(openingVideo) {
    const btn = $('#openInvitation');
    const cover = $('#coverScreen');
    const audio = $('#bgMusic');
    const control = $('#musicControl');

    if (data.music.enabled) {
      audio.src = data.music.src;
      control.hidden = false;
    }

    const playMusic = async () => {
      if (!data.music.enabled || !audio.src) return;
      try {
        await audio.play();
        control.classList.add('is-playing');
        control.textContent = '♫';
      } catch (_) {
        control.classList.remove('is-playing');
      }
    };

    btn.addEventListener('click', async () => {
      cover.classList.add('is-open');
      document.body.classList.remove('is-locked');
      $('.section--hero')?.scrollIntoView({ behavior: 'auto', block: 'start' });
      await Promise.allSettled([
        playMusic(),
        openingVideo?.play?.()
      ]);
    });

    control.addEventListener('click', async () => {
      if (audio.paused) await playMusic();
      else {
        audio.pause();
        control.classList.remove('is-playing');
        control.textContent = '♪';
      }
    });
  }

  function setupReveal() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    $$('.reveal').forEach(el => observer.observe(el));
  }

  function renderEvents() {
    const list = $('#eventsList');
    list.innerHTML = data.events.map(event => `
      <article class="event-card reveal">
        <img class="event-card__crest" src="assets/images/ornaments/event-crest.png" alt="">
        <h3>${safeText(event.title)}</h3>
        <div class="event-card__date">
          <span>${safeText(event.day)}</span>
          <strong>${safeText(event.dateLabel)}</strong>
          <span>${safeText(event.timeLabel)}</span>
        </div>
        <p class="event-card__venue"><strong>${safeText(event.venue)}</strong>${safeText(event.address)}</p>
        ${event.mapsUrl ? `<a class="btn btn--gold" href="${event.mapsUrl}" target="_blank" rel="noopener noreferrer">Lihat Lokasi</a>` : ''}
      </article>
    `).join('');
  }

  function setupCountdown() {
    const target = new Date(data.countdownTarget).getTime();
    const units = { days: $('#days'), hours: $('#hours'), minutes: $('#minutes'), seconds: $('#seconds') };

    const tick = () => {
      const distance = Math.max(0, target - Date.now());
      const days = Math.floor(distance / 86400000);
      const hours = Math.floor((distance % 86400000) / 3600000);
      const minutes = Math.floor((distance % 3600000) / 60000);
      const seconds = Math.floor((distance % 60000) / 1000);
      units.days.textContent = String(days).padStart(2, '0');
      units.hours.textContent = String(hours).padStart(2, '0');
      units.minutes.textContent = String(minutes).padStart(2, '0');
      units.seconds.textContent = String(seconds).padStart(2, '0');
    };
    tick();
    setInterval(tick, 1000);
  }

  function setupCalendar() {
    $('#saveDate').addEventListener('click', () => {
      const event = data.events.find(x => x.id === 'resepsi');
      const start = new Date(event.dateISO);
      const end = new Date(start.getTime() + 4 * 3600000);
      const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Muhadar Nia Wedding//ID',
        'BEGIN:VEVENT',
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        'SUMMARY:Resepsi Pernikahan Muhadar & Nia',
        `LOCATION:${event.venue}, ${event.address}`,
        'DESCRIPTION:Resepsi pernikahan Muhadar & Nia',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resepsi-muhadar-nia.ics';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function renderGallery() {
    const grid = $('#galleryGrid');
    grid.innerHTML = data.gallery.map((src, index) => `
      <button class="gallery-item reveal" type="button" data-gallery-index="${index}" aria-label="Buka foto galeri ${index + 1}">
        <img src="${src}" alt="Momen Muhadar dan Nia ${index + 1}" loading="lazy">
      </button>
    `).join('');
  }

  function setupLightbox() {
    const modal = $('#lightbox');
    const image = $('#lightboxImage');
    let index = 0;
    const show = next => {
      index = (next + data.gallery.length) % data.gallery.length;
      image.src = data.gallery[index];
    };
    $('#galleryGrid').addEventListener('click', e => {
      const btn = e.target.closest('[data-gallery-index]');
      if (!btn) return;
      show(Number(btn.dataset.galleryIndex));
      modal.showModal();
    });
    $('#lightboxClose').addEventListener('click', () => modal.close());
    $('#lightboxPrev').addEventListener('click', () => show(index - 1));
    $('#lightboxNext').addEventListener('click', () => show(index + 1));
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
  }

  function setupGift() {
    const modal = $('#giftModal');
    const holder = $('#giftAccounts');
    if (!data.gift.accounts.length) {
      holder.innerHTML = '<div class="gift-empty">Nomor rekening / e-wallet belum ditambahkan. Bagian ini siap diisi nanti tanpa mengubah layout.</div>';
    } else {
      holder.innerHTML = data.gift.accounts.map((account, i) => `
        <div class="account-card">
          <small>${safeText(account.bank)}</small>
          <strong>${safeText(account.number)}</strong>
          <span>${safeText(account.holder)}</span>
          <button class="btn btn--gold" type="button" data-copy-account="${i}">Salin Nomor</button>
        </div>
      `).join('');
    }
    $('#giftShippingAddress').textContent = data.gift.shippingAddress || 'Alamat akan dilengkapi';
    $('#giftShippingNote').textContent = data.gift.shippingAddress ? 'Alamat detail dapat diperbarui melalui js/data.js.' : 'Alamat detail akan dilengkapi kemudian.';
    $('#openGift').addEventListener('click', () => modal.showModal());
    $('#closeGift').addEventListener('click', () => modal.close());
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
    holder.addEventListener('click', async e => {
      const btn = e.target.closest('[data-copy-account]');
      if (!btn) return;
      const account = data.gift.accounts[Number(btn.dataset.copyAccount)];
      await navigator.clipboard.writeText(account.number);
      const old = btn.textContent;
      btn.textContent = 'Tersalin ✓';
      setTimeout(() => btn.textContent = old, 1600);
    });
  }

  function renderStory() {
    $('#storyList').innerHTML = data.loveStory.map(item => `
      <article class="story-item reveal">
        <h3>${safeText(item.title)}</h3>
        <p>${safeText(item.text)}</p>
      </article>
    `).join('');
  }

  function readJson(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function setupRsvp() {
    const form = $('#rsvpForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (form.elements.namedItem('company')?.value) return;
      const record = {
        name: safeText(form.elements.namedItem('name')?.value),
        attendance: safeText(form.elements.namedItem('attendance')?.value),
        guestCount: Number(form.elements.namedItem('guestCount')?.value || 1),
        message: safeText(form.elements.namedItem('message')?.value),
        createdAt: new Date().toISOString()
      };
      const rows = readJson(STORAGE.rsvp);
      rows.unshift(record);
      writeJson(STORAGE.rsvp, rows.slice(0, 30));
      $('#rsvpStatus').textContent = 'RSVP berhasil disimpan di perangkat ini ✓';
      setTimeout(() => $('#rsvpStatus').textContent = '', 4000);
    });
  }

  function setupMemories() {
    if (!data.features.sharingMemories) {
      $('#memories').hidden = true;
      return;
    }

    const form = $('#memoryForm');
    const photo = $('#memoryPhoto');
    const preview = $('#memoryPreview');
    const wall = $('#memoryWall');
    let previewUrl = '';

    const fileToCompressedDataUrl = file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca foto'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format foto tidak didukung'));
        img.onload = () => {
          const maxSide = 720;
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext('2d', { alpha: false });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .72));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    photo.addEventListener('change', () => {
      const file = photo.files?.[0];
      if (!file) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${previewUrl}" alt="Preview foto">`;
      preview.hidden = false;
    });

    const renderLocalWall = () => {
      const rows = readJson(STORAGE.memories);
      wall.innerHTML = rows.map(row => `
        <article class="memory-card">
          ${row.image ? `<img src="${row.image}" alt="Momen dari ${safeText(row.name)}" loading="lazy">` : ''}
          <div><strong>${safeText(row.name)}</strong><p>${safeText(row.caption)}</p></div>
        </article>
      `).join('');
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const file = photo.files?.[0];
      if (!file) return;
      const status = $('#memoryStatus');
      status.textContent = 'Menyiapkan foto...';
      try {
        const image = await fileToCompressedDataUrl(file);
        const rows = readJson(STORAGE.memories);
        rows.unshift({
          name: safeText(form.elements.namedItem('name')?.value),
          caption: safeText(form.elements.namedItem('caption')?.value),
          image,
          createdAt: new Date().toISOString()
        });
        // Local demo storage only: keep a few compressed images to avoid browser quota overflow.
        writeJson(STORAGE.memories, rows.slice(0, 6));
        status.textContent = 'Momen tersimpan di perangkat ini ✓';
        renderLocalWall();
        form.reset();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = '';
        preview.hidden = true;
      } catch (err) {
        status.textContent = err?.message || 'Foto belum berhasil disimpan.';
      }
      setTimeout(() => status.textContent = '', 5200);
    });

    renderLocalWall();
  }

  function setupWishes() {
    const form = $('#wishForm');
    const list = $('#wishesList');
    const more = $('#loadMoreWishes');
    let visible = 5;

    const defaults = [
      { name: 'Keluarga & Sahabat', message: 'Semoga menjadi keluarga yang penuh kasih, ketenangan, dan keberkahan.', createdAt: new Date().toISOString() }
    ];

    const render = () => {
      const rows = readJson(STORAGE.wishes, defaults);
      list.innerHTML = rows.slice(0, visible).map(row => `
        <article class="wish-card">
          <strong>${safeText(row.name)}</strong>
          <p>${safeText(row.message)}</p>
          <small>${new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
        </article>
      `).join('');
      more.hidden = rows.length <= visible;
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (form.elements.namedItem('website')?.value) return;
      const rows = readJson(STORAGE.wishes, defaults);
      rows.unshift({
        name: safeText(form.elements.namedItem('name')?.value),
        message: safeText(form.elements.namedItem('message')?.value),
        createdAt: new Date().toISOString()
      });
      writeJson(STORAGE.wishes, rows.slice(0, 100));
      form.elements.namedItem('message').value = '';
      $('#wishStatus').textContent = 'Ucapan tersimpan ✓';
      visible = Math.max(visible, 5);
      render();
      setTimeout(() => $('#wishStatus').textContent = '', 3200);
    });

    more.addEventListener('click', () => { visible += 5; render(); });
    render();
  }

  function hideDisabledFeatures() {
    if (!data.features.rsvp) $('#rsvp').hidden = true;
    if (!data.features.wishes) $('#wishes').hidden = true;
    if (!data.features.loveStory) $('#story').hidden = true;
  }

  function init() {
    setGuestName();
    renderEvents();
    renderGallery();
    renderStory();
    hideDisabledFeatures();
    runPreloader();
    const openingVideo = setupOpeningVideo();
    setupOpenInvitation(openingVideo);
    setupCountdown();
    setupCalendar();
    setupLightbox();
    setupGift();
    setupRsvp();
    setupMemories();
    setupWishes();
    setupReveal();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
