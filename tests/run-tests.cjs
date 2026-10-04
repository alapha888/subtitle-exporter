/* Self-tests for Bilingual Subtitle Exporter.
 * Run: node tests/run-tests.cjs
 * Covers: Bilibili/YouTube parsers, TXT/SRT/VTT/ASS conversion, bilingual
 * merge, filename sanitize, license round-trip against the private generator,
 * and manifest structural validity + referenced-file existence.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const C = require(path.join(ROOT, 'src/lib/converter.js'));
const L = require(path.join(ROOT, 'src/lib/license.js'));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

console.log('== Parsers ==');
const bili = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples/bilibili-sample.json'), 'utf8'));
const biliCues = C.parseBilibiliJson(bili);
check('bilibili cue count', biliCues.length === 3, 'got ' + biliCues.length);
check('bilibili cue[0]', eq(biliCues[0], { start: 0.62, end: 3.41, text: '大家好，欢迎来到本期视频' }), JSON.stringify(biliCues[0]));

const yt = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples/youtube-json3-sample.json'), 'utf8'));
const ytCues = C.parseYoutubeJson3(yt);
check('youtube cue count (window event skipped)', ytCues.length === 3, 'got ' + ytCues.length);
check('youtube cue[0] timing', ytCues[0].start === 0.62 && Math.abs(ytCues[0].end - 3.41) < 1e-9, JSON.stringify(ytCues[0]));
check('youtube cue[1] segs joined', ytCues[1].text === 'Today we talk about subtitle export', ytCues[1].text);

console.log('== Converters ==');
const txt = C.cuesToTxt(ytCues);
check('txt first line', txt.split('\n')[0] === 'Hello everyone, welcome back', txt.split('\n')[0]);
const srt = C.cuesToSrt(ytCues);
check('srt first block', srt.startsWith('1\n00:00:00,620 --> 00:00:03,410\nHello everyone, welcome back\n'), JSON.stringify(srt.slice(0, 80)));
const vtt = C.cuesToVtt(ytCues);
check('vtt header + dot ms', vtt.startsWith('WEBVTT\n') && vtt.includes('00:00:00.620 --> 00:00:03.410'));
const ass = C.cuesToAss(ytCues, 'Sample');
check('ass header', ass.includes('[Script Info]') && ass.includes('Style: Default,Arial,54'));
check('ass dialogue time format', ass.includes('Dialogue: 0,0:00:00.62,0:00:03.41,Default'), ass.split('\n').pop());
check('srt time fmt', C.formatSrtTime(3723.456) === '01:02:03,456', C.formatSrtTime(3723.456));
check('ass time fmt', C.formatAssTime(3723.456) === '1:02:03.46', C.formatAssTime(3723.456));

console.log('== Bilingual merge ==');
const merged = C.mergeBilingual(biliCues, ytCues);
check('merged count', merged.length === 3);
check('merged cue[0] two lines', merged[0].text === '大家好，欢迎来到本期视频\nHello everyone, welcome back', JSON.stringify(merged[0].text));
const mergedSrt = C.cuesToSrt(merged);
check('merged srt contains both languages', mergedSrt.includes('大家好，欢迎来到本期视频\nHello everyone, welcome back'));

console.log('== Filename ==');
check('sanitize strips illegal chars', C.sanitizeFilename('a/b:c*d?e"f<g>h|i') === 'a b c d e f g h i', C.sanitizeFilename('a/b:c*d?e"f<g>h|i'));
check('sanitize fallback', C.sanitizeFilename('///') === 'subtitle');

console.log('== License ==');
const GEN = path.join(ROOT, '..', '..', 'goals', 'first-self-owned-app-selection-and-validation',
  'hidden_files', 'gen-subtitle-exporter-license-key.mjs');
let genKey = null;
try {
  genKey = execFileSync('node', [GEN, 'SELFTEST'], { encoding: 'utf8' }).trim();
} catch (e) { /* generator not present in this checkout */ }
if (genKey) {
  check('generator key format', /^BSEP-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(genKey), genKey);
  check('generated key validates', L.validateKey(genKey) === true);
  check('lowercase paste validates', L.validateKey(genKey.toLowerCase()) === true);
  check('no-dash paste validates', L.validateKey(genKey.replace(/-/g, '')) === true);
  const tampered = genKey.slice(0, -1) + (genKey.endsWith('A') ? 'B' : 'A');
  check('tampered key rejected', L.validateKey(tampered) === false);
} else {
  console.log('  SKIP generator round-trip (private generator not in this checkout)');
}
check('MDPE key rejected (scheme independence)', L.validateKey('MDPE-ABCDEF-GHIJKL-MNOPQR') === false);
check('garbage rejected', L.validateKey('hello') === false && L.validateKey('') === false);

console.log('== Manifest ==');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
check('manifest_version 3', man.manifest_version === 3);
check('gecko id present', !!(man.browser_specific_settings && man.browser_specific_settings.gecko.id));
const refs = new Set();
(man.content_scripts || []).forEach(cs => (cs.js || []).forEach(f => refs.add(f)));
(man.background.scripts || []).forEach(f => refs.add(f));
refs.add(man.action.default_popup); refs.add(man.action.default_icon);
refs.add(man.options_ui.page);
Object.values(man.icons || {}).forEach(f => refs.add(f));
let missing = [];
refs.forEach(f => { if (!fs.existsSync(path.join(ROOT, f))) missing.push(f); });
check('all referenced files exist', missing.length === 0, missing.join(','));
// popup/options HTML script references resolve on disk
for (const htmlRel of ['src/popup/popup.html', 'src/options/options.html']) {
  const html = fs.readFileSync(path.join(ROOT, htmlRel), 'utf8');
  const dir = path.dirname(path.join(ROOT, htmlRel));
  for (const m of html.matchAll(/src="([^"]+)"/g)) {
    check(htmlRel + ' -> ' + m[1], fs.existsSync(path.resolve(dir, m[1])));
  }
}
const loc = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales/en/messages.json'), 'utf8'));
check('default_locale messages have appName/appDesc', !!(loc.appName && loc.appDesc));
check('manifest name/desc use locale msgs', man.name === '__MSG_appName__' && man.description === '__MSG_appDesc__');

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
