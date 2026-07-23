(function () {
  'use strict';

  /* ---------- Header sticky (transparente -> sólido) ---------- */
  var header = document.getElementById('site-header');
  function updateHeader() {
    if (window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* ---------- Menú móvil ---------- */
  var menuToggle = document.getElementById('menu-toggle');
  var mainNav = document.getElementById('main-nav');

  menuToggle.addEventListener('click', function () {
    var isOpen = mainNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });

  mainNav.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      mainNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    });
  });

  /* ---------- Animaciones de scroll: fade-in + desplazamiento ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Contadores animados de impacto ---------- */
  var counters = document.querySelectorAll('[data-count-to]');

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    var duration = 1600;
    var start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }
    window.requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { counterObserver.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count-to'); });
  }

  /* ---------- Barras de progreso de proyectos ---------- */
  var progressFills = document.querySelectorAll('.progress-fill');

  if ('IntersectionObserver' in window) {
    var progressObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var fill = entry.target;
          fill.style.width = fill.getAttribute('data-progress') + '%';
          observer.unobserve(fill);
        }
      });
    }, { threshold: 0.4 });

    progressFills.forEach(function (fill) { progressObserver.observe(fill); });
  } else {
    progressFills.forEach(function (fill) { fill.style.width = fill.getAttribute('data-progress') + '%'; });
  }

  /* ---------- Toggle donación única / mensual ---------- */
  var toggleBtns = document.querySelectorAll('.toggle-btn');
  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toggleBtns.forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
    });
  });

  /* ---------- Selección de monto de donación ---------- */
  var amountBtns = document.querySelectorAll('.amount-btn');
  amountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      amountBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    });
  });

  /* ---------- Formulario de contacto (demo, sin backend) ---------- */
  var contactForm = document.getElementById('contact-form');
  var formNote = document.getElementById('form-note');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        formNote.textContent = 'Por favor completa los campos obligatorios.';
        formNote.style.color = '#b34a4a';
        return;
      }
      formNote.style.color = '';
      formNote.textContent = 'Gracias por escribirnos. Te responderemos muy pronto.';
      contactForm.reset();
    });
  }

  /* ---------- Botón volver arriba ---------- */
  var backToTop = document.getElementById('back-to-top');
  function updateBackToTop() {
    if (window.scrollY > 600) {
      backToTop.classList.add('is-visible');
    } else {
      backToTop.classList.remove('is-visible');
    }
  }
  updateBackToTop();
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

})();
