/* Bilingual Subtitle Exporter — popup logic. */
(function () {
  'use strict';
  var api = (typeof browser !== 'undefined') ? browser : chrome;
  var $ = function (id) { return document.getElementById(id); };
  var state = { tabId: null, title: '', tracks: [], isPro: false };

  function setStatus(msg) { $('status').textContent = msg || ''; }

  function isProFormat(fmt) { return fmt !== 'txt'; }

  function refreshProUi() {
    $('proBadge').textContent = BSEi18n.t(state.isPro ? 'proActive' : 'proInactive');
    $('proBadge').className = 'badge ' + (state.isPro ? 'pro' : 'free');
    $('activateBtn').hidden = state.isPro;
  }

  function checkPro() {
    return api.storage.local.get(['bse_license_key', 'bse_default_format']).then(function (res) {
      state.isPro = !!(res.bse_license_key && BSELicense.validateKey(res.bse_license_key));
      refreshProUi();
      if (res.bse_default_format) $('formatSelect').value = res.bse_default_format;
    });
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    return api.downloads.download({ url: url, filename: filename, saveAs: false })
      .then(function () { setTimeout(function () { URL.revokeObjectURL(url); }, 10000); });
  }

  function fetchCues(trackId) {
    return api.tabs.sendMessage(state.tabId, { type: 'BSE_FETCH_TRACK', trackId: trackId });
  }

  function gatePro() {
    if (state.isPro) return true;
    setStatus(BSEi18n.t('needPro'));
    api.runtime.openOptionsPage();
    return false;
  }

  function doExport() {
    var fmt = $('formatSelect').value;
    var bilingual = $('bilingualCheck').checked;
    if ((isProFormat(fmt) || bilingual) && !gatePro()) return;
    var primaryId = $('trackSelect').value;
    var primary = state.tracks.filter(function (t) { return t.id === primaryId; })[0];
    if (!primary) return;
    setStatus(BSEi18n.t('exporting'));
    fetchCues(primaryId).then(function (cues) {
      if (bilingual) {
        var secondId = $('secondSelect').value;
        var second = state.tracks.filter(function (t) { return t.id === secondId; })[0];
        return fetchCues(secondId).then(function (cues2) {
          var merged = BSEConverter.mergeBilingual(cues, cues2);
          var name = BSEConverter.sanitizeFilename(state.title) + '-' + primary.lang +
            '+' + (second ? second.lang : '') + '-bilingual.' + fmt;
          return download(name, BSEConverter.convert(merged, fmt, { title: state.title }));
        });
      }
      var name = BSEConverter.sanitizeFilename(state.title) + '-' + primary.lang + '.' + fmt;
      return download(name, BSEConverter.convert(cues, fmt, { title: state.title }));
    }).then(function () {
      setStatus(BSEi18n.t('done'));
    }).catch(function (err) {
      setStatus(BSEi18n.t('failed') + (err && err.message ? err.message : err));
    });
  }

  function doBatch() {
    if (!gatePro()) return;
    var fmt = $('formatSelect').value;
    setStatus(BSEi18n.t('exporting'));
    var chain = Promise.resolve();
    state.tracks.forEach(function (tr) {
      chain = chain.then(function () {
        return fetchCues(tr.id).then(function (cues) {
          var name = BSEConverter.sanitizeFilename(state.title) + '-' + tr.lang + '.' + fmt;
          return download(name, BSEConverter.convert(cues, fmt, { title: state.title }));
        }).then(function () {
          return new Promise(function (r) { setTimeout(r, 350); }); // space out multiple downloads
        });
      });
    });
    chain.then(function () { setStatus(BSEi18n.t('done')); })
      .catch(function (err) { setStatus(BSEi18n.t('failed') + (err && err.message ? err.message : err)); });
  }

  function fillTrackSelects(tracks) {
    var mk = function (sel) {
      sel.innerHTML = '';
      tracks.forEach(function (tr) {
        var opt = document.createElement('option');
        opt.value = tr.id;
        opt.textContent = tr.label + (tr.lang ? ' (' + tr.lang + ')' : '') + (tr.kind === 'asr' ? ' · ASR' : '');
        sel.appendChild(opt);
      });
    };
    mk($('trackSelect'));
    mk($('secondSelect'));
    if (tracks.length > 1) $('secondSelect').selectedIndex = 1;
  }

  function init() {
    BSEi18n.init(function () {
      $('appName').textContent = BSEi18n.t('appName');
      $('tagline').textContent = BSEi18n.t('tagline');
      $('trackLabel').textContent = BSEi18n.t('trackLabel');
      $('formatLabel').textContent = BSEi18n.t('formatLabel');
      $('bilingualLabel').textContent = BSEi18n.t('bilingual');
      $('bilingualTrackLabel').textContent = BSEi18n.t('bilingualTrack');
      $('exportBtn').textContent = BSEi18n.t('exportBtn');
      $('batchBtn').textContent = BSEi18n.t('batchBtn') + ' 🔒';
      $('settingsLink').textContent = BSEi18n.t('settings');
      $('activateBtn').textContent = BSEi18n.t('activate');
      var buyUrl = (typeof BSE_CONFIG !== 'undefined' && BSE_CONFIG.TODO_BUY_URL) || '';
      if (buyUrl.indexOf('http') === 0) {
        $('buyBtn').textContent = BSEi18n.t('buy');
        $('buyBtn').disabled = false;
      } else {
        $('buyBtn').textContent = BSEi18n.t('buySoon');
        $('buyBtn').disabled = true;
      }
      checkPro();
      loadTracks();
    });
  }

  function loadTracks() {
    setStatus(BSEi18n.t('loading'));
    api.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      var tab = tabs && tabs[0];
      if (!tab || !tab.url || !/(youtube\.com\/watch|bilibili\.com\/video)/.test(tab.url)) {
        setStatus(BSEi18n.t('notSupported'));
        return;
      }
      state.tabId = tab.id;
      api.tabs.sendMessage(tab.id, { type: 'BSE_GET_TRACKS' }).then(function (res) {
        if (!res || !res.tracks || !res.tracks.length) {
          setStatus(BSEi18n.t('noTracks'));
          return;
        }
        state.title = res.title || '';
        state.tracks = res.tracks;
        $('videoTitle').textContent = state.title;
        fillTrackSelects(res.tracks);
        $('main').hidden = false;
        setStatus('');
      }).catch(function () {
        // Content script not reachable (page loaded before install?) — ask for a reload.
        setStatus(BSEi18n.t('failed') + 'content script not reachable; reload the page and try again');
      });
    });
  }

  $('exportBtn').addEventListener('click', doExport);
  $('batchBtn').addEventListener('click', doBatch);
  $('bilingualCheck').addEventListener('change', function () {
    $('secondField').hidden = !$('bilingualCheck').checked;
  });
  $('settingsLink').addEventListener('click', function (e) { e.preventDefault(); api.runtime.openOptionsPage(); });
  $('activateBtn').addEventListener('click', function () { api.runtime.openOptionsPage(); });
  $('buyBtn').addEventListener('click', function () {
    var buyUrl = (typeof BSE_CONFIG !== 'undefined' && BSE_CONFIG.TODO_BUY_URL) || '';
    if (buyUrl.indexOf('http') === 0) api.tabs.create({ url: buyUrl });
  });

  document.addEventListener('DOMContentLoaded', init);
})();
