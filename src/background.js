/* Bilingual Subtitle Exporter — background script (Firefox MV3 event page).
 * Intentionally minimal: all work happens in the popup and content scripts.
 * This script exists so the manifest has a valid background entry and gives
 * future features (context menus, keyboard shortcuts) a home.
 */
(function () {
  'use strict';
  var api = (typeof browser !== 'undefined') ? browser : chrome;
  if (api && api.runtime && api.runtime.onInstalled) {
    api.runtime.onInstalled.addListener(function () {
      // No telemetry, no remote calls on install. Defaults are read lazily.
    });
  }
})();
