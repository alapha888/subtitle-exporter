/* Bilingual Subtitle Exporter — Pro license key validation (offline).
 * Key format: BSEP-XXXXXX-XXXXXX-CCCCCC
 *   payload  = first 12 chars (two groups of 6)
 *   checksum = last 6 chars, FNV-1a(payload + '|' + SECRET), 5 bits per char
 * This scheme is independent from any other product: own prefix, own alphabet,
 * own secret. Offline checksum validation is obfuscation-grade by design
 * (same trade-off as any client-side license check); keys are issued manually
 * by the private generator after an order is paid.
 */
(function (global) {
  'use strict';

  var ALPHABET = 'E9KMPQRSTUV8WXYZ0ABCD3FGHJ75N246'; // 32 chars, no I/L/O/1
  var SECRET = 'bsep-pro-v1-857520dda046e500378b414c';
  var PREFIX = 'BSEP';

  function fnv1a(str) {
    var hash = 0x811C9DC5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function checksumFor(payload) {
    var h = fnv1a(payload + '|' + SECRET);
    var out = '';
    for (var i = 0; i < 6; i++) {
      out += ALPHABET[h & 31];
      h >>>= 5;
    }
    return out;
  }

  /** Normalize user input: uppercase, strip spaces/dashes. */
  function normalizeKey(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /** Validate a key in any reasonable pasted form. Returns boolean. */
  function validateKey(raw) {
    var k = normalizeKey(raw);
    if (k.length !== PREFIX.length + 18) return false;
    if (k.slice(0, PREFIX.length) !== PREFIX) return false;
    var body = k.slice(PREFIX.length);
    for (var i = 0; i < body.length; i++) {
      if (ALPHABET.indexOf(body[i]) === -1) return false;
    }
    var payload = body.slice(0, 12);
    var checksum = body.slice(12, 18);
    return checksumFor(payload) === checksum;
  }

  /** Pretty form: BSEP-XXXXXX-XXXXXX-CCCCCC (input assumed normalized-valid or raw). */
  function formatKey(raw) {
    var k = normalizeKey(raw);
    if (k.length !== PREFIX.length + 18) return String(raw || '');
    var body = k.slice(PREFIX.length);
    return PREFIX + '-' + body.slice(0, 6) + '-' + body.slice(6, 12) + '-' + body.slice(12, 18);
  }

  var api = { validateKey: validateKey, formatKey: formatKey, normalizeKey: normalizeKey, PREFIX: PREFIX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BSELicense = api;
})(typeof self !== 'undefined' ? self : this);
