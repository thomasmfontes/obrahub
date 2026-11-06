export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface Entry {
  value: unknown;
  fingerprint: string;
  confirmed?: string;
  revision: number;
  dirty: boolean;
  failed: boolean;
  requested: boolean;
  write: (value: any) => Promise<unknown>;
  timer?: ReturnType<typeof setTimeout>;
}

// Serialize writes and acknowledge only the revision actually confirmed by the server.
export class SaveQueue {
  private entries = new Map<string, Entry>();
  private running: Promise<void> | null = null;
  private disposed = false;
  private confirmedAny = false;

  constructor(private notify: (status: SaveStatus) => void) {}

  get hasPending() { return [...this.entries.values()].some(entry => entry.dirty); }

  private emit() {
    if (this.disposed) return;
    const entries = [...this.entries.values()];
    this.notify(entries.some(entry => entry.failed) ? 'error'
      : this.running ? 'saving'
      : this.hasPending ? 'pending'
      : this.confirmedAny ? 'saved' : 'idle');
  }

  update<T>(key: string, value: T, write: (value: T) => Promise<unknown>, delay = 600) {
    if (this.disposed) return;
    const fingerprint = JSON.stringify(value);
    let entry = this.entries.get(key);
    if (entry?.fingerprint === fingerprint) return;
    if (entry?.timer) clearTimeout(entry.timer);
    entry = {
      value, fingerprint, confirmed: entry?.confirmed,
      revision: (entry?.revision ?? 0) + 1,
      dirty: true, failed: false, requested: false, write,
    };
    this.entries.set(key, entry);
    entry.timer = setTimeout(() => {
      entry!.timer = undefined;
      entry!.requested = true;
      void this.drain();
    }, delay);
    this.emit();
  }

  private drain(): Promise<void> {
    if (this.running) return this.running;
    if (this.disposed) return Promise.resolve();
    // Start on the next microtask so running is assigned before state notifications.
    this.running = Promise.resolve().then(async () => {
      this.emit();
      while (!this.disposed) {
        const next = [...this.entries.entries()].find(([, entry]) => entry.dirty && entry.requested);
        if (!next) break;
        const [key, entry] = next;
        entry.requested = false;
        const revision = entry.revision;
        try {
          await entry.write(entry.value);
          this.confirmedAny = true;
          const latest = this.entries.get(key)!;
          latest.confirmed = entry.fingerprint;
          if (latest.revision === revision) {
            latest.dirty = false;
            latest.failed = false;
          } else {
            // An edit made during this request still needs its own confirmation.
            if (latest.timer) clearTimeout(latest.timer);
            latest.timer = undefined;
            latest.requested = true;
          }
        } catch {
          const latest = this.entries.get(key)!;
          latest.failed = true;
          latest.requested = false;
          if (latest.timer) clearTimeout(latest.timer);
          latest.timer = undefined;
        }
        this.emit();
      }
    }).finally(() => { this.running = null; this.emit(); });
    return this.running;
  }

  async flush(): Promise<boolean> {
    for (const entry of this.entries.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = undefined;
      if (entry.dirty) { entry.failed = false; entry.requested = true; }
    }
    await this.drain();
    return !this.hasPending;
  }

  dispose() {
    this.disposed = true;
    for (const entry of this.entries.values()) if (entry.timer) clearTimeout(entry.timer);
  }
}
