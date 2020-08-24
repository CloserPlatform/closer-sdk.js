import { makeInputWithBtn } from '../view';
import { Session } from '@closerplatform/closer-sdk';
import { Page } from '../page';
import { CallService } from './call.service';
import { Logger } from '../logger';
import { Credentials } from '../credentials';
import { SpinnerClient } from '@swagger/spinner';
import { BoardModule } from '../board/board.module';

export class CallModule {
  public readonly NAME = 'Call module';
  private calleeInput?: JQuery;
  private callService: CallService;

  constructor (public boardModule: BoardModule, public credentials: Credentials) { }

  public init = (session: Session, spinnerClient: SpinnerClient): void => {
    this.callService = new CallService(session, spinnerClient);
    this.calleeInput = this.renderInput((calleeId: string) => this.callService.callToUser(calleeId, this.credentials));

    Page.contents.append(this.calleeInput);
  }

  public toggleVisible = (visible = true): void => {
    if (this.calleeInput) {
      if (visible) {
        const calleeID = this.credentials.calleeId || '';
        $(`#${Page.calleeInputId}`).val(calleeID);
        this.calleeInput.show();
      }
      else {
        this.calleeInput.hide();
      }
    } else {
      Logger.error('Can not toggle visibility, CallModule not initialized');
    }
  }

  private renderInput = (callingCallback: (calleeId: string) => void): JQuery =>
    makeInputWithBtn(Page.calleeId, callingCallback, 'Call', 'Callee id...', '')
}
