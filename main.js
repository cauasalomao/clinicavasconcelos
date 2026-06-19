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
     Init
     ------------------------------------------------------------------- */
  function init() {
    decorateWhatsAppLinks();
    wireConversionTracking();
    wireFaq();
    wireReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
