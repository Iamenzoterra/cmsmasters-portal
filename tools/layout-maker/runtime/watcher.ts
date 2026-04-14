import chokidar, { type FSWatcher } from 'chokidar'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

export interface WatcherEvent {
  type: 'layout-changed' | 'layout-added' | 'layout-deleted'
  scope: string
  source: 'external'
}

type WatcherCallback = (event: WatcherEvent) => void

/** Start watching layouts/*.yaml for changes */
export function startWatcher(
  layoutsDir: string,
  callback: WatcherCallback,
): FSWatcher {
  // Watch directory (not glob) for cross-platform compatibility
  const watcher = chokidar.watch(layoutsDir, {
    ignoreInitial: true,
    ignored: /_presets/,
    // Polling needed for reliable detection on Windows
    usePolling: true,
    interval: 500,
    depth: 0,
  })

  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.yaml')) return
    const scope = extractScope(filePath)
    if (scope) callback({ type: 'layout-changed', scope, source: 'external' })
  })

  watcher.on('add', (filePath) => {
    if (!filePath.endsWith('.yaml')) return
    const scope = extractScope(filePath)
    if (scope) callback({ type: 'layout-added', scope, source: 'external' })
  })

  watcher.on('unlink', (filePath) => {
    if (!filePath.endsWith('.yaml')) return
    const name = path.basename(filePath, '.yaml')
    callback({ type: 'layout-deleted', scope: name, source: 'external' })
  })

  return watcher
}

/** Extract scope from a YAML file by parsing it */
function extractScope(filePath: string): string | null {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = yaml.load(raw) as Record<string, unknown>
    return (parsed?.scope as string) ?? null
  } catch {
    // File might be mid-write — use filename as fallback
    return path.basename(filePath, '.yaml')
  }
}
