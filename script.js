'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const FARE = 550;
  const LIMIT = 4;
  const STORE = 'nexus-travels-v2';
  const ROWS = 'ABCDEFGHIJ';
  const SEATS = [...ROWS].flatMap(row => [1, 2, 3, 4].map(n => row + n));
  const OFFERS = Object.assign(Object.create(null), { NEW15: { label: 'NEW15', rate: .15 }, COUPLE20: { label: 'Couple 20', rate: .2 } });
  const money = amount => new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(amount);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalizeCode = value => value.trim().replace(/\s+/g, '').toUpperCase();
  const validSeats = value => Array.isArray(value) && value.length > 0 && value.length <= LIMIT && value.every(seat => SEATS.includes(seat)) && new Set(value).size === value.length;
  const dateIsReal = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
  function dhakaNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type).value;
    return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
  }
  function addDays(date, days) {
    const value = new Date(date + 'T12:00:00Z');
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }
  function dateBounds() {
    const now = dhakaNow();
    return { min: now.hour >= 21 ? addDays(now.date, 1) : now.date, max: addDays(now.date, 90), default: addDays(now.date, 1) };
  }
  const formatDate = (date, long = false) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(date + 'T12:00:00Z'));
  function calculate(seats, coupon) {
    const subtotal = seats.length * FARE;
    const discount = seats.length === LIMIT && OFFERS[coupon] ? Math.round(subtotal * OFFERS[coupon].rate) : 0;
    return { subtotal, discount, total: subtotal - discount };
  }
  function cleanBookings(bookings) {
    if (!Array.isArray(bookings)) return [];
    const ids = new Set();
    const occupied = new Set();
    return bookings.slice(0, 80).filter(ticket => {
      if (!ticket || typeof ticket.id !== 'string' || !/^NX-[A-Z0-9-]{4,35}$/.test(ticket.id) || ids.has(ticket.id) || !dateIsReal(ticket.date) || !validSeats(ticket.seats) || typeof ticket.name !== 'string' || !ticket.name.trim() || ticket.name.length > 80) return false;
      if (ticket.seats.some(seat => occupied.has(ticket.date + seat))) return false;
      ids.add(ticket.id);
      ticket.seats.forEach(seat => occupied.add(ticket.date + seat));
      return true;
    }).map(ticket => ({ id: ticket.id, date: ticket.date, seats: [...ticket.seats].sort(), name: ticket.name, coupon: ticket.seats.length === LIMIT && OFFERS[ticket.coupon] ? ticket.coupon : '', createdAt: typeof ticket.createdAt === 'string' ? ticket.createdAt : '' }));
  }
  function readStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (!raw || typeof raw !== 'object') return { bookings: [], draft: {} };
      return { bookings: cleanBookings(raw.bookings), draft: raw.draft && typeof raw.draft === 'object' ? raw.draft : {} };
    } catch { return { bookings: [], draft: {} }; }
  }
  const saved = readStorage();
  const bounds = dateBounds();
  const state = {
    date: dateIsReal(saved.draft.date) && saved.draft.date >= bounds.min && saved.draft.date <= bounds.max ? saved.draft.date : bounds.default,
    seats: new Set(), coupon: '', bookings: saved.bookings, step: 1
  };
  function bookedSeats(date = state.date) {
    return new Set(state.bookings.filter(ticket => ticket.date === date).flatMap(ticket => ticket.seats));
  }
  const occupiedOnLoad = bookedSeats();
  if (saved.draft.date === state.date && validSeats(saved.draft.seats)) state.seats = new Set(saved.draft.seats.filter(seat => !occupiedOnLoad.has(seat)));
  if (state.seats.size === LIMIT && OFFERS[saved.draft.coupon]) state.coupon = saved.draft.coupon;
  let storageWarning = false;
  let toastTimer;
  let latestTicket = null;
  let sectionVisible = false;
  let previouslyFocused = null;
  let passengerAttempted = false;

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4600);
  }
  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ version: 2, bookings: state.bookings, draft: { date: state.date, seats: [...state.seats], coupon: state.coupon } }));
      return true;
    } catch {
      if (!storageWarning) { toast('Browser storage is unavailable. You can still book a demo and download your ticket.'); storageWarning = true; }
      return false;
    }
  }
  function saveAndRender() { persist(); render(); }
  function announce(message) { $('#seat-announcement').textContent = message; }
  function updateDateBounds() {
    const current = dateBounds();
    $('#journey-date').min = current.min;
    $('#journey-date').max = current.max;
    return current;
  }
  function currentDateValid() {
    const current = updateDateBounds();
    return dateIsReal(state.date) && state.date >= current.min && state.date <= current.max;
  }
  function showDateError() {
    toast('Choose an available journey date before continuing.');
    $('#journey-date').focus();
    $('#plan').scrollIntoView({ block: 'start' });
  }
  function updateMobileBar() { $('#mobile-bookbar').hidden = !(sectionVisible && state.seats.size && !document.querySelector('dialog[open]')); }
  function syncProgress() {
    $$('[data-step]').forEach(item => {
      const number = Number(item.dataset.step);
      item.classList.toggle('active', number === state.step);
      item.classList.toggle('complete', number < state.step);
      if (number === state.step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    $('#passenger-panel').hidden = state.step !== 2;
    $('#seat-next').hidden = state.step === 2;
  }
  function render() {
    if (state.seats.size < LIMIT) state.coupon = '';
    if (!state.seats.size && state.step === 2) state.step = 1;
    const selected = [...state.seats].sort();
    const occupied = bookedSeats();
    const totals = calculate(selected, state.coupon);
    $$('.seat').forEach(button => {
      const seat = button.dataset.seat;
      const chosen = state.seats.has(seat);
      button.disabled = occupied.has(seat);
      button.classList.toggle('selected', chosen);
      button.setAttribute('aria-pressed', String(chosen));
      const location = ['1', '4'].includes(seat.slice(1)) ? 'window' : 'aisle';
      button.setAttribute('aria-label', `Seat ${seat}, ${location}, ${occupied.has(seat) ? 'booked on this browser' : chosen ? 'selected, click to remove' : 'available, 550 taka'}`);
    });
    $('#seat-count').textContent = selected.length;
    $('#seat-left').textContent = SEATS.length - occupied.size - selected.length;
    $('#clear-seats').disabled = !selected.length;
    $('#empty-selection').hidden = selected.length > 0;
    $('#selected-container').innerHTML = selected.map(seat => `<li><span class="seat-tag"><span>${seat}</span>${['1', '4'].includes(seat.slice(1)) ? 'Window' : 'Aisle'}</span><span class="seat-cost">৳${FARE}</span><button type="button" class="remove-seat" data-remove-seat="${seat}" aria-label="Remove seat ${seat}">×</button></li>`).join('');
    $('#total-price').textContent = money(totals.subtotal);
    $('#discount').textContent = money(totals.discount);
    $('#grand-total').textContent = money(totals.total);
    $('#discount-line').hidden = !totals.discount;
    $('#coupon-form').hidden = Boolean(state.coupon);
    $('#applied-coupon').hidden = !state.coupon;
    $('#applied-code').textContent = OFFERS[state.coupon]?.label || '';
    $('#apply').disabled = selected.length !== LIMIT;
    $('#coupon-hint').classList.remove('error');
    $('#coupon-code').removeAttribute('aria-invalid');
    $('#coupon-hint').textContent = state.coupon ? `You’re saving ${OFFERS[state.coupon].rate * 100}% on this journey.` : selected.length === LIMIT ? 'Try NEW15 or Couple 20. One offer per booking.' : `Pick ${LIMIT - selected.length} more seat${LIMIT - selected.length === 1 ? '' : 's'} to unlock an offer.`;
    $('#continue-details').disabled = !selected.length;
    $('#selection-hint').textContent = selected.length ? `${selected.length} seat${selected.length > 1 ? 's' : ''} selected. Looking good.` : 'Choose at least one seat to continue.';
    $('#mobile-seat-count').textContent = `${selected.length} seat${selected.length !== 1 ? 's' : ''} selected`;
    $('#mobile-total').textContent = money(totals.total);
    $$('[data-display-date]').forEach(el => { el.textContent = formatDate(state.date); });
    $('#journey-date').value = state.date;
    $$('[data-ticket-count]').forEach(el => { el.textContent = state.bookings.length; el.hidden = !state.bookings.length; });
    syncProgress();
    updateMobileBar();
  }
  function changeSeat(seat) {
    if (bookedSeats().has(seat)) return;
    const hadCoupon = Boolean(state.coupon);
    if (state.seats.has(seat)) {
      state.seats.delete(seat);
      if (state.seats.size < LIMIT) state.coupon = '';
      announce(`${seat} removed. ${state.seats.size} seats selected.`);
      if (hadCoupon) toast('Offer removed. Select four seats to use it again.');
    } else {
      if (state.seats.size >= LIMIT) { toast('A little room for everyone: choose up to 4 seats per booking.'); return; }
      state.seats.add(seat);
      if (state.step === 3) state.step = 1;
      announce(`${seat} selected. ${state.seats.size} of 4 seats selected. Total ${money(calculate([...state.seats], state.coupon).total)} taka.`);
    }
    saveAndRender();
  }
  $('#seat-map').innerHTML = [...ROWS].map(row => `<div class="seat-row"><span class="row-label" aria-hidden="true">${row}</span>${[1, 2, 3, 4].map(n => `${n === 3 ? '<span class="aisle-space" aria-hidden="true"></span>' : ''}<button type="button" class="seat" data-seat="${row + n}" aria-pressed="false">${row + n}</button>`).join('')}</div>`).join('');
  $('#seat-map').addEventListener('click', event => { const button = event.target.closest('[data-seat]'); if (button && !button.disabled) changeSeat(button.dataset.seat); });
  $('#seat-map').addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const button = event.target.closest('[data-seat]');
    if (!button) return;
    event.preventDefault();
    const index = SEATS.indexOf(button.dataset.seat);
    const delta = { ArrowUp: -4, ArrowDown: 4, ArrowLeft: -1, ArrowRight: 1 }[event.key];
    let next = event.key === 'Home' ? Math.floor(index / 4) * 4 : event.key === 'End' ? Math.floor(index / 4) * 4 + 3 : index + delta;
    while (next >= 0 && next < SEATS.length) {
      const target = $(`[data-seat="${SEATS[next]}"]`);
      if (!target.disabled) { target.focus(); break; }
      if (!delta) break;
      next += delta;
    }
  });
  $('#selected-container').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-seat]');
    if (!button) return;
    const seat = button.dataset.removeSeat;
    changeSeat(seat);
    const nextRemove = $('[data-remove-seat]');
    (nextRemove || $('#summary-title')).focus({ preventScroll: true });
  });
  $('#clear-seats').addEventListener('click', () => {
    state.seats.clear(); state.coupon = ''; state.step = 1; saveAndRender();
    announce('Seat selection cleared.');
    $('#seats-title').focus({ preventScroll: true });
  });
  $('#journey-date').addEventListener('focus', updateDateBounds);
  $('#journey-date').addEventListener('change', () => {
    const input = $('#journey-date');
    const current = updateDateBounds();
    if (!dateIsReal(input.value) || input.value < current.min || input.value > current.max) {
      input.setCustomValidity('Choose an available date within the next 90 days.'); input.reportValidity(); return;
    }
    input.setCustomValidity('');
    if (input.value === state.date) return;
    const hadSeats = state.seats.size;
    state.date = input.value; state.seats.clear(); state.coupon = ''; state.step = 1;
    saveAndRender();
    announce('Journey date changed to ' + formatDate(state.date));
    if (hadSeats) toast('Date updated. Choose seats for your new journey.');
  });
  $('#journey-date').addEventListener('input', () => $('#journey-date').setCustomValidity(''));
  $('#journey-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!currentDateValid()) { showDateError(); return; }
    $('#booking').scrollIntoView({ block: 'start' });
    $('#seats-title').focus({ preventScroll: true });
    announce('Dhaka to Sylhet on ' + formatDate(state.date) + '. Choose up to four seats.');
  });
  function applyCoupon() {
    const input = $('#coupon-code');
    if (state.seats.size !== LIMIT) { toast('Select four seats to use an offer.'); return; }
    const code = normalizeCode(input.value);
    if (!OFFERS[code]) {
      $('#coupon-hint').textContent = 'That code doesn’t match. Try NEW15 or Couple 20.';
      $('#coupon-hint').classList.add('error'); input.setAttribute('aria-invalid', 'true'); input.focus(); return;
    }
    state.coupon = code;
    saveAndRender();
    $('#remove-coupon').focus({ preventScroll: true });
    toast(`${OFFERS[code].label} applied. You saved ৳${money(calculate([...state.seats], code).discount)}.`);
  }
  $('#coupon-form').addEventListener('submit', event => { event.preventDefault(); applyCoupon(); });
  $('#remove-coupon').addEventListener('click', () => { state.coupon = ''; saveAndRender(); $('#coupon-code').focus({ preventScroll: true }); });
  $$('[data-use-coupon]').forEach(button => button.addEventListener('click', () => {
    $('#coupon-code').value = button.dataset.useCoupon;
    if (state.seats.size === LIMIT) { applyCoupon(); $('#summary').scrollIntoView({ block: 'start' }); }
    else { $('#booking').scrollIntoView({ block: 'start' }); $('#seats-title').focus({ preventScroll: true }); toast(`${button.dataset.useCoupon} is ready. Pick four seats, then apply your offer.`); }
  }));
  $('#continue-details').addEventListener('click', () => {
    if (!state.seats.size) return;
    if (!currentDateValid()) { showDateError(); return; }
    state.step = 2; syncProgress();
    $('#passenger-name').focus({ preventScroll: true });
    $('#passenger-panel').scrollIntoView({ block: 'center' });
  });
  $('#edit-seats').addEventListener('click', () => {
    state.step = 1; syncProgress(); $('#seats-title').focus({ preventScroll: true }); $('#seats-title').scrollIntoView({ block: 'start' });
  });
  function normalizePhone(value) {
    let phone = value.replace(/[০-৯]/g, digit => '০১২৩৪৫৬৭৮৯'.indexOf(digit)).replace(/[\s()+-]/g, '');
    if (phone.startsWith('880')) phone = '0' + phone.slice(3);
    return phone;
  }
  function validatePassenger() {
    const name = $('#passenger-name').value.trim();
    const phone = normalizePhone($('#passenger-phone').value);
    const email = $('#passenger-email').value.trim();
    const errors = {
      name: name.length < 2 ? 'Please enter your name (at least 2 characters).' : '',
      phone: !/^01[3-9]\d{8}$/.test(phone) ? 'Enter a Bangladesh mobile number, such as 01712345678.' : '',
      email: email && !$('#passenger-email').validity.valid ? 'Please enter a valid email address or leave this empty.' : ''
    };
    Object.entries(errors).forEach(([field, error]) => {
      const input = $('#passenger-' + field);
      const feedback = $('#' + field + '-error');
      feedback.textContent = error; feedback.hidden = !error;
      if (error) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
    return { name, valid: !Object.values(errors).some(Boolean), firstError: Object.keys(errors).find(key => errors[key]) };
  }
  $$('#passenger-form input').forEach(input => input.addEventListener('input', () => { if (passengerAttempted) validatePassenger(); }));
  function ticketHTML(ticket) {
    const totals = calculate(ticket.seats, ticket.coupon);
    return `<div class="demo-ticket"><div class="ticket-ref"><span>NEXUS / AC BUSINESS</span><strong>${escapeHTML(ticket.id)}</strong></div><div class="ticket-route"><div><strong>Dhaka</strong><small>21:00 departure</small></div><span>→</span><div><strong>Sylhet</strong><small>08:00 next day</small></div></div><div class="ticket-meta"><div><small>JOURNEY DATE</small><strong>${escapeHTML(formatDate(ticket.date))}</strong></div><div><small>YOUR SEATS</small><strong>${ticket.seats.join(', ')}</strong></div><div><small>PASSENGER</small><strong>${escapeHTML(ticket.name)}</strong></div><div><small>TOTAL FARE${ticket.coupon ? ' / OFFER INCLUDED' : ''}</small><strong>৳${money(totals.total)}${ticket.coupon ? ' · ' + OFFERS[ticket.coupon].label : ''}</strong></div></div></div>`;
  }
  function openDialog(dialog) {
    previouslyFocused = document.activeElement;
    dialog.showModal(); document.body.classList.add('modal-open'); updateMobileBar();
  }
  function closeDialog(dialog) { dialog.close(); }
  $$('dialog').forEach(dialog => {
    $$('[data-close-dialog]', dialog).forEach(button => button.addEventListener('click', () => closeDialog(dialog)));
    dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true }); updateMobileBar(); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog);
    });
  });
  $('#passenger-form').addEventListener('submit', event => {
    event.preventDefault(); passengerAttempted = true;
    const passenger = validatePassenger();
    if (!passenger.valid) { $('#passenger-' + passenger.firstError).focus(); return; }
    if (!state.seats.size || state.seats.size > LIMIT) { toast('Please choose one to four seats.'); state.step = 1; render(); return; }
    if (!currentDateValid()) { showDateError(); return; }
    // Reconcile other tabs before confirming. This remains a browser-only demo.
    const fresh = readStorage();
    if (!storageWarning) state.bookings = fresh.bookings;
    const occupied = bookedSeats();
    const conflicts = [...state.seats].filter(seat => occupied.has(seat));
    if (conflicts.length) {
      conflicts.forEach(seat => state.seats.delete(seat)); state.coupon = ''; state.step = 1; saveAndRender();
      toast('Some seats were just saved in another tab. Please review your selection.'); return;
    }
    const random = globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 8).toUpperCase() : Math.random().toString(36).slice(2, 10).toUpperCase();
    const ticket = { id: 'NX-' + random, date: state.date, seats: [...state.seats].sort(), name: passenger.name, coupon: state.coupon, createdAt: new Date().toISOString() };
    state.bookings.unshift(ticket);
    latestTicket = ticket;
    state.seats.clear(); state.coupon = ''; state.step = 3;
    const didSave = persist();
    render();
    $('#passenger-form').reset(); passengerAttempted = false;
    $$('.field-error').forEach(el => { el.hidden = true; el.textContent = ''; });
    $$('#passenger-form input').forEach(el => el.removeAttribute('aria-invalid'));
    $('#coupon-code').value = '';
    $('#success-ticket').innerHTML = ticketHTML(ticket);
    $('#save-status').textContent = didSave ? 'Saved in My tickets on this browser.' : 'Saved for this session. Download a copy before leaving.';
    // The submit button is now hidden; restore focus to the summary after closing.
    openDialog($('#success-dialog')); previouslyFocused = $('#summary-title');
  });
  function downloadTicket(ticket) {
    const totals = calculate(ticket.seats, ticket.coupon);
    const contents = [
      'NEXUS TRAVELS — DEMO TICKET', 'NOT VALID FOR TRAVEL. No payment or real reservation.', '',
      'Reference: ' + ticket.id, 'Passenger: ' + ticket.name, 'Route: Dhaka to Sylhet',
      'Departure: ' + formatDate(ticket.date, true) + ', 9:00 PM (Asia/Dhaka)',
      'Arrival: ' + formatDate(addDays(ticket.date, 1), true) + ', 8:00 AM (sample schedule)',
      'Coach: 009 / AC Business', 'Seats: ' + ticket.seats.join(', '),
      'Subtotal: BDT ' + totals.subtotal, 'Offer: ' + (OFFERS[ticket.coupon]?.label || 'None'),
      'Discount: BDT ' + totals.discount, 'Total: BDT ' + totals.total, '',
      'This is an interactive portfolio demonstration by Shayan Abrar.',
      'No confirmation email is sent. Phone and email are not stored.',
      'https://shayan-abrar.github.io/NEXUS-TRAVELS-TICKETING-with-js/'
    ].join('\n');
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = ticket.id + '-demo-ticket.txt'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('#download-current').addEventListener('click', () => { if (latestTicket) downloadTicket(latestTicket); });
  function renderSavedTickets() {
    $('#saved-tickets').innerHTML = state.bookings.length ? state.bookings.map(ticket => `<article class="saved-ticket" data-ticket="${ticket.id}">${ticketHTML(ticket)}<div class="saved-ticket-actions"><button type="button" data-download-ticket="${ticket.id}" aria-label="Download ticket ${ticket.id}">Download ticket (.txt)</button><button type="button" data-remove-ticket="${ticket.id}" aria-label="Remove demo ticket ${ticket.id}">Remove demo ticket</button></div><div class="remove-confirmation" data-remove-confirmation="${ticket.id}" hidden><p>Remove this saved ticket and release its seats on this browser?</p><div><button type="button" data-confirm-remove="${ticket.id}">Yes, remove ticket</button><button type="button" data-cancel-remove="${ticket.id}">Keep it</button></div></div></article>`).join('') : '<div class="tickets-empty"><svg class="icon"><use href="#i-ticket"/></svg><h3>Your next chapter awaits.</h3><p>Your demo tickets will appear here.<br>Let’s find you a good seat.</p><button class="button button-small" type="button" id="tickets-find-seat">Find my seat ↗</button></div>';
  }
  $$('[data-open-tickets]').forEach(button => button.addEventListener('click', () => { renderSavedTickets(); openDialog($('#tickets-dialog')); }));
  $('#saved-tickets').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.id === 'tickets-find-seat') { closeDialog($('#tickets-dialog')); $('#plan').scrollIntoView({ block: 'start' }); $('#journey-date').focus({ preventScroll: true }); return; }
    const { downloadTicket: downloadId, removeTicket: removeId, confirmRemove: confirmId, cancelRemove: cancelId } = button.dataset;
    if (downloadId) { const ticket = state.bookings.find(t => t.id === downloadId); if (ticket) downloadTicket(ticket); }
    if (removeId) { const confirmation = $(`[data-remove-confirmation="${removeId}"]`); confirmation.hidden = false; $('[data-confirm-remove]', confirmation).focus(); }
    if (cancelId) { $(`[data-remove-confirmation="${cancelId}"]`).hidden = true; $(`[data-remove-ticket="${cancelId}"]`).focus(); }
    if (confirmId) { state.bookings = state.bookings.filter(ticket => ticket.id !== confirmId); saveAndRender(); renderSavedTickets(); const focus = $('[data-download-ticket]') || $('#tickets-find-seat'); focus?.focus(); toast('Demo ticket removed. Its seats are available here again.'); }
  });
  const policies = {
    terms: { title: 'Booking terms', paragraphs: ['Nexus Travels is an interactive portfolio demo by Shayan Abrar. The Dhaka–Sylhet route, 9:00 PM departure, next-day 8:00 AM arrival, and ৳550 fare are sample information, not a live transport service.', 'Choose one to four seats per booking. NEW15 gives 15% off and Couple 20 gives 20% off when exactly four seats are selected. Only one coupon can apply at a time. Removing a seat removes the discount.', 'A confirmation creates a demo ticket saved in this browser when storage is available. No payment is taken, no email is sent, and no real bus seat is reserved. Campaign photos are AI-generated illustrations, not photographs of an actual operator or guaranteed destination views.'] },
    privacy: { title: 'Your privacy', paragraphs: ['Booking selections, journey dates, coupon choices, and confirmed demo tickets are stored only in this browser when local storage is available. Saved tickets include the passenger name. They are not sent to a booking server.', 'Phone number and optional email are used only to demonstrate form validation. Neither is saved in local storage or included in the downloaded ticket. The form is cleared after confirmation.', 'You can remove saved tickets in My tickets. Clearing this site’s browser data removes its tickets and draft selection. Downloads remain on your device until you delete them. There are no analytics, tracking scripts, remote fonts, or payment integrations in this page.'] },
    cancellation: { title: 'Changing your plans', paragraphs: ['Before confirming, tap a selected seat again to remove it, or use Clear. Changing the journey date clears your current seat selection and any applied coupon.', 'After confirming a demo booking, open My tickets and choose Remove demo ticket. Confirm removal to delete that local ticket and release its seats on this browser.', 'Because this is a demonstration, there is no real reservation, cancellation fee, payment, or refund. Download a copy before deleting a demo ticket if you want to keep a record.'] }
  };
  $$('[data-policy]').forEach(button => button.addEventListener('click', () => {
    const policy = policies[button.dataset.policy];
    $('#policy-title').textContent = policy.title;
    $('#policy-content').innerHTML = policy.paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('');
    openDialog($('#policy-dialog'));
  }));
  function closeMenu() { $('#mobile-menu').hidden = true; $('#menu-button').setAttribute('aria-expanded', 'false'); $('#menu-button').setAttribute('aria-label', 'Open menu'); }
  $('#menu-button').addEventListener('click', () => { const expanded = $('#menu-button').getAttribute('aria-expanded') === 'true'; $('#mobile-menu').hidden = expanded; $('#menu-button').setAttribute('aria-expanded', String(!expanded)); $('#menu-button').setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu'); });
  $$('#mobile-menu a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#mobile-menu').hidden) { closeMenu(); $('#menu-button').focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header') && !$('#mobile-menu').hidden) closeMenu(); });
  matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { sectionVisible = entries[0].isIntersecting; updateMobileBar(); }, { threshold: 0 }).observe($('#booking'));
  window.addEventListener('storage', event => {
    if (event.key !== STORE && event.key !== null) return;
    const fresh = readStorage(); state.bookings = fresh.bookings;
    const occupied = bookedSeats();
    const before = state.seats.size;
    state.seats = new Set([...state.seats].filter(seat => !occupied.has(seat)));
    if (state.seats.size !== before) { state.coupon = ''; toast('Seat availability changed in another tab. Review your selection.'); }
    render(); if ($('#tickets-dialog').open) renderSavedTickets();
  });
  $('#year').textContent = new Date().getFullYear();
  updateDateBounds(); render();
})();
