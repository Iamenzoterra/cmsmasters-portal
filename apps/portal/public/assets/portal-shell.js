/* Portal shell — drawer open/close controller.
 *
 * Single global handler for every drawer in the portal. Layouts only
 * emit markup (triggers + layer + panels) with shell class names; the
 * visual styling lives in packages/ui/src/portal/portal-shell.css; this
 * script toggles .is-open / .is-active / body.drawer-is-open.
 *
 * Contracts:
 *   - Trigger: any element with [data-drawer-open="left"|"right"].
 *   - Close: any element with [data-drawer-close], plus Esc key, plus
 *            click on .drawer-backdrop.
 *   - State: .drawer-layer.is-open (layer visible), .drawer-panel.is-active
 *            (panel slid in), body.drawer-is-open (triggers fade out).
 *
 * Idempotent: listeners are attached to document once, so drawers
 * inserted later (e.g. via client-side route transitions) still work
 * without re-binding.
 */

(function () {
  'use strict'

  if (typeof document === 'undefined') return
  if (document.__portalShellInit) return
  document.__portalShellInit = true

  function getLayer() {
    return document.querySelector('.drawer-layer')
  }

  function openDrawer(side) {
    var layer = getLayer()
    if (!layer) return
    var panels = layer.querySelectorAll('.drawer-panel')
    panels.forEach(function (p) { p.classList.remove('is-active') })
    var target = layer.querySelector('.drawer-panel--' + side)
    if (target) target.classList.add('is-active')
    layer.classList.add('is-open')
    document.body.classList.add('drawer-is-open')
  }

  function closeDrawer() {
    var layer = getLayer()
    if (!layer) return
    layer.classList.remove('is-open')
    document.body.classList.remove('drawer-is-open')
    // Keep .is-active during the transition so the panel slides out,
    // then strip it so both panels sit fully off-canvas again.
    setTimeout(function () {
      var panels = layer.querySelectorAll('.drawer-panel')
      panels.forEach(function (p) { p.classList.remove('is-active') })
    }, 450)
  }

  document.addEventListener('click', function (e) {
    var t = e.target
    if (!(t instanceof Element)) return

    var opener = t.closest('[data-drawer-open]')
    if (opener) {
      var side = opener.getAttribute('data-drawer-open')
      if (side === 'left' || side === 'right') {
        openDrawer(side)
        e.preventDefault()
      }
      return
    }

    var closer = t.closest('[data-drawer-close], .drawer-backdrop, .drawer-close')
    if (closer) {
      closeDrawer()
      e.preventDefault()
    }
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer()
  })
})()
