/* Portal shell — drawer open/close controller.
 *
 * Single global handler for every drawer in the portal. Toggles body
 * classes that the shell CSS watches:
 *
 *   body.drawer-is-open          — any drawer open (hides peek/hamburger)
 *   body.drawer-is-open-left     — left sidebar slid in
 *   body.drawer-is-open-right    — right sidebar slid in
 *   body.drawer-mode-push        — any BP uses push mode (.layout-frame
 *                                   translates instead of overlay)
 *   .drawer-layer.is-open        — backdrop visible
 *
 * FAB triggers have a two-step open flow — the first click "arms"
 * the trigger (chevron flips, label appears); a second click or a
 * --drawer-fab-arm-timeout-ms wait opens the drawer. The armed
 * state is a class on the trigger element (.drawer-trigger--is-armed).
 *
 * Idempotent: listeners are attached once at document level so
 * drawers inserted via client-side route transitions still work.
 */

(function () {
  'use strict'

  if (typeof document === 'undefined') return
  if (document.__portalShellInit) return
  document.__portalShellInit = true

  const ARMED_CLASS = 'drawer-trigger--is-armed'
  const armTimers = { left: null, right: null }

  // Mirror the drawer-shell's data-drawer-mode onto body so shell CSS
  // rules that depend on "push" (.layout-frame content translate) can
  // fire. Read once on load; re-running is harmless.
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

  function getTrigger(side) {
    return document.querySelector('.drawer-trigger--' + side)
  }

  function clearArm(side) {
    const t = getTrigger(side)
    if (t) t.classList.remove(ARMED_CLASS)
    if (armTimers[side]) {
      clearTimeout(armTimers[side])
      armTimers[side] = null
    }
  }

  function clearBothArms() {
    clearArm('left')
    clearArm('right')
  }

  function openDrawer(side) {
    const other = side === 'left' ? 'right' : 'left'
    document.body.classList.remove('drawer-is-open-' + other)
    document.body.classList.add('drawer-is-open', 'drawer-is-open-' + side)
    const layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.add('is-open')
    clearBothArms()
  }

  function closeDrawer() {
    document.body.classList.remove(
      'drawer-is-open',
      'drawer-is-open-left',
      'drawer-is-open-right',
    )
    const layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.remove('is-open')
  }

  /** Is this trigger a FAB? Decided by class — FAB is the only
   *  variant with the arm-before-open flow. */
  function isFab(btn) {
    return btn.classList.contains('drawer-trigger--fab')
  }

  /** Read the arm timeout from --drawer-fab-arm-timeout on :root.
   *  Falls back to 2000ms if the token isn't defined (e.g. shell
   *  CSS not loaded yet). */
  function getArmTimeout() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--drawer-fab-arm-timeout')
      .trim()
    if (!raw) return 2000
    // Token is in ms (e.g. "2000ms"). Strip units.
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : 2000
  }

  /** Handle a click on a trigger. For peek/hamburger variants this
   *  is a direct toggle. For FAB it's the arm-then-open flow. */
  function handleTriggerClick(btn, side) {
    const alreadyOpenOnThisSide = document.body.classList.contains('drawer-is-open-' + side)

    if (alreadyOpenOnThisSide) {
      closeDrawer()
      return
    }

    if (!isFab(btn)) {
      openDrawer(side)
      return
    }

    // FAB path.
    if (btn.classList.contains(ARMED_CLASS)) {
      openDrawer(side)
      return
    }

    // Not armed yet — arm it, disarm the other side, start the
    // auto-open timer.
    const other = side === 'left' ? 'right' : 'left'
    clearArm(other)
    closeDrawer()
    btn.classList.add(ARMED_CLASS)
    armTimers[side] = setTimeout(() => openDrawer(side), getArmTimeout())
  }

  document.addEventListener('click', function (e) {
    var target = e.target
    if (!(target instanceof Element)) return

    var opener = target.closest('[data-drawer-open]')
    if (opener) {
      var side = opener.getAttribute('data-drawer-open')
      if (side === 'left' || side === 'right') {
        handleTriggerClick(opener, side)
        e.preventDefault()
      }
      return
    }

    var closer = target.closest('[data-drawer-close], .drawer-backdrop')
    if (closer) {
      closeDrawer()
      clearBothArms()
      e.preventDefault()
      return
    }

    // Click on anything else while armed — disarm. Matches the
    // reference behavior where tapping the content layer cancels
    // the pending auto-open.
    if (armTimers.left || armTimers.right) {
      clearBothArms()
    }
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDrawer()
      clearBothArms()
    }
  })
})()
