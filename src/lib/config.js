/* Bilingual Subtitle Exporter — shared config.
 * TODO_BUY_URL: placeholder for the future Afdian product page of THIS
 * extension's Pro license key. Do NOT point it at another product's page.
 * When the Afdian item for this extension exists, replace the value with its
 * https://afdian.com/item/... URL. UI code treats any value not starting
 * with "http" as "not yet available" and shows a "coming soon" state.
 */
(function (global) {
  'use strict';
  global.BSE_CONFIG = {
    TODO_BUY_URL: '#TODO_BUY_URL'
  };
})(typeof self !== 'undefined' ? self : this);
