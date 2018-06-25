import { Logger } from './logger';
import * as $ from 'jquery';
import * as RatelSdk from '../../';
import { createStream } from './stream';
import {
  makeButton, makeButtonGroup, makeCallbox, makeCheckbox, makeControls, makeDiv, makeSplitGrid,
  makeStreamBox
} from './view';
import { Page } from './page';

export class CallHandler {

  private callHandler: JQuery;
  private controls: JQuery;
  private callbox: JQuery;

  private remoteStream?: MediaStream;

  constructor(private call: RatelSdk.BusinessCall,
              private localStream: MediaStream,
              session: RatelSdk.Session) {
    Logger.log('Building a call object for: ', call);

    this.callbox = makeCallbox(call.id, 'callbox', []);

    this.registerCallEvents();

    const connectButton = makeButton('btn-warning', 'Connect to Artichoke', () => session.chat.connect());

    const disconnectButton = makeButton('btn-warning', 'Disconnect from Artichoke', () => session.chat.disconnect());

    const videoCheckbox = makeCheckbox(`${call.id}-video`, ' Video', true, isChecked => {
      createStream(this.replaceLocalStream, {
        video: isChecked,
        audio: $(`#${call.id}-audio`).is(':checked')
      });
    });

    const audioCheckbox = makeCheckbox(`${call.id}-audio`, ' Audio', true, isChecked => {
      createStream(this.replaceLocalStream, {
        video: $(`#${call.id}-video`).is(':checked'),
        audio: isChecked
      });
    });

    const hangupButton = makeButton('btn-danger', 'Hangup!', () => this.end(RatelSdk.CallReason.Hangup));

    const buttons = makeButtonGroup().append([
      hangupButton, connectButton, disconnectButton, videoCheckbox, audioCheckbox]);
    this.controls = makeControls(call.id, [buttons]).addClass('text-center');
    this.renderStreams();
    this.callHandler = makeDiv().append([this.controls, this.callbox]);
    Page.contents.append(this.callHandler);
    Page.getCalleeBox().hide();
  }

  public stopLocalStream = (): void =>
    this.localStream.getTracks().forEach(t => t.stop())

  public answer = (): Promise<void> =>
    this.call.answer(this.localStream)

  public end = (reason: RatelSdk.CallReason): void => {
    this.call.leave(reason);
    this.callHandler.remove();
    this.stopLocalStream();
    Page.getCalleeBox().show();
  }

  private replaceLocalStream = (stream: MediaStream): void => {
    this.call.removeStream(this.localStream);
    this.stopLocalStream();
    this.call.addStream(stream);
    this.localStream = stream;
    this.renderStreams();
  }

  private renderStreams = (): void => {
    this.callbox.empty();
    this.callbox.append(makeSplitGrid([
      makeStreamBox('me', 'Me', this.localStream, true),
      this.remoteStream ? makeStreamBox('participant', 'Participant', this.remoteStream, false) : makeDiv(),
    ]));
  }

  private registerCallEvents = (): void => {
    this.call.remoteStream$.subscribe(({peerId, stream}) => {
      Logger.log(`Remote stream for user ${peerId} started!`);
      this.remoteStream = stream;
      this.renderStreams();
    });

    this.call.left$.subscribe((m) => {
      Logger.log('User left the call: ', m);
    });

    this.call.offline$.subscribe((m) => {
      Logger.log('User become offline: ', m);
    });

    this.call.online$.subscribe((m) => {
      Logger.log('User become online: ', m);
    });

    this.call.joined$.subscribe(m => {
      Logger.log('User joined the call: ', m);
    });

    this.call.answered$.subscribe((m) => {
      Logger.log('User answered the call: ', m);
    });

    this.call.rejected$.subscribe((m) => {
      Logger.log('User rejected the call: ', m);
    });

    this.call.end$.subscribe((e) => {
      Logger.log('Call ended: ', e.reason);
    });

    this.call.activeDevice$.subscribe((e) => {
      Logger.log('Call is in progress on another device: ', e);
      this.callbox.hide();
      this.stopLocalStream();
    });
  }
}
