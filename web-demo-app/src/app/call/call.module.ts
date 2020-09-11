// import { makeInputWithBtn } from '../view';
import { Session } from '@closerplatform/closer-sdk';
/* import { Page } from '../page';
import { CallService } from './call.service';
import { ModuleNames } from '../agent/board.module';
import { SubModule } from '../submodule'; */

export class CallModule {
  // private callService: CallService;

  constructor(_session: Session){}

  public init(): void {
    // this.callService = new CallService(session);
    // this.render();
  }

  public hide(): void {
    // this.html.hide();
  }
/* 
  protected onShow = (): Promise<void> => {
    const calleeID = this.credentials.calleeId || '';
    $(`#${Page.calleeInputId}`).val(calleeID);

    return Promise.resolve();
  }

  private onCallClick = async (calleeId: string): Promise<void> => {
    await this.callService.callToUser(calleeId, this.credentials);
  }

  private render = (): void => {
    this.inner = makeInputWithBtn(Page.calleeId, this.onCallClick, 'Call', 'Callee id...', '');
    Page.contents.append(this.inner);
  } */
}
