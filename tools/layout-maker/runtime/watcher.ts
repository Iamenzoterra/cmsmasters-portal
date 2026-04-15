import chokidar, { type FSWatcher } from 'chokidar'
import path from 'node:path'

export interface WatcherEvent {
  type: 'layout-changed' | 'layout-added' | 'layout-deleted'
  id: string
  source: 'external'
}

type WatcherCallback = (event: WatcherEvent) => void

/** Start watching layouts/*.yaml for changes */
export function startWatcher(
  layoutsDir: string,
  callback: WatcherCallback,
): FSWatcher {
  const watcher = chokidar.watch(layoutsDir, {
    ignoreInitial: true,
    ignored: /_presets/,
    usePolling: true,
    interval: 500,
    depth: 0,
  })

  const emit = (type: WatcherEvent['type'], filePath: string) => {
    if (!filePath.endsWith('.yaml') && !filePath.endsWith('.yml')) return
    const id = path.basename(filePath).replace(/\.ya?ml$/, '')
    callback({ type, id, source: 'external' })
  }

  watcher.on('change', (p) => emit('layout-changed', p))
  watcher.on('add', (p) => emit('layout-added', p))
  watcher.on('unlink', (p) => emit('layout-deleted', p))

  return watcher
}
