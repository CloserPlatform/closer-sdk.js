export class BumpableTimeout {
  private readonly timeout_ms: number;
  private readonly onTimeoutClb: () => void;
  private timeoutId?: number;

  constructor(timeout_ms: number, onTimeoutClb: () => void) {
    this.timeout_ms = timeout_ms;
    this.onTimeoutClb = onTimeoutClb;

    this.bump();
  }

  public bump(): void {
    this.clear();
    this.timeoutId = window.setTimeout(this.onTimeoutClb, this.timeout_ms);
  }

  public clear(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}
