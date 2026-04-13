import chokidar from 'chokidar'
import { readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
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
): chokidar.FSWatcher {
  const watchPath = resolve(layoutsDir, '*.yaml')

  const watcher = chokidar.watch(watchPath, {
    ignoreInitial: true,
    // Don't watch _presets/ subdirectory
    ignored: /_presets/,
  })

  watcher.on('change', (path) => {
    const scope = extractScope(path)
    if (scope) callback({ type: 'layout-changed', scope, source: 'external' })
  })

  watcher.on('add', (path) => {
    const scope = extractScope(path)
    if (scope) callback({ type: 'layout-added', scope, source: 'external' })
  })

  watcher.on('unlink', (path) => {
    // File is gone — extract scope from filename
    const name = basename(path, '.yaml')
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
    return basename(filePath, '.yaml')
  }
}
