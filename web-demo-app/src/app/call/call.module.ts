import { makeCallingInput } from '../view';
import { Session } from '@closerplatform/closer-sdk';
import { Page } from '../page';
import { CallService } from './call.service';
import { Logger } from '../logger';
import { Credentials } from '../credentials';

export class CallModule {
  public readonly NAME = 'Call module';
  private calleeInput?: JQuery;
  private callService: CallService;

  constructor (public credentials: Credentials, private session: Session) { }

  public init = (): void => {
    this.callService = new CallService(this.session);
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
