(function () {
  'use strict';

  var WHATSAPP_NUMBER = '573164291516';
  var POLL_MS = 15000;

  var grid = document.getElementById('rifa-grid');
  var statSold = document.getElementById('stat-sold');
  var statAmount = document.getElementById('stat-amount');
  var progressFill = document.getElementById('rifa-progress-fill');
  var progressBar = document.getElementById('rifa-progress-bar');
  var wallEl = document.getElementById('rifa-wall');
  var wallEmpty = document.getElementById('rifa-wall-empty');

  var modalBackdrop = document.getElementById('rifa-modal-backdrop');
  var modalClose = document.getElementById('rifa-modal-close');
  var modalTitleNumber = document.getElementById('rifa-modal-number');
  var modalNumber2 = document.getElementById('rifa-modal-number-2');
  var stepForm = document.getElementById('rifa-modal-step-form');
  var stepPayment = document.getElementById('rifa-modal-step-payment');
  var reserveForm = document.getElementById('rifa-reserve-form');
  var formNote = document.getElementById('rifa-form-note');
  var showWallCheckbox = document.getElementById('rifa-show-wall');
  var wallNameRow = document.getElementById('rifa-wall-name-row');
  var wallNameInput = document.getElementById('rifa-wall-name');
  var whatsappBtn = document.getElementById('rifa-whatsapp-btn');
  var modalDoneBtn = document.getElementById('rifa-modal-done');

  var cellsByNumber = {};
  var currentNumber = null;
  var lastStatuses = {};

  function pad3(n) {
    return String(n).padStart(3, '0');
  }

  function formatCOP(n) {
    return '$' + n.toLocaleString('es-CO');
  }

  function buildGrid() {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < 1000; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rifa-cell';
      btn.textContent = pad3(i);
      btn.dataset.number = String(i);
      btn.addEventListener('click', onCellClick);
      cellsByNumber[i] = btn;
      fragment.appendChild(btn);
    }
    grid.appendChild(fragment);
  }

  function applyCellStatus(cell, status) {
    cell.classList.remove('is-available', 'is-reserved', 'is-apartado', 'is-sold');
    cell.classList.add('is-' + status);
    cell.disabled = status !== 'available';
  }

  function renderState(data) {
    data.numbers.forEach(function (item) {
      if (lastStatuses[item.number] === item.status) return;
      lastStatuses[item.number] = item.status;
      var cell = cellsByNumber[item.number];
      if (cell) applyCellStatus(cell, item.status);
    });

    statSold.textContent = data.summary.sold;
    statAmount.textContent = formatCOP(data.summary.amountRaisedCOP);
    var pct = Math.round((data.summary.sold / data.summary.total) * 100);
    progressFill.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', String(data.summary.sold));
    progressBar.setAttribute('aria-valuemax', String(data.summary.total));

    renderWall(data.wall);
  }

  function renderWall(wall) {
    var items = wallEl.querySelectorAll('.rifa-wall-item');
    items.forEach(function (el) { el.remove(); });

    if (!wall || wall.length === 0) {
      wallEmpty.hidden = false;
      return;
    }
    wallEmpty.hidden = true;

    wall.forEach(function (entry) {
      var pill = document.createElement('span');
      pill.className = 'rifa-wall-item';
      pill.textContent = entry.displayName;
      wallEl.appendChild(pill);
    });
  }

  function fetchState() {
    return fetch('/api/rifa/state')
      .then(function (res) { return res.json(); })
      .then(renderState)
      .catch(function (err) { console.error('No se pudo cargar el estado de la rifa', err); });
  }

  function onCellClick(e) {
    var btn = e.currentTarget;
    if (btn.disabled) return;
    currentNumber = btn.dataset.number;
    openModal(currentNumber);
  }

  function openModal(number) {
    modalTitleNumber.textContent = pad3(number);
    reserveForm.reset();
    wallNameRow.hidden = true;
    formNote.textContent = '';
    stepForm.hidden = false;
    stepPayment.hidden = true;
    modalBackdrop.hidden = false;
  }

  function closeModal() {
    modalBackdrop.hidden = true;
    currentNumber = null;
    fetchState();
  }

  modalClose.addEventListener('click', closeModal);
  modalDoneBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) closeModal();
  });

  showWallCheckbox.addEventListener('change', function () {
    wallNameRow.hidden = !showWallCheckbox.checked;
    wallNameInput.required = showWallCheckbox.checked;
  });

  reserveForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (currentNumber === null) return;

    var payload = {
      number: Number.parseInt(currentNumber, 10),
      buyerName: document.getElementById('rifa-buyer-name').value.trim(),
      buyerPhone: document.getElementById('rifa-buyer-phone').value.trim(),
      showOnWall: showWallCheckbox.checked,
      wallDisplayName: wallNameInput.value.trim(),
    };

    formNote.textContent = 'Reservando...';
    formNote.style.color = '';

    fetch('/api/rifa/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (res.status === 409) {
          formNote.textContent = 'Ese número ya no está disponible. Elige otro.';
          formNote.style.color = '#b34a4a';
          fetchState();
          return null;
        }
        if (!res.ok) throw new Error('request_failed');
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        showPaymentStep(data.number, payload);
      })
      .catch(function () {
        formNote.textContent = 'Hubo un problema. Intenta de nuevo.';
        formNote.style.color = '#b34a4a';
      });
  });

  function showPaymentStep(number, payload) {
    modalNumber2.textContent = pad3(number);
    stepForm.hidden = true;
    stepPayment.hidden = false;

    var message = 'Hola, reservé el número ' + pad3(number) +
      ' de la Rifa del Novillo. Quiero enviar el comprobante de pago (completo o abono).';
    whatsappBtn.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);

    lastStatuses[number] = 'reserved';
    var cell = cellsByNumber[number];
    if (cell) applyCellStatus(cell, 'reserved');
  }

  buildGrid();
  fetchState();
  setInterval(fetchState, POLL_MS);
})();
