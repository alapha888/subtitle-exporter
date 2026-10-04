/* Bilingual Subtitle Exporter — options page logic. */
(function () {
  'use strict';
  var api = (typeof browser !== 'undefined') ? browser : chrome;
  var $ = function (id) { return document.getElementById(id); };

  function refreshProStatus(msg) {
    api.storage.local.get('bse_license_key').then(function (res) {
      var key = res.bse_license_key || '';
      var ok = key && BSELicense.validateKey(key);
      $('proStatus').textContent = msg || (ok ? BSEi18n.t('optKeyOk') : BSEi18n.t('optKeyNone'));
      $('proStatus').className = 'status-line ' + (ok ? 'ok' : '');
      $('deactivateBtn').hidden = !ok;
      if (ok) $('keyInput').value = BSELicense.formatKey(key);
    });
  }

  function applyStrings() {
    document.title = BSEi18n.t('optTitle');
    $('optTitle').textContent = BSEi18n.t('optTitle');
    $('optLang').textContent = BSEi18n.t('optLang');
    $('optLangAuto').textContent = BSEi18n.t('optLangAuto');
    $('optDefaultFormat').textContent = BSEi18n.t('optDefaultFormat');
    $('optLicense').textContent = BSEi18n.t('optLicense');
    $('keyInput').placeholder = BSEi18n.t('optLicensePlaceholder');
    $('activateBtn').textContent = BSEi18n.t('optActivate');
    $('deactivateBtn').textContent = BSEi18n.t('optDeactivate');
    $('optBuyText').textContent = BSEi18n.t('optBuyText');
    $('optAbout').textContent = BSEi18n.t('optAbout');
    var buyUrl = (typeof BSE_CONFIG !== 'undefined' && BSE_CONFIG.TODO_BUY_URL) || '';
    if (buyUrl.indexOf('http') === 0) {
      $('buyBtn').textContent = BSEi18n.t('buy');
      $('buyBtn').disabled = false;
    } else {
      $('buyBtn').textContent = BSEi18n.t('buySoon');
      $('buyBtn').disabled = true;
    }
  }

  function init() {
    api.storage.local.get(['bse_lang', 'bse_default_format']).then(function (res) {
      $('langSelect').value = res.bse_lang || 'auto';
      $('formatSelect').value = res.bse_default_format || 'txt';
    });
    BSEi18n.init(function () {
      applyStrings();
      refreshProStatus();
    });

    $('langSelect').addEventListener('change', function () {
      api.storage.local.set({ bse_lang: $('langSelect').value }).then(function () {
        BSEi18n.init(function () { applyStrings(); refreshProStatus(); });
      });
    });
    $('formatSelect').addEventListener('change', function () {
      api.storage.local.set({ bse_default_format: $('formatSelect').value });
    });
    $('activateBtn').addEventListener('click', function () {
      var raw = $('keyInput').value;
      if (BSELicense.validateKey(raw)) {
        api.storage.local.set({ bse_license_key: BSELicense.formatKey(raw) }).then(function () {
          refreshProStatus(BSEi18n.t('optKeyOk'));
        });
      } else {
        refreshProStatus(BSEi18n.t('optKeyBad'));
      }
    });
    $('deactivateBtn').addEventListener('click', function () {
      api.storage.local.remove('bse_license_key').then(function () {
        $('keyInput').value = '';
        refreshProStatus();
      });
    });
    $('buyBtn').addEventListener('click', function () {
      var buyUrl = (typeof BSE_CONFIG !== 'undefined' && BSE_CONFIG.TODO_BUY_URL) || '';
      if (buyUrl.indexOf('http') === 0) api.tabs.create({ url: buyUrl });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
