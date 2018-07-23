import { Logger } from './logger';
import * as RatelSdk from '../../';
import {
  makeButton, makeButtonGroup, makeCallbox, makeCheckbox, makeControls, makeDiv, makeRemoteTrack, makeSelect,
  makeSplitGrid,
  makeSplitGridRow
} from './view';
import { Page } from './page';
import { createStream } from './stream';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs/internal/Subject';
import { ConnectionStatus } from '../../src/rtc/rtc-peer-connection-facade';

export class CallHandler {

  private callHandler: JQuery;
  private controls: JQuery;
  private callbox: JQuery;
  private callboxGridRow: JQuery;
  private localVideoStatusWrapperEvent = new Subject<boolean>();

  constructor(private call: RatelSdk.DirectCall,
              private localTracks: ReadonlyArray<MediaStreamTrack>,
              session: RatelSdk.Session) {
    Logger.log('Building a call object for: ', call);

    this.callbox = makeCallbox(call.id, 'callbox', []);

    this.registerCallEvents();

    const connectButton = makeButton('btn-warning', 'Connect to Artichoke', () => session.chat.connect());

    const disconnectButton = makeButton('btn-warning', 'Disconnect from Artichoke', () => session.chat.disconnect());

    // Disable video by default
    this.localTracks.filter(track => track.kind === 'video').forEach(track => track.enabled = false);

    const videoCheckbox = makeCheckbox(`${call.id}-video`, ' Video', false, isChecked => {
      this.notifyVideoChange(isChecked);
      this.localVideoStatusWrapperEvent.next(isChecked);
      this.localTracks.filter(track => track.kind === 'video').forEach(track => track.enabled = isChecked);
    });

    const audioCheckbox = makeCheckbox(`${call.id}-audio`, ' Audio', true, isChecked => {
      localTracks.filter(track => track.kind === 'audio').forEach(t => t.enabled = isChecked);
    });

    const hangupButton = makeButton('btn-danger', 'Hangup!', () => this.end(RatelSdk.CallReason.Hangup));

    const buttons = makeButtonGroup().append([
      hangupButton, connectButton, disconnectButton, videoCheckbox, audioCheckbox]);

    this.handleMultipleVideoInputs(buttons);

    this.controls = makeControls(call.id, [buttons]).addClass('text-center');

    this.registerConnectionStatus(this.controls);

    this.callHandler = makeDiv().append([this.controls, this.callbox]);
    this.callboxGridRow = makeSplitGridRow();
    this.callbox.append(makeSplitGrid().append(this.callboxGridRow));
    Page.contents.append(this.callHandler);
    Page.getCalleeBox().hide();
    localTracks.forEach(track => this.renderTrack('me', 'Me', track, true, this.localVideoStatusWrapperEvent));
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

  private renderTrack = (id: string, name: string, track: MediaStreamTrack, muted: boolean,
                         videoEnabled$: Observable<boolean>): JQuery =>
    this.callboxGridRow.append(makeRemoteTrack(`${id}:${track.id}`, name, track, muted, videoEnabled$))

  private registerCallEvents = (): void => {
    this.call.remoteTrack$.subscribe(({peerId, track}) => {
      Logger.log(`Remote stream for user ${peerId} started!`);
      Logger.log('Remote track:', track);
      this.renderTrack(peerId, `Remote: ${peerId}`, track, false, this.getVideoEnabledStatusWrapper());
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

  private handleMultipleVideoInputs = (elem: JQuery): void => {
    window.navigator.mediaDevices.enumerateDevices().then(devices => {
      Logger.log('Detected video devices', devices);
      if (devices.filter(device => device.kind === 'videoinput').length > 1) {
        const videoSwitchCheckbox = makeSelect(`${this.call.id}-video-switch`, ' Camera',
          ['user', 'environment'], selectedFacingMode => {
            Logger.log(`Selected facing mode: ${selectedFacingMode}`);
            // We need to stop the current video track to access second camera on mobile
            this.removeVideoTracks();
            createStream(stream => {
              const newVideoTrack = stream.getVideoTracks()[0];
              this.localTracks = [...this.localTracks, newVideoTrack];
              this.renderTrack('me', 'Me', newVideoTrack, true, this.localVideoStatusWrapperEvent);
              this.call.replaceTrackByKind(newVideoTrack);
            }, {
              video: {
                facingMode: selectedFacingMode
              }
            });
          });
        elem.append(videoSwitchCheckbox);
      }
    });
  }

  private registerConnectionStatus = (elem: JQuery): void => {
    const connectionStatusContainer = makeDiv();
    connectionStatusContainer.text(`Connection status: Connecting`);
    this.call.peerStatus$.subscribe(peerStatus => {
      switch (peerStatus.status) {
        case ConnectionStatus.Connected:
          connectionStatusContainer.text(`Connection status: Connected`);
          break;
        case ConnectionStatus.Disconnected:
          connectionStatusContainer.text(`Connection status: Disconnected`);
          break;
        case ConnectionStatus.Failed:
          connectionStatusContainer.text(`Connection status: Failes`);
          break;
        default:
      }
    });
    elem.append(connectionStatusContainer);
  }

  private getVideoEnabledStatusWrapper = (): Observable<boolean> =>
    this.call.message$.pipe(map(msg => JSON.parse(msg.message).video as boolean))

  private notifyVideoChange = (enabled: boolean): void => {
    this.call.broadcast(JSON.stringify({video: enabled}));
  }

  private removeVideoTracks = (): void => {
    this.localTracks.filter(track => track.kind === 'video').forEach(track => track.stop());
    this.localTracks = this.localTracks.filter(track => track.kind !== 'video');
  }
}
