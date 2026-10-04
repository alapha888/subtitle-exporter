/* Bilingual Subtitle Exporter — MAIN-world helper for YouTube pages.
 * Runs in the page's main world so it can read window.ytInitialPlayerResponse.
 * Communicates with the isolated content script via CustomEvents carrying
 * JSON strings (structured data does not cross worlds reliably everywhere).
 */
(function () {
  'use strict';
  if (window.__bseYtMainInstalled) return;
  window.__bseYtMainInstalled = true;

  window.addEventListener('bse:yt-request', function () {
    var tracks = [];
    var title = document.title.replace(/ - YouTube$/, '');
    var videoId = null;
    try {
      var pr = window.ytInitialPlayerResponse;
      var list = pr && pr.captions && pr.captions.playerCaptionsTracklistRenderer &&
        pr.captions.playerCaptionsTracklistRenderer.captionTracks;
      if (Array.isArray(list)) {
        tracks = list.map(function (tr, i) {
          return {
            id: String(i),
            lang: tr.languageCode || '',
            label: (tr.name && (tr.name.simpleText || (tr.name.runs && tr.name.runs[0] && tr.name.runs[0].text))) || tr.languageCode || ('Track ' + (i + 1)),
            kind: tr.kind || '', // "asr" = auto-generated
            baseUrl: tr.baseUrl || ''
          };
        }).filter(function (tr) { return tr.baseUrl; });
      }
      if (pr && pr.videoDetails) {
        title = pr.videoDetails.title || title;
        videoId = pr.videoDetails.videoId || null;
      }
    } catch (e) { /* leave tracks empty; isolated script falls back to HTML parse */ }
    window.dispatchEvent(new CustomEvent('bse:yt-response', {
      detail: JSON.stringify({ tracks: tracks, title: title, videoId: videoId })
    }));
  });
})();
