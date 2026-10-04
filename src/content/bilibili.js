/* Bilingual Subtitle Exporter — Bilibili content script (isolated world).
 * Track list: resolves bvid -> aid/cid via the public web-interface/view API,
 * then reads the subtitle list from the official player API
 * (/x/player/wbi/v2, falling back to /x/player/v2) — the same endpoints the
 * Bilibili web player itself uses. Subtitle JSON comes from the subtitle_url
 * the API returns. Requests run on bilibili.com with the page's cookies;
 * nothing is downloaded except the subtitle JSON the player would load.
 */
(function () {
  'use strict';
  var api = (typeof browser !== 'undefined') ? browser : chrome;
  var trackCache = {}; // id -> track (with url)
  var cueCache = {};   // url -> cues

  function fetchJson(url) {
    return fetch(url, { credentials: 'include' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function parseVideoRef() {
    var m = location.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/);
    var p = new URLSearchParams(location.search).get('p');
    return { bvid: m ? m[1] : null, pageIndex: p ? Math.max(0, parseInt(p, 10) - 1) : 0 };
  }

  function getTracks() {
    var ref = parseVideoRef();
    if (!ref.bvid) return Promise.resolve({ ok: false, site: 'bilibili', title: document.title, tracks: [] });
    return fetchJson('https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(ref.bvid))
      .then(function (view) {
        if (!view || view.code !== 0 || !view.data) throw new Error('view api: ' + (view && view.message));
        var pages = view.data.pages || [];
        var page = pages[ref.pageIndex] || pages[0] || {};
        var aid = view.data.aid;
        var cid = page.cid || view.data.cid;
        var title = view.data.title || document.title;
        var base = 'aid=' + encodeURIComponent(aid) + '&cid=' + encodeURIComponent(cid);
        return fetchJson('https://api.bilibili.com/x/player/wbi/v2?' + base)
          .catch(function () { return fetchJson('https://api.bilibili.com/x/player/v2?' + base); })
          .then(function (player) {
            var subs = (player && player.data && player.data.subtitle && player.data.subtitle.subtitles) || [];
            var tracks = subs.filter(function (s) { return s.subtitle_url; }).map(function (s, i) {
              var url = s.subtitle_url;
              if (url.indexOf('//') === 0) url = 'https:' + url;
              return { id: String(i), lang: s.lan || '', label: s.lan_doc || s.lan || ('Track ' + (i + 1)), kind: s.type === 1 ? 'ai' : '', url: url };
            });
            trackCache = {};
            tracks.forEach(function (tr) { trackCache[tr.id] = tr; });
            return { ok: true, site: 'bilibili', title: title, tracks: tracks };
          });
      });
  }

  function fetchCues(trackId) {
    var tr = trackCache[trackId];
    if (!tr) return Promise.reject(new Error('track not found; reopen the popup'));
    if (cueCache[tr.url]) return Promise.resolve(cueCache[tr.url]);
    return fetch(tr.url, { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        var cues = BSEConverter.parseBilibiliJson(json);
        if (!cues.length) throw new Error('no cues in subtitle response');
        cueCache[tr.url] = cues;
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
