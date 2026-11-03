import EventEmitter from "node:events";
import chokidar, { type FSWatcher } from "chokidar";

class StoreEventHub extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  startWatching(dataDir: string): void {
    if (this.watcher) return;

    this.watcher = chokidar.watch(dataDir, {
      ignored: [/(^|[\/\\])\../, /views/], // ignore dotfiles (.lock) and views/
      persistent: true,
      ignoreInitial: true,
    });

    const notify = () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.emit("change", { timestamp: Date.now() });
      }, 200);
    };

    this.watcher.on("add", notify);
    this.watcher.on("change", notify);
    this.watcher.on("unlink", notify);
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export const storeEvents = new StoreEventHub();
