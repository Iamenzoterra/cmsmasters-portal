/* Portal shell — drawer open/close controller.
 *
 * One global handler for every drawer in the portal. Toggles body
 * classes that the shell CSS + layout CSS watch:
 *
 *   body.drawer-is-open          — any drawer open (lock page scroll)
 *   body.drawer-is-open-left     — left sidebar active
 *   body.drawer-is-open-right    — right sidebar active
 *   .drawer-layer.is-open        — backdrop visible (drawer mode only)
 *
 * Mode (drawer overlay vs. push content aside) is a per-BP concern.
 * Layout CSS emits mode-specific rules inside its @media block and
 * reads the body classes; this script doesn't know or care which
 * mode is active at the current viewport.
 *
 * Scroll lock follows the Vaul pattern: on open we save scrollY and
 * pin body with position:fixed + top:-scrollY. On close we restore
 * and window.scrollTo(saved). This prevents iOS momentum / rubber-
 * band scroll from leaking through while the drawer is open, and
 * restores the exact scroll position on close — plain `overflow:
 * hidden` on body is not enough on iOS Safari.
 *
 * Swipe-to-close uses pointer events on document, with a velocity
 * threshold AND a distance threshold. Horizontal gesture must
 * dominate the vertical one to qualify. Panel CSS sets
 * `touch-action: pan-y` so horizontal gestures don't get captured
 * by panel scroll — they bubble up to this handler.
 *
 * Idempotent: listeners attach once at document level so drawers
 * inserted via client-side route transitions still work.
 */

(function () {
  'use strict'

  if (typeof document === 'undefined') return
  if (document.__portalShellInit) return
  document.__portalShellInit = true

  // ───────── Scroll lock (Vaul pattern) ─────────
  //
  // Saves + restores the scroll position around open/close so iOS
  // doesn't "jump to top" when body becomes fixed. Only lock when
  // transitioning from no-drawer-open → drawer-open.
  var lockedScrollY = 0
  var lockedStyleCache = ''

  function isLocked() {
    return document.body.style.position === 'fixed' && document.body.hasAttribute('data-scroll-locked')
  }

  function lockScroll() {
    if (isLocked()) return
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0
    lockedStyleCache = document.body.getAttribute('style') || ''
    document.body.setAttribute('data-scroll-locked', '')
    document.body.style.position = 'fixed'
    document.body.style.top = '-' + lockedScrollY + 'px'
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
  }

  function unlockScroll() {
    if (!isLocked()) return
    document.body.removeAttribute('data-scroll-locked')
    if (lockedStyleCache) {
      document.body.setAttribute('style', lockedStyleCache)
    } else {
      document.body.removeAttribute('style')
    }
    lockedStyleCache = ''
    window.scrollTo(0, lockedScrollY)
  }

  // ───────── Open / close ─────────
  //
  // lockScroll MUST run before the state classes are added, so body's
  // position goes fixed BEFORE the margin-transition CSS kicks in.
  // Otherwise the margin starts animating on a static body, then
  // jumps when position flips to fixed — visible glitch.
  function openDrawer(side) {
    lockScroll()
    var body = document.body
    var other = side === 'left' ? 'right' : 'left'
    body.classList.remove('drawer-is-open-' + other)
    body.classList.add('drawer-is-open', 'drawer-is-open-' + side)
    var layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.add('is-open')
  }

  function getPushDurationMs() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--drawer-push-content-duration')
      .trim()
    var n = parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : 520
  }

  function closeDrawer() {
    var body = document.body
    var wasOpen = body.classList.contains('drawer-is-open')
    body.classList.remove('drawer-is-open', 'drawer-is-open-left', 'drawer-is-open-right')
    var layer = document.querySelector('.drawer-layer')
    if (layer) layer.classList.remove('is-open')
    if (!wasOpen) return
    // Keep body fixed while the margin animates back to 0 — flipping
    // it to static mid-transition would cause a visible jump. Unlock
    // after the transition settles, which also restores the saved
    // scrollY via window.scrollTo.
    setTimeout(unlockScroll, getPushDurationMs() + 30)
  }

  function toggleDrawer(side) {
    if (document.body.classList.contains('drawer-is-open-' + side)) {
      closeDrawer()
    } else {
      openDrawer(side)
    }
  }

  // ───────── Trigger clicks (all variants — one tap open) ─────────
  //
  // Peek/tab/hamburger/fab all treated the same way: click opens the
  // drawer on the declared side; clicking the same-side trigger while
  // open closes it. No arm-then-open two-step — a single tap is the
  // expected behavior on mobile, and prevents the FAB from growing
  // into a pill (the "trigger resizes" complaint).
  document.addEventListener('click', function (e) {
    var target = e.target
    if (!(target instanceof Element)) return

    var opener = target.closest('[data-drawer-open]')
    if (opener) {
      var side = opener.getAttribute('data-drawer-open')
      if (side === 'left' || side === 'right') {
        toggleDrawer(side)
        e.preventDefault()
      }
      return
    }

    var closer = target.closest('[data-drawer-close], .drawer-backdrop')
    if (closer) {
      closeDrawer()
      e.preventDefault()
    }
  })

  // ───────── Keyboard ─────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer()
  })

  // ───────── Swipe-to-close (pointer events, with velocity) ─────────
  //
  // Horizontal gestures on the panel reach this handler because the
  // panel's touch-action: pan-y lets horizontal motion through. We
  // require motion to be mostly horizontal, and beyond either a
  // distance OR a velocity threshold — matches Vaul's tuning.
  var SWIPE_CLOSE_DISTANCE_RATIO = 0.25   // fraction of push-width
  var SWIPE_CLOSE_VELOCITY = 0.35         // px per ms
  var SWIPE_MIN_DX = 40                   // minimum absolute px
  var pointer = null

  function getPushWidth() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--drawer-push-width')
      .trim()
    if (raw.endsWith('%')) {
      return window.innerWidth * (parseFloat(raw) / 100)
    }
    var n = parseFloat(raw)
    return Number.isFinite(n) ? n : window.innerWidth * 0.8
  }

  document.addEventListener(
    'pointerdown',
    function (e) {
      if (!document.body.classList.contains('drawer-is-open')) {
        pointer = null
        return
      }
      if (e.pointerType === 'mouse' && e.button !== 0) {
        pointer = null
        return
      }
      pointer = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
      }
    },
    { passive: true },
  )

  document.addEventListener(
    'pointerup',
    function (e) {
      if (pointer === null || e.pointerId !== pointer.id) return
      var dx = e.clientX - pointer.x
      var dy = e.clientY - pointer.y
      var dt = Math.max(1, performance.now() - pointer.t)
      pointer = null

      if (Math.abs(dx) <= Math.abs(dy)) return
      if (Math.abs(dx) < SWIPE_MIN_DX) return

      var pushWidth = getPushWidth()
      var distanceEnough = Math.abs(dx) > SWIPE_CLOSE_DISTANCE_RATIO * pushWidth
      var velocityEnough = Math.abs(dx) / dt > SWIPE_CLOSE_VELOCITY
      if (!distanceEnough && !velocityEnough) return

      var body = document.body
      if (body.classList.contains('drawer-is-open-left') && dx < 0) {
        closeDrawer()
      } else if (body.classList.contains('drawer-is-open-right') && dx > 0) {
        closeDrawer()
      }
    },
    { passive: true },
  )

  document.addEventListener(
    'pointercancel',
    function () { pointer = null },
    { passive: true },
  )
})()
