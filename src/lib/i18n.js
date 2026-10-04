/* Bilingual Subtitle Exporter — tiny runtime i18n (zh-CN / en).
 * Language preference stored in browser.storage.local under 'bse_lang':
 * 'auto' (default, follow browser UI language), 'zh', or 'en'.
 */
(function (global) {
  'use strict';

  var STRINGS = {
    zh: {
      appName: '双语字幕导出助手',
      tagline: '导出 YouTube / Bilibili 视频字幕',
      notSupported: '当前页面不支持。请打开 YouTube 或 Bilibili 的视频播放页。',
      loading: '正在读取字幕轨道…',
      noTracks: '这个视频没有找到可用字幕。',
      trackLabel: '字幕轨道',
      formatLabel: '导出格式',
      bilingual: '双语对照导出',
      bilingualTrack: '第二语言轨道',
      exportBtn: '导出字幕',
      batchBtn: '批量导出全部轨道',
      proOnly: 'Pro 功能',
      proActive: 'Pro 已激活',
      proInactive: '免费版（仅 TXT）',
      activate: '激活 Pro',
      buy: '购买 Pro 激活码',
      buySoon: '购买入口即将上线',
      exporting: '正在导出…',
      done: '导出完成',
      failed: '导出失败：',
      needPro: '该功能需要 Pro。已在设置页打开激活入口。',
      settings: '设置',
      optTitle: '双语字幕导出助手 · 设置',
      optLang: '界面语言',
      optLangAuto: '自动（跟随浏览器）',
      optDefaultFormat: '默认导出格式',
      optLicense: 'Pro 激活码',
      optLicensePlaceholder: 'BSEP-XXXXXX-XXXXXX-XXXXXX',
      optActivate: '激活',
      optDeactivate: '取消激活',
      optKeyOk: '激活成功，Pro 功能已开启。',
      optKeyBad: '激活码无效，请检查后重试。',
      optKeyNone: '尚未激活。免费版可导出 TXT。',
      optBuyText: '在爱发电购买激活码后，在此输入即可激活。',
      optAbout: '本插件只在本地处理字幕数据，不上传任何内容。字幕仅来自视频页面已加载的轨道。'
    },
    en: {
      appName: 'Bilingual Subtitle Exporter',
      tagline: 'Export subtitles from YouTube / Bilibili videos',
      notSupported: 'Not supported on this page. Open a YouTube or Bilibili video page.',
      loading: 'Loading subtitle tracks…',
      noTracks: 'No subtitles found for this video.',
      trackLabel: 'Subtitle track',
      formatLabel: 'Export format',
      bilingual: 'Bilingual export',
      bilingualTrack: 'Second language track',
      exportBtn: 'Export subtitles',
      batchBtn: 'Batch export all tracks',
      proOnly: 'Pro feature',
      proActive: 'Pro active',
      proInactive: 'Free (TXT only)',
      activate: 'Activate Pro',
      buy: 'Buy a Pro license key',
      buySoon: 'Purchase link coming soon',
      exporting: 'Exporting…',
      done: 'Export finished',
      failed: 'Export failed: ',
      needPro: 'This feature needs Pro. Opening settings so you can activate.',
      settings: 'Settings',
      optTitle: 'Bilingual Subtitle Exporter · Settings',
      optLang: 'Interface language',
      optLangAuto: 'Auto (browser language)',
      optDefaultFormat: 'Default export format',
      optLicense: 'Pro license key',
      optLicensePlaceholder: 'BSEP-XXXXXX-XXXXXX-XXXXXX',
      optActivate: 'Activate',
      optDeactivate: 'Deactivate',
      optKeyOk: 'Activated. Pro features are on.',
      optKeyBad: 'Invalid key. Please check and try again.',
      optKeyNone: 'Not activated. The free version exports TXT.',
      optBuyText: 'Buy a license key on Afdian, then enter it here to activate.',
      optAbout: 'This extension processes subtitles locally in your browser and uploads nothing. Subtitles come only from tracks already loaded by the video page.'
    }
  };

  var current = 'en';

  function detect(pref) {
    if (pref === 'zh' || pref === 'en') return pref;
    var ui = 'en';
    try {
      ui = (typeof browser !== 'undefined' && browser.i18n && browser.i18n.getUILanguage()) ||
           (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage()) ||
           navigator.language || 'en';
    } catch (e) { /* keep en */ }
    return /^zh/i.test(ui) ? 'zh' : 'en';
  }

  /** Resolve the active language from storage, then call cb(lang). */
  function init(cb) {
    var api = (typeof browser !== 'undefined') ? browser : chrome;
    try {
      api.storage.local.get('bse_lang').then(function (res) {
        current = detect(res && res.bse_lang);
        if (cb) cb(current);
      }).catch(function () { current = detect('auto'); if (cb) cb(current); });
    } catch (e) {
      current = detect('auto');
      if (cb) cb(current);
    }
  }

  function t(key) {
    return (STRINGS[current] && STRINGS[current][key]) || STRINGS.en[key] || key;
  }

  var apiObj = { init: init, t: t, detect: detect, get lang() { return current; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = apiObj;
  global.BSEi18n = apiObj;
})(typeof self !== 'undefined' ? self : this);
