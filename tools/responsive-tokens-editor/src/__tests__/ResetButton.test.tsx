// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ResetButton } from '../components/ResetButton'

describe('ResetButton — 3-second hold-to-confirm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('initial label "Hold to reset to defaults"', () => {
    render(<ResetButton onReset={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent('Hold to reset to defaults')
  })

  it('mouseDown + advance 3s → onReset called once', () => {
    const onReset = vi.fn()
    render(<ResetButton onReset={onReset} />)
    const btn = screen.getByRole('button')
    act(() => {
      fireEvent.mouseDown(btn)
    })
    act(() => {
      vi.advanceTimersByTime(3050)
    })
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('mouseDown + advance 1s + mouseUp → onReset NOT called; label resets', () => {
    const onReset = vi.fn()
    render(<ResetButton onReset={onReset} />)
    const btn = screen.getByRole('button')
    act(() => {
      fireEvent.mouseDown(btn)
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      fireEvent.mouseUp(btn)
    })
    expect(onReset).not.toHaveBeenCalled()
    expect(btn).toHaveTextContent('Hold to reset to defaults')
  })

  it('mouseLeave during hold cancels — onReset NOT called even after another 2s', () => {
    const onReset = vi.fn()
    render(<ResetButton onReset={onReset} />)
    const btn = screen.getByRole('button')
    act(() => {
      fireEvent.mouseDown(btn)
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      fireEvent.mouseLeave(btn)
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onReset).not.toHaveBeenCalled()
  })
})
