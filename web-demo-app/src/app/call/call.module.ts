import { makeCallingInput } from '../view';
import { Session } from 'closer-sdk-js';
import { Page } from '../page';
import { CallService } from './call.service';
import { Logger } from '../logger';

export class CallModule {
  private calleeInput?: JQuery;
  private callService: CallService;

  public init = (session: Session): void => {
    this.callService = new CallService(session);
    this.calleeInput = this.renderInput(this.callService.callToUser);

    Page.contents.append(this.calleeInput);
  }

  public toggleVisible = (visible = true): void => {
    if (this.calleeInput) {
      if (visible) {
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
    makeCallingInput(Page.calleeBoxId, callingCallback, 'id', 'f823bdcf-a411-4cd2-885d-cbbe72674062')
}
