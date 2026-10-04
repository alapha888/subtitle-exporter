/* Bilingual Subtitle Exporter — subtitle format conversion library.
 * Pure functions, no DOM access. Works in extension pages/content scripts
 * (global `BSEConverter`) and in Node for tests (module.exports).
 * Cue model: { start: Number(seconds), end: Number(seconds), text: String }
 */
(function (global) {
  'use strict';

  function pad(n, w) {
    return String(n).padStart(w, '0');
  }

  /** seconds -> "HH:MM:SS,mmm" (SRT) */
  function formatSrtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var ms = Math.round(sec * 1000);
    var h = Math.floor(ms / 3600000); ms -= h * 3600000;
    var m = Math.floor(ms / 60000); ms -= m * 60000;
    var s = Math.floor(ms / 1000); ms -= s * 1000;
    return pad(h, 2) + ':' + pad(m, 2) + ':' + pad(s, 2) + ',' + pad(ms, 3);
  }

  /** seconds -> "HH:MM:SS.mmm" (WebVTT) */
  function formatVttTime(sec) {
    return formatSrtTime(sec).replace(',', '.');
  }

  /** seconds -> "H:MM:SS.cc" (ASS centiseconds) */
  function formatAssTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var cs = Math.round(sec * 100);
    var h = Math.floor(cs / 360000); cs -= h * 360000;
    var m = Math.floor(cs / 6000); cs -= m * 6000;
    var s = Math.floor(cs / 100); cs -= s * 100;
    return h + ':' + pad(m, 2) + ':' + pad(s, 2) + '.' + pad(cs, 2);
  }

  function cleanText(t) {
    return String(t == null ? '' : t).replace(/\u200b/g, '').replace(/[ \t]+/g, ' ').trim();
  }

  /** Bilibili subtitle JSON ({body:[{from,to,content}]}) -> cues */
  function parseBilibiliJson(json) {
    var body = (json && json.body) || [];
    var cues = [];
    for (var i = 0; i < body.length; i++) {
      var it = body[i];
      var text = cleanText(it.content);
      if (!text) continue;
      cues.push({ start: Number(it.from) || 0, end: Number(it.to) || 0, text: text });
    }
    cues.sort(function (a, b) { return a.start - b.start; });
    return cues;
  }

  /** YouTube timedtext json3 ({events:[{tStartMs,dDurationMs,segs:[{utf8}]}]}) -> cues */
  function parseYoutubeJson3(json) {
    var events = (json && json.events) || [];
    var cues = [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev.segs) continue; // window-style / metadata events have no segs
      var text = '';
      for (var j = 0; j < ev.segs.length; j++) text += (ev.segs[j].utf8 || '');
      text = text.replace(/\n/g, ' ');
      text = cleanText(text);
      if (!text) continue;
      var start = (ev.tStartMs || 0) / 1000;
      var end = start + (ev.dDurationMs || 0) / 1000;
      cues.push({ start: start, end: end, text: text });
    }
    cues.sort(function (a, b) { return a.start - b.start; });
    // End times of 0 (missing duration) fall back to next cue start.
    for (var k = 0; k < cues.length; k++) {
      if (cues[k].end <= cues[k].start) {
        cues[k].end = (k + 1 < cues.length) ? cues[k + 1].start : cues[k].start + 2;
      }
    }
    return cues;
  }

  /** Remove consecutive duplicate lines (YouTube ASR rolling captions repeat text). */
  function dedupeConsecutive(cues) {
    var out = [];
    for (var i = 0; i < cues.length; i++) {
      if (out.length && out[out.length - 1].text === cues[i].text) {
        out[out.length - 1].end = cues[i].end; // extend previous cue instead
        continue;
      }
      out.push({ start: cues[i].start, end: cues[i].end, text: cues[i].text });
    }
    return out;
  }

  function cuesToTxt(cues) {
    return dedupeConsecutive(cues).map(function (c) { return c.text; }).join('\n') + '\n';
  }

  function cuesToSrt(cues) {
    var out = [];
    for (var i = 0; i < cues.length; i++) {
      out.push(String(i + 1));
      out.push(formatSrtTime(cues[i].start) + ' --> ' + formatSrtTime(cues[i].end));
      out.push(cues[i].text);
      out.push('');
    }
    return out.join('\n');
  }

  function cuesToVtt(cues) {
    var out = ['WEBVTT', ''];
    for (var i = 0; i < cues.length; i++) {
      out.push(formatVttTime(cues[i].start) + ' --> ' + formatVttTime(cues[i].end));
      out.push(cues[i].text);
      out.push('');
    }
    return out.join('\n');
  }

  function escapeAssText(t) {
    return String(t).replace(/\{/g, '｛').replace(/\}/g, '｝').replace(/\n/g, '\\N');
  }

  function cuesToAss(cues, title) {
    var header = [
      '[Script Info]',
      'Title: ' + (title || 'Subtitle Export'),
      'ScriptType: v4.00+',
      'PlayResX: 1920',
      'PlayResY: 1080',
      'ScaledBorderAndShadow: yes',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      'Style: Default,Arial,54,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,30,1',
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
    ];
    var lines = header.slice();
    for (var i = 0; i < cues.length; i++) {
      lines.push('Dialogue: 0,' + formatAssTime(cues[i].start) + ',' + formatAssTime(cues[i].end) +
        ',Default,,0,0,0,,' + escapeAssText(cues[i].text));
    }
    return lines.join('\n') + '\n';
  }

  /**
   * Merge a secondary track into the primary one for bilingual export.
   * Each merged cue keeps the primary cue's timing and gets the overlapping
   * secondary text appended as a second line.
   */
  function mergeBilingual(primary, secondary) {
    var out = [];
    for (var i = 0; i < primary.length; i++) {
      var p = primary[i];
      var parts = [];
      for (var j = 0; j < secondary.length; j++) {
        var s = secondary[j];
        if (s.start < p.end && s.end > p.start) {
          if (parts.indexOf(s.text) === -1) parts.push(s.text);
        }
      }
      out.push({
        start: p.start,
        end: p.end,
        text: parts.length ? p.text + '\n' + parts.join(' ') : p.text
      });
    }
    return out;
  }

  /** Convert cues to the requested format string. format: txt|srt|vtt|ass */
  function convert(cues, format, opts) {
    opts = opts || {};
    switch (format) {
      case 'srt': return cuesToSrt(cues);
      case 'vtt': return cuesToVtt(cues);
      case 'ass': return cuesToAss(cues, opts.title);
      case 'txt':
      default: return cuesToTxt(cues);
    }
  }

  /** Make a string safe to use as a file name on common filesystems. */
  function sanitizeFilename(name) {
    var s = String(name || 'subtitle')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (s.length > 80) s = s.slice(0, 80).trim();
    return s || 'subtitle';
  }

  var api = {
    formatSrtTime: formatSrtTime,
    formatVttTime: formatVttTime,
    formatAssTime: formatAssTime,
    parseBilibiliJson: parseBilibiliJson,
    parseYoutubeJson3: parseYoutubeJson3,
    dedupeConsecutive: dedupeConsecutive,
    cuesToTxt: cuesToTxt,
    cuesToSrt: cuesToSrt,
    cuesToVtt: cuesToVtt,
    cuesToAss: cuesToAss,
    mergeBilingual: mergeBilingual,
    convert: convert,
    sanitizeFilename: sanitizeFilename
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BSEConverter = api;
})(typeof self !== 'undefined' ? self : this);
