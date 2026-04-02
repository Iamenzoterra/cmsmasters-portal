/**
 * animate-utils.js — Shared behavioral animation utilities for Portal blocks.
 * ES module, browser-native APIs only, compositor-safe (transform + opacity only).
 * ADR-023: Block Animation Architecture — Layer 2.
 */

/**
 * Mouse-tracking parallax on child elements.
 * @param {HTMLElement} container
 * @param {NodeList|HTMLElement[]} targets
 * @param {{ strength?: number, resetOnLeave?: boolean }} [opts]
 */
export function trackMouse(container, targets, opts = {}) {
  const { strength = 20, resetOnLeave = true } = opts
  const elems = Array.from(targets)

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    for (const el of elems) {
      const s = parseFloat(el.dataset.parallax || String(strength))
      el.style.transform = `translate(${x * s}px, ${y * s}px)`
    }
  })

  if (resetOnLeave) {
    container.addEventListener('mouseleave', () => {
      for (const el of elems) el.style.transform = ''
    })
  }
}

/**
 * Magnetic attraction — element shifts toward cursor on hover, snaps back on leave.
 * @param {HTMLElement} element
 * @param {{ strength?: number }} [opts]
 */
export function magnetic(element, opts = {}) {
  const { strength = 0.3 } = opts

  element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    element.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  })

  element.addEventListener('mouseleave', () => {
    element.style.transform = ''
  })
}

/**
 * Stagger animation via Web Animations API.
 * @param {HTMLElement[]|NodeList} elements
 * @param {Keyframe[]} keyframes
 * @param {{ duration?: number, delay?: number, easing?: string, fill?: string }} [opts]
 */
export function stagger(elements, keyframes, opts = {}) {
  const {
    duration = 600,
    delay = 80,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill = 'forwards',
  } = opts

  Array.from(elements).forEach((el, i) => {
    el.animate(keyframes, { duration, delay: i * delay, easing, fill })
  })
}

/**
 * Spring physics interpolation. Calls callback each frame until settled.
 * @param {number} from
 * @param {number} to
 * @param {(value: number) => void} callback
 * @param {{ stiffness?: number, damping?: number }} [opts]
 * @returns {{ stop: () => void }}
 */
export function spring(from, to, callback, opts = {}) {
  const { stiffness = 0.15, damping = 0.8 } = opts
  let value = from
  let velocity = 0
  let raf = 0

  function tick() {
    velocity = (velocity + (to - value) * stiffness) * damping
    value += velocity
    callback(value)
    if (Math.abs(velocity) > 0.01 || Math.abs(to - value) > 0.01) {
      raf = requestAnimationFrame(tick)
    } else {
      callback(to)
    }
  }

  raf = requestAnimationFrame(tick)
  return { stop: () => cancelAnimationFrame(raf) }
}

/**
 * Fire callback when element enters viewport. Once by default.
 * @param {HTMLElement} element
 * @param {(el: HTMLElement) => void} callback
 * @param {{ threshold?: number, rootMargin?: string, once?: boolean }} [opts]
 * @returns {{ disconnect: () => void }}
 */
export function onVisible(element, callback, opts = {}) {
  const { threshold = 0.15, rootMargin = '0px', once = true } = opts
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        callback(entry.target)
        if (once) observer.unobserve(entry.target)
      }
    }
  }, { threshold, rootMargin })
  observer.observe(element)
  return { disconnect: () => observer.disconnect() }
}
