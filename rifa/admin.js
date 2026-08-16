(function () {
  'use strict';

  var STORAGE_KEY = 'rifaAdminPin';

  var gate = document.getElementById('admin-gate');
  var panel = document.getElementById('admin-panel');
  var pinInput = document.getElementById('admin-pin');
  var loginBtn = document.getElementById('admin-login-btn');
  var gateNote = document.getElementById('admin-gate-note');
  var refreshBtn = document.getElementById('admin-refresh-btn');
  var tbody = document.getElementById('admin-table-body');
  var emptyMsg = document.getElementById('admin-empty');

  function pad3(n) { return String(n).padStart(3, '0'); }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  function getPin() {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  }

  function setPin(pin) {
    sessionStorage.setItem(STORAGE_KEY, pin);
  }

  function clearPin() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function adminFetch(url, options) {
    options = options || {};
    options.headers = Object.assign({}, options.headers, { 'x-rifa-admin-pin': getPin() });
    return fetch(url, options);
  }

  function showGate(message) {
    gate.hidden = false;
    panel.hidden = true;
    gateNote.textContent = message || '';
    gateNote.style.color = '#b34a4a';
  }

  function showPanel() {
    gate.hidden = true;
    panel.hidden = false;
  }

  function renderRows(items) {
    tbody.innerHTML = '';
    if (!items || items.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    items.forEach(function (item) {
      var tr = document.createElement('tr');

      var tdNumber = document.createElement('td');
      tdNumber.textContent = pad3(item.number);
      tr.appendChild(tdNumber);

      var tdStatus = document.createElement('td');
      tdStatus.textContent = item.status === 'sold' ? 'Vendido' : 'Reservado';
      tr.appendChild(tdStatus);

      var tdBuyer = document.createElement('td');
      tdBuyer.className = 'wrap';
      tdBuyer.textContent = item.buyerName || '—';
      tr.appendChild(tdBuyer);

      var tdPhone = document.createElement('td');
      tdPhone.textContent = item.buyerPhone || '—';
      tr.appendChild(tdPhone);

      var tdWall = document.createElement('td');
      tdWall.className = 'wrap';
      tdWall.textContent = item.showOnWall ? (item.wallDisplayName || 'Sí') : 'No';
      tr.appendChild(tdWall);

      var tdDate = document.createElement('td');
      tdDate.textContent = formatDate(item.soldAt || item.reservedAt);
      tr.appendChild(tdDate);

      var tdActions = document.createElement('td');
      var actionsWrap = document.createElement('div');
      actionsWrap.className = 'admin-actions';

      if (item.status !== 'sold') {
        var confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'confirmar';
        confirmBtn.textContent = 'Marcar pagado';
        confirmBtn.addEventListener('click', function () { confirmarPago(item.number); });
        actionsWrap.appendChild(confirmBtn);
      }

      var releaseBtn = document.createElement('button');
      releaseBtn.type = 'button';
      releaseBtn.className = 'liberar';
      releaseBtn.textContent = 'Liberar';
      releaseBtn.addEventListener('click', function () { liberarNumero(item.number); });
      actionsWrap.appendChild(releaseBtn);

      tdActions.appendChild(actionsWrap);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  function loadReservas() {
    return adminFetch('/api/admin/reservas')
      .then(function (res) {
        if (res.status === 401) {
          clearPin();
          showGate('PIN incorrecto o expirado. Ingresa de nuevo.');
          return null;
        }
        if (!res.ok) throw new Error('request_failed');
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        showPanel();
        renderRows(data.items);
      })
      .catch(function () {
        showGate('No se pudo conectar con el servidor. Intenta de nuevo.');
      });
  }

  function confirmarPago(number) {
    adminFetch('/api/admin/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number }),
    })
      .then(function (res) {
        if (res.status === 401) { clearPin(); showGate('Sesión expirada.'); return; }
        loadReservas();
      });
  }

  function liberarNumero(number) {
    if (!confirm('¿Liberar el número ' + pad3(number) + '? Se borrarán los datos del comprador.')) return;
    adminFetch('/api/admin/liberar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number }),
    })
      .then(function (res) {
        if (res.status === 401) { clearPin(); showGate('Sesión expirada.'); return; }
        loadReservas();
      });
  }

  loginBtn.addEventListener('click', function () {
    var pin = pinInput.value.trim();
    if (!pin) return;
    setPin(pin);
    loadReservas();
  });

  pinInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });

  refreshBtn.addEventListener('click', loadReservas);

  if (getPin()) {
    loadReservas();
  }
})();
