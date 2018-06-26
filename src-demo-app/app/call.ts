import { Logger } from './logger';
import * as RatelSdk from '../../';
import {
  makeButton, makeButtonGroup, makeCallbox, makeCheckbox, makeControls, makeDiv, makeRemoteTrack,
  makeSplitGrid,
  makeSplitGridRow
} from './view';
import { Page } from './page';
import { createStream } from './stream';

export class CallHandler {

  private callHandler: JQuery;
  private controls: JQuery;
  private callbox: JQuery;
  private callboxGridRow: JQuery;

  constructor(private call: RatelSdk.DirectCall,
              private localTracks: ReadonlyArray<MediaStreamTrack>,
              session: RatelSdk.Session) {
    Logger.log('Building a call object for: ', call);

    this.callbox = makeCallbox(call.id, 'callbox', []);

    this.registerCallEvents();

    const connectButton = makeButton('btn-warning', 'Connect to Artichoke', () => session.chat.connect());

    const disconnectButton = makeButton('btn-warning', 'Disconnect from Artichoke', () => session.chat.disconnect());

    const videoCheckbox = makeCheckbox(`${call.id}-video`, ' Video', false, isChecked => {
      if (isChecked) {
        createStream(stream => {
          const videoTrack = stream.getVideoTracks()[0];
          this.localTracks = [...this.localTracks, videoTrack];
          this.call.addTrack(videoTrack);
          this.renderTrack('me', 'Me', videoTrack, true);
        }, {video: true});
      } else {
        const videoTracks = this.localTracks.filter(t => t.kind === 'video');
        const videoTrack = videoTracks[0];
        if (videoTrack) {
          this.call.removeTrack(videoTrack);
          this.localTracks = this.localTracks.filter(t => t !== videoTrack);
          videoTrack.stop();
        }
      }
    });

    const audioCheckbox = makeCheckbox(`${call.id}-audio`, ' Audio', true, isChecked => {
      localTracks.filter(track => track.kind === 'audio').forEach(t => t.enabled = isChecked);
    });

    const hangupButton = makeButton('btn-danger', 'Hangup!', () => this.end(RatelSdk.CallReason.Hangup));

    const buttons = makeButtonGroup().append([
      hangupButton, connectButton, disconnectButton, videoCheckbox, audioCheckbox]);
    this.controls = makeControls(call.id, [buttons]).addClass('text-center');
    this.callHandler = makeDiv().append([this.controls, this.callbox]);
    this.callboxGridRow = makeSplitGridRow();
    this.callbox.append(makeSplitGrid().append(this.callboxGridRow));
    Page.contents.append(this.callHandler);
    Page.getCalleeBox().hide();
    localTracks.forEach(track => this.renderTrack('me', 'Me', track, true));
  }

  public stopLocalStream = (): void =>
    this.localTracks.forEach(t => t.stop())

  public answer = (): Promise<void> =>
    this.call.answer(this.localTracks)

  public end = (reason: RatelSdk.CallReason): void => {
    this.call.leave(reason);
    this.callHandler.remove();
    this.stopLocalStream();
    Page.getCalleeBox().show();
  }

  private renderTrack = (id: string, name: string, track: MediaStreamTrack, muted: boolean): JQuery =>
    this.callboxGridRow.append(makeRemoteTrack(`${id}:${track.id}`, name, track, muted))

  private registerCallEvents = (): void => {
    this.call.remoteTrack$.subscribe(({peerId, track}) => {
      Logger.log(`Remote stream for user ${peerId} started!`);
      Logger.log('Remote track:', track);
      this.renderTrack(peerId, `Remote: ${peerId}`, track, false);
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
