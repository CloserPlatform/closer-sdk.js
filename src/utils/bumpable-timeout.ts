export class BumpableTimeout {

  // tslint:disable-next-line:readonly-keyword
  private timeoutId?: number;

  constructor(
    private timeoutMs: number,
    private onTimeoutCb: () => void,
  ) {
    this.bump();
  }

  public bump(): void {
    this.clear();
    this.timeoutId = window.setTimeout(this.onTimeoutCb, this.timeoutMs);
  }

  public clear(): void {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}
