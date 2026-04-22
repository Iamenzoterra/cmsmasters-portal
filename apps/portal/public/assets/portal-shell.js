/* Portal shell — drawer open/close controller.
 *
 * Single global handler for every drawer in the portal. Toggles body
 * classes that the shell CSS + layout CSS watch:
 *
 *   body.drawer-is-open          — any drawer open (hides peek/hamburger)
 *   body.drawer-is-open-left     — left sidebar active
 *   body.drawer-is-open-right    — right sidebar active
 *   .drawer-layer.is-open        — backdrop visible (drawer mode only)
 *
 * Mode (drawer overlay vs. push content aside) is a per-BP concern.
 * Layout CSS emits mode-specific rules inside its @media block and
 * reads the above body classes; this script doesn't know or care
 * which mode is active at the current viewport.
 *
 * FAB triggers have a two-step open flow — the first click "arms"
 * the trigger (chevron flips, label appears); a second click or a
 * --drawer-fab-arm-timeout-ms wait opens the drawer. The armed
 * state is a body class (`body.drawer-armed-{side}`) so it stays
 * viewport-independent — one layout can render multiple variant
 * buttons per side (one per variant used across BPs), only one
 * visible per BP via @media display:none, and the armed rule can
 * fire on whichever one is live.
 *
 * Idempotent: listeners are attached once at document level so
 * drawers inserted via client-side route transitions still work.
 */

(function () {
  'use strict'

  if (typeof document === 'undefined') return
  if (document.__portalShellInit) return
  document.__portalShellInit = true

  const armTimers = { left: null, right: null }

  // Drawer mode (overlay vs push) and trigger variant are per-BP
  // concerns — layout CSS emits the mode/variant-specific rules
  // inside its @media block. No body.drawer-mode-* mirror needed;
  // this script only tracks open/close state and the FAB arm flow.
  //
  // Armed state lives on body (body.drawer-armed-{side}) rather
  // than on the trigger element, because a layout can render
  // multiple variant buttons per side (one per variant used across
  // BPs) — only one is visible at the active viewport via @media
  // display:none. A body-level flag avoids the controller having
  // to guess which of those buttons is currently clickable.

  function clearArm(side) {
    document.body.classList.remove('drawer-armed-' + side)
    if (armTimers[side]) {
      clearTimeout(armTimers[side])
      armTimers[side] = null
    }
  }

  function clearBothArms() {
    clearArm('left')
    clearArm('right')
  }

  function isArmed(side) {
    return document.body.classList.contains('drawer-armed-' + side)
  }

  // Scroll lock — Vaul pattern. Pin body with position:fixed and
  // the negative of the current scrollY as top, so the page stays
  // at the same visual position while the drawer owns the scroll.
  // On close we restore and window.scrollTo(0, saved) — overflow:
  // hidden alone leaks momentum on iOS Safari.
  let lockedScrollY = 0
  let lockedStyleCache = ''
  function isScrollLocked() {
    return document.body.hasAttribute('data-scroll-locked')
  }
  function lockBodyScroll() {
    if (isScrollLocked()) return
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0
    lockedStyleCache = document.body.getAttribute('style') || ''
    document.body.setAttribute('data-scroll-locked', '')
    document.body.style.position = 'fixed'
    document.body.style.top = '-' + lockedScrollY + 'px'
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
  }
  function unlockBodyScroll() {
    if (!isScrollLocked()) return
    document.body.removeAttribute('data-scroll-locked')
    if (lockedStyleCache) {
      document.body.setAttribute('style', lockedStyleCache)
    } else {
      document.body.removeAttribute('style')
    }
    lockedStyleCache = ''
    window.scrollTo(0, lockedScrollY)
  }

  function openDrawer(side) {
    const other = side === 'left' ? 'right' : 'left'
    document.body.classList.remove('drawer-is-open-' + other)
    document.body.classList.add('drawer-is-open', 'drawer-is-open-' + side)
    const layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.add('is-open')
    clearBothArms()
    lockBodyScroll()
  }

  function closeDrawer() {
    document.body.classList.remove(
      'drawer-is-open',
      'drawer-is-open-left',
      'drawer-is-open-right',
    )
    const layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.remove('is-open')
    unlockBodyScroll()
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

  /** Peek / hamburger / tab: one tap opens directly.
   *  FAB: two-step. First tap ARMS the trigger — pill grows, label
   *  ("Menu" / "Theme Details") fades in so user knows what they're
   *  about to open. Second tap (or --drawer-fab-arm-timeout auto-
   *  fire) opens the drawer. Tap same-side while open to close. */
  function handleTriggerClick(btn, side) {
    if (document.body.classList.contains('drawer-is-open-' + side)) {
      closeDrawer()
      clearBothArms()
      return
    }
    if (!isFab(btn)) {
      clearBothArms()
      openDrawer(side)
      return
    }
    if (isArmed(side)) {
      clearBothArms()
      openDrawer(side)
      return
    }
    var other = side === 'left' ? 'right' : 'left'
    clearArm(other)
    document.body.classList.add('drawer-armed-' + side)
    armTimers[side] = setTimeout(function () {
      armTimers[side] = null
      if (isArmed(side)) {
        clearArm(side)
        openDrawer(side)
      }
    }, getArmTimeout())
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

  // ───────── Swipe-to-close ─────────
  //
  // Drawer dismisses on a swipe AWAY from its open edge. Left drawer:
  // swipe left. Right drawer: swipe right. Horizontal gesture must
  // dominate vertical one so vertical panel scrolls don't accidentally
  // close it. Velocity OR distance threshold — matches Vaul tuning.
  const SWIPE_DISTANCE_RATIO = 0.25
  const SWIPE_VELOCITY = 0.35
  const SWIPE_MIN_DX = 40
  let pointer = null

  function getPushWidthPx() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--drawer-push-width').trim()
    if (raw.endsWith('%')) return window.innerWidth * (parseFloat(raw) / 100)
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : window.innerWidth * 0.8
  }

  document.addEventListener('pointerdown', function (e) {
    if (!document.body.classList.contains('drawer-is-open')) { pointer = null; return }
    if (e.pointerType === 'mouse' && e.button !== 0) { pointer = null; return }
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
  }, { passive: true })

  document.addEventListener('pointerup', function (e) {
    if (pointer === null || e.pointerId !== pointer.id) return
    const dx = e.clientX - pointer.x
    const dy = e.clientY - pointer.y
    const dt = Math.max(1, performance.now() - pointer.t)
    pointer = null

    if (Math.abs(dx) <= Math.abs(dy)) return
    if (Math.abs(dx) < SWIPE_MIN_DX) return

    const width = getPushWidthPx()
    const distanceOk = Math.abs(dx) > SWIPE_DISTANCE_RATIO * width
    const velocityOk = Math.abs(dx) / dt > SWIPE_VELOCITY
    if (!distanceOk && !velocityOk) return

    const body = document.body
    if (body.classList.contains('drawer-is-open-left') && dx < 0) {
      closeDrawer(); clearBothArms()
    } else if (body.classList.contains('drawer-is-open-right') && dx > 0) {
      closeDrawer(); clearBothArms()
    }
  }, { passive: true })

  document.addEventListener('pointercancel', function () { pointer = null }, { passive: true })
})()
