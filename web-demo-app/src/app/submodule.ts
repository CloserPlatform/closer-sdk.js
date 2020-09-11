/* import { BoardModule } from './agent/board.module';
import { Credentials } from './credentials';
import { Session } from '@closerplatform/closer-sdk';

export abstract class SubModule {
  public abstract readonly NAME: string;

  constructor(
    protected readonly html: JQuery,
    public readonly boardModule: BoardModule,
    public readonly credentials: Credentials,
  ) {
  }

  public abstract init(): void;

  public toggleVisible(visible = true): void {
    if (visible) {
        this.onShow();
        this.html.show();
    } else {
        this.onHide();
        this.html.hide();
    }
  }

  protected abstract onShow(): void;
  protected abstract onHide(): void;
}
 */