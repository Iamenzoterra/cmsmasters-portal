/* Portal shell — drawer open/close controller.
 *
 * Single global handler for every drawer in the portal. Layouts only
 * emit triggers + backdrop markup in .drawer-shell; the sidebar
 * element itself (data-drawer-side="left"|"right" on the same grid
 * <aside> that lived as a column at desktop) is what slides in. This
 * script toggles body classes that the shell CSS and the per-layout
 * media query watch for.
 *
 * Contracts:
 *   - Trigger: [data-drawer-open="left"|"right"].
 *   - Close:   [data-drawer-close] OR .drawer-backdrop OR Esc.
 *   - State:
 *       body.drawer-is-open          — any drawer open (hides triggers)
 *       body.drawer-is-open-left     — left sidebar slid in
 *       body.drawer-is-open-right    — right sidebar slid in
 *       .drawer-layer.is-open        — backdrop visible
 *
 * Idempotent: listeners are attached once at document level, so
 * drawers inserted via client-side route transitions still work.
 */

(function () {
  'use strict'

  if (typeof document === 'undefined') return
  if (document.__portalShellInit) return
  document.__portalShellInit = true

  // Mirror the drawer-shell's mode onto body so shell CSS rules that
  // depend on "push" (.layout-frame content translate) can fire. The
  // layout HTML declares the mode via data-drawer-mode="push"; we lift
  // it to body on load so CSS selectors can use a single global hook.
  function syncMode() {
    const shell = document.querySelector('.drawer-shell')
    const mode = shell ? shell.getAttribute('data-drawer-mode') : null
    document.body.classList.toggle('drawer-mode-push', mode === 'push')
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncMode)
  } else {
    syncMode()
  }

  function openDrawer(side) {
    closeDrawer() // ensure the other side isn't left open
    document.body.classList.add('drawer-is-open', 'drawer-is-open-' + side)
    const layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.add('is-open')
  }

  function closeDrawer() {
    document.body.classList.remove('drawer-is-open', 'drawer-is-open-left', 'drawer-is-open-right')
    const layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.remove('is-open')
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

    var closer = t.closest('[data-drawer-close], .drawer-backdrop')
    if (closer) {
      closeDrawer()
      e.preventDefault()
    }
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer()
  })
})()
