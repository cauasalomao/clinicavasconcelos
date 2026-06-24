/* ==========================================================================
   Clínica Vasconcelos — main.js
   FAQ accordion · UTM passthrough nos links de WhatsApp · tracking hooks ·
   reveal on scroll. Sem dependências.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     1) UTM passthrough — preserva parâmetros de campanha da URL e os
        repassa em TODO link de WhatsApp, mantendo a atribuição lead→fecho.
        (§9) Mantém o text= pré-preenchido intacto.
     ------------------------------------------------------------------- */
  var KEEP = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'];

  function campaignParams() {
    var current = new URLSearchParams(window.location.search);
    var out = new URLSearchParams();
    KEEP.forEach(function (k) {
      var v = current.get(k);
      if (v) out.set(k, v);
    });
    return out;
  }

  function decorateWhatsAppLinks() {
    var extra = campaignParams();
    if (![].slice.call(extra.keys()).length) return; // nada a propagar
    document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(function (a) {
      try {
        var url = new URL(a.href);
        extra.forEach(function (val, key) { url.searchParams.set(key, val); });
        a.href = url.toString();
      } catch (e) { /* href malformado: ignora */ }
    });
  }

  /* ---------------------------------------------------------------------
     2) Tracking de conversão — placeholder. Liga aqui Pixel/GA quando
        ativar os hooks no <head>. Dispara no clique de qualquer CTA WhatsApp.
     ------------------------------------------------------------------- */
  function trackLeadClick(source) {
    // TODO: substituir pelos disparos reais quando o tracking estiver ativo.
    // if (window.fbq)  fbq('track', 'Lead', { source: source });
    // if (window.gtag) gtag('event', 'generate_lead', { source: source });
    if (window.dataLayer) window.dataLayer.push({ event: 'whatsapp_lead', source: source || 'cta' });
  }
  window.trackLeadClick = trackLeadClick;

  function wireConversionTracking() {
    document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(function (a) {
      a.addEventListener('click', function () {
        trackLeadClick(a.getAttribute('data-cta') || 'cta');
      });
    });
  }

  /* ---------------------------------------------------------------------
     3) FAQ accordion (§8) — acessível (aria-expanded, teclado nativo via button)
     ------------------------------------------------------------------- */
  function wireFaq() {
    document.querySelectorAll('.faq__q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.style.maxHeight = expanded ? '0px' : panel.scrollHeight + 'px';
      });
    });
  }

  /* ---------------------------------------------------------------------
     4) Reveal on scroll
     ------------------------------------------------------------------- */
  function wireReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     4b) Carrossel de avaliações (§6) — scroll-snap nativo + setas.
         Desabilita as setas nas extremidades. Inofensivo se não houver.
     ------------------------------------------------------------------- */
  function wireReviewsCarousel() {
    document.querySelectorAll('.reviews__carousel').forEach(function (carousel) {
      var track = carousel.querySelector('[data-reviews-track]');
      if (!track) return;
      var prev = carousel.querySelector('[data-reviews-prev]');
      var next = carousel.querySelector('[data-reviews-next]');

      function step() {
        var card = track.querySelector('.review');
        var gap = parseFloat(getComputedStyle(track).gap) || 16;
        return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.85;
      }
      function update() {
        var max = track.scrollWidth - track.clientWidth - 2;
        if (prev) prev.disabled = track.scrollLeft <= 0;
        if (next) next.disabled = track.scrollLeft >= max;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', function () { window.requestAnimationFrame(update); });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ---------------------------------------------------------------------
     5) Modal de agendamento — o formulário monta a mensagem e encaminha
        para o WhatsApp da clínica (com nome/telefone/e-mail). Mantém UTM.
        Só roda em páginas que têm o modal (#lead-modal/.modal); inofensivo
        nas demais.
     ------------------------------------------------------------------- */
  var WA_NUMBER = '5512996665043';

  function wireLeadForm() {
    var modal = document.getElementById('agendar') || document.querySelector('.modal');
    if (!modal) return;
    var form = modal.querySelector('#lead-form, form');
    var lastFocused = null;

    function focusables() {
      return modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    }
    function openForm(trigger) {
      lastFocused = trigger || document.activeElement;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      var first = modal.querySelector('input, button');
      if (first) first.focus();
    }
    function closeForm() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    // abrir: qualquer elemento com [data-open-form]
    document.querySelectorAll('[data-open-form]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openForm(el);
      });
    });
    // fechar: backdrop, botão de fechar
    modal.querySelectorAll('[data-close-form]').forEach(function (el) {
      el.addEventListener('click', closeForm);
    });
    // teclado: Esc fecha, Tab fica preso no modal
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { closeForm(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // enviar: monta a mensagem e abre o WhatsApp
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var data = new FormData(form);
        var nome = (data.get('nome') || '').toString().trim();
        var tel = (data.get('telefone') || '').toString().trim();
        var email = (data.get('email') || '').toString().trim();

        var msg = 'Olá! Vim pelo site e gostaria de agendar uma avaliação de implante.'
          + '\n\nNome: ' + nome
          + '\nWhatsApp: ' + tel
          + '\nE-mail: ' + email;

        var url = new URL('https://wa.me/' + WA_NUMBER);
        url.searchParams.set('text', msg);
        campaignParams().forEach(function (val, key) { url.searchParams.set(key, val); });

        trackLeadClick('form');
        var win = window.open(url.toString(), '_blank');
        if (!win) window.location.href = url.toString(); // fallback se popup bloqueado
        closeForm();
      });
    }
  }

  /* ---------------------------------------------------------------------
     Init
     ------------------------------------------------------------------- */
  function init() {
    decorateWhatsAppLinks();
    wireConversionTracking();
    wireFaq();
    wireReveal();
    wireReviewsCarousel();
    wireLeadForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
