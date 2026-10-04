/* Bilingual Subtitle Exporter — YouTube content script (isolated world).
 * Track list: asks the MAIN-world helper for ytInitialPlayerResponse data;
 * falls back to parsing the watch page HTML if the bridge does not answer.
 * Cues: fetches the track's timedtext URL with fmt=json3 and parses it.
 * Only handles subtitle tracks the page itself exposes; no DRM circumvention.
 */
(function () {
  'use strict';
  var api = (typeof browser !== 'undefined') ? browser : chrome;
  var trackCache = {}; // id -> track (with baseUrl)
  var cueCache = {};   // baseUrl -> cues

  function askMainWorld() {
    return new Promise(function (resolve) {
      var done = false;
      function onResp(ev) {
        if (done) return;
        done = true;
        window.removeEventListener('bse:yt-response', onResp);
        try { resolve(JSON.parse(ev.detail)); } catch (e) { resolve(null); }
      }
      window.addEventListener('bse:yt-response', onResp);
      window.dispatchEvent(new CustomEvent('bse:yt-request'));
      setTimeout(function () { if (!done) { done = true; window.removeEventListener('bse:yt-response', onResp); resolve(null); } }, 900);
    });
  }

  /** Fallback: extract captionTracks from the watch page HTML source. */
  function parseTracksFromHtml(html) {
    var idx = html.indexOf('"captionTracks":');
    if (idx === -1) return [];
    var start = html.indexOf('[', idx);
    if (start === -1) return [];
    var depth = 0, inStr = false, esc = false, end = -1;
    for (var i = start; i < html.length; i++) {
      var ch = html[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
      }
    }
    if (end === -1) return [];
    try {
      var arr = JSON.parse(html.slice(start, end));
      return arr.map(function (tr, j) {
        return {
          id: String(j),
          lang: tr.languageCode || '',
          label: (tr.name && tr.name.simpleText) || tr.languageCode || ('Track ' + (j + 1)),
          kind: tr.kind || '',
          baseUrl: tr.baseUrl || ''
        };
      }).filter(function (tr) { return tr.baseUrl; });
    } catch (e) { return []; }
  }

  function getTracks() {
    return askMainWorld().then(function (data) {
      if (data && data.tracks && data.tracks.length) {
        trackCache = {};
        data.tracks.forEach(function (tr) { trackCache[tr.id] = tr; });
        return { ok: true, site: 'youtube', title: data.title || document.title, tracks: data.tracks };
      }
      // Fallback: fetch the page HTML and parse captionTracks from it.
      return fetch(location.href, { credentials: 'include' })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var tracks = parseTracksFromHtml(html);
          trackCache = {};
          tracks.forEach(function (tr) { trackCache[tr.id] = tr; });
          var m = html.match(/<title>([^<]*) - YouTube<\/title>/);
          return { ok: true, site: 'youtube', title: m ? m[1] : document.title, tracks: tracks };
        });
    });
  }

  function fetchCues(trackId) {
    var tr = trackCache[trackId];
    if (!tr) return Promise.reject(new Error('track not found; reopen the popup'));
    if (cueCache[tr.baseUrl]) return Promise.resolve(cueCache[tr.baseUrl]);
    var url = tr.baseUrl;
    if (url.indexOf('fmt=') === -1) url += (url.indexOf('?') === -1 ? '?' : '&') + 'fmt=json3';
    return fetch(url, { credentials: 'include' })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        if (!text) throw new Error('empty subtitle response');
        var json = JSON.parse(text);
        var cues = BSEConverter.parseYoutubeJson3(json);
        if (!cues.length) throw new Error('no cues in subtitle response');
        cueCache[tr.baseUrl] = cues;
        return cues;
      });
  }

  api.runtime.onMessage.addListener(function (msg) {
    if (!msg || typeof msg.type !== 'string') return undefined;
    if (msg.type === 'BSE_GET_TRACKS') return getTracks();
    if (msg.type === 'BSE_FETCH_TRACK') return fetchCues(msg.trackId);
    return undefined;
  });
})();
