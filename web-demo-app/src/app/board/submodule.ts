import { BoardModule } from './board.module';
import { Credentials } from '../credentials';
import { Session } from '@closerplatform/closer-sdk';
import { SpinnerClient } from '@swagger/spinner';

export abstract class SubModule {
  public abstract readonly NAME: string;
  protected inner: JQuery;

  constructor (public boardModule: BoardModule, public credentials: Credentials) { }

  public abstract init(session: Session, spinnerClient: SpinnerClient): Promise<void>;

  public toggleVisible = async (visible = true): Promise<void> => {
    if (visible) {
      if (this.inner) {
        await this.onShow();
        this.inner.show();
      }
    } else {
      if (this.inner) {
        await this.onHide();
        this.inner.hide();
      }
    }
  }

  protected onShow = (): Promise<void> => Promise.resolve();
  protected onHide = (): Promise<void> => Promise.resolve();
}
