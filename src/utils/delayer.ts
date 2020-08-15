export class Delayer {
  private timeoutHandle = 0;

  /**
   *  It delays execution of a callback only once, if previous timeouts did not timed out
   * @param timeout Time in miliseconds
   * @param callback Callback function
   */
  public delayOnce(timeoutMs: number, timeoutCallback: () => void): void {
    window.clearTimeout(this.timeoutHandle);

    this.timeoutHandle = window.setTimeout(timeoutCallback, timeoutMs);
  }
}
