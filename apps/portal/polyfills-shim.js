// Replacement for next/dist/build/polyfills/polyfill-module.js.
// Our browserslist (Baseline 2023) already supports Array.at, Object.hasOwn,
// Object.fromEntries, Array.flat/flatMap, String.trim{Start,End}, Promise.finally
// natively. Only URL.canParse is younger than our Safari floor (Safari 17+,
// Chrome 120+, Firefox 115+) and still needs a shim for Safari 16 users.
if (typeof URL !== 'undefined' && !('canParse' in URL)) {
  URL.canParse = function (url, base) {
    try {
      return !!new URL(url, base)
    } catch (_) {
      return false
    }
  }
}
