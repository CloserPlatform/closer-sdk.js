import { Logger } from '../logger';
import { DirectCall, CallReason, callEvents } from '@closerplatform/closer-sdk';
import {
  makeButton, makeButtonGroup, makeCheckbox, makeControls, makeDiv, makeRemoteTrack, makeSelect, makeSplitGrid
} from '../view';
import { Page } from '../page';
import { createStream } from './stream';
import { map } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { RemoteTrack } from '../../../../dist/rtc/rtc-pool';

export class CallHandler {

  private readonly localVideoStatusWrapperEvent = new Subject<boolean>();

  constructor(
    private callHandler: JQuery,
    private callbox: JQuery,
    private callboxGridRow: JQuery,
    private call: DirectCall,
    private localTracks: ReadonlyArray<MediaStreamTrack>,
    private disconnectCallback: () => void,
  ) {
    Logger.log('Building a call object for: ', this.call);
  }

  public init(): void {
    this.registerCallEvents();
    this.call.addTracks(this.localTracks);
    this.call.setAudioToggle(true, Date.now());
    this.render();
  }

  public async answer(): Promise<void> {
    return this.call.answer(this.localTracks);
  }

  private render(): void {
    const videoCheckbox = makeCheckbox(`${this.call.id}-video`, ' Video', false,
      isChecked => this.videoCheckboxChange(isChecked));

    const audioCheckbox = makeCheckbox(`${this.call.id}-audio`, ' Audio', true,
      isChecked => this.audioCheckboxChange(isChecked));

    const disconnectButton = makeButton('btn-warning', 'Disconnect from Machoke', this.disconnectCallback);

    const hangupButton = makeButton('btn-danger', 'Hangup!', () => this.end(CallReason.Hangup));

    const buttons = makeButtonGroup().append([
      hangupButton, disconnectButton, videoCheckbox, audioCheckbox]);

    this.makeSecondCameraSwitch().then(
      elem => buttons.append(elem),
      _ => alert('failed to create second camera switch')
    );

    const controls = makeControls(this.call.id, [buttons]).addClass('text-center');

    this.registerConnectionStatus(controls);

    this.callHandler.append([controls, this.callbox]);
    this.callbox.append(makeSplitGrid().append(this.callboxGridRow));
    Page.contents.append(this.callHandler);
    Page.getCalleeBox().hide();
    this.localTracks.forEach(track => this.renderTrack('Me', track, true, this.localVideoStatusWrapperEvent));
  }

  private end(reason: CallReason): void {
    this.call.leave(reason);
    this.callHandler.remove();
    this.stopLocalStream();
    Page.getCalleeBox().show();
  }

  private stopLocalStream(): void {
    return this.localTracks.forEach(t => t.stop());
  }

  private audioCheckboxChange(isChecked: boolean): void {
    this.localTracks.filter(track => track.kind === 'audio').forEach(t => t.enabled = isChecked);
    this.call.setAudioToggle(isChecked, Date.now());
  }

  private videoCheckboxChange(isChecked: boolean): void {
    this.notifyVideoChange(isChecked);
    this.localVideoStatusWrapperEvent.next(isChecked);
    const videoTracks = this.localTracks.filter(track => track.kind === 'video');
    videoTracks.forEach(track => track.enabled = isChecked);

    if (videoTracks.length === 0) {
      createStream({ video: true }).then(stream => {
        stream.getVideoTracks().forEach(track => {
          this.localTracks = [...this.localTracks, track];
          this.call.addTrack(track);
          this.renderTrack(`Local`, track, false, this.getVideoEnabledStatusWrapper());
        });
      }).catch(_ => alert('Could not create video stream'));
    }
  }

  private handleRemoteTrack(remoteTrack: RemoteTrack): void {
    Logger.log('Remote track:', remoteTrack);
    this.renderTrack(`Remote`, remoteTrack.track, false, this.getVideoEnabledStatusWrapper());
  }

  private renderTrack(name: string, track: MediaStreamTrack, muted: boolean, videoOn$: Observable<boolean>): JQuery {
    return this.callboxGridRow.append(makeRemoteTrack(track.id, name, track, muted, videoOn$));
  }

  private hadleActiveDevice(activeDevice: callEvents.CallHandledOnDevice): void {
    Logger.log('Call is in progress on another device: ', activeDevice);
    this.callbox.hide();
    this.stopLocalStream();
  }

  private registerCallEvents(): void {
    this.call.remoteTrack$.subscribe(remoteTrack => this.handleRemoteTrack(remoteTrack));
    this.call.left$.subscribe(left => Logger.log('User left the call: ', left));
    this.call.offline$.subscribe(offline => Logger.log('User become offline: ', offline));
    this.call.online$.subscribe(online => Logger.log('User become online: ', online));
    this.call.joined$.subscribe(joined => Logger.log('User joined the call: ', joined));
    this.call.answered$.subscribe(answered => Logger.log('User answered the call: ', answered));
    this.call.rejected$.subscribe(rejected => Logger.log('User rejected the call: ', rejected));
    this.call.end$.subscribe(end => Logger.log('Call ended: ', end.reason));
    this.call.activeDevice$.subscribe(activeDevice => this.hadleActiveDevice(activeDevice));
  }

  private async makeSecondCameraSwitch(): Promise<JQuery> {
    try {
      const devices = await window.navigator.mediaDevices.enumerateDevices();
      Logger.log('Detected video devices', devices);
      if (devices.filter(device => device.kind === 'videoinput').length > 1) {
        return makeSelect(`${this.call.id}-video-switch`, ' Camera',
          ['user', 'environment'], facingMode => this.switchBetweenCameras(facingMode));
      }
    } catch {
      alert('Enumerate devices failed');
    }

    return makeDiv();
  }

  private switchBetweenCameras(facingMode: string): void {
    Logger.log(`Selected facing mode: ${facingMode}`);
    // We need to stop the current video track to access second camera on mobile
    this.removeVideoTracks();
    createStream({
      video: {
        facingMode
      }
    }).then(
      stream => {
        const newVideoTrack = stream.getVideoTracks()[0];
        this.localTracks = [...this.localTracks, newVideoTrack];
        this.renderTrack('Me', newVideoTrack, true, this.localVideoStatusWrapperEvent);
        this.call.replaceTrackByKind(newVideoTrack).catch(_ => alert('replace track failed'));
      },
      _ => alert('switchBetweenCameras create stream failed')
    );
  }

  private registerConnectionStatus(elem: JQuery): void {
    const connectionStatusContainer = makeDiv();
    connectionStatusContainer.text(`${new Date().toUTCString()} - Connection status: Connecting`);
    this.call.peerStatus$.subscribe(peerState => {
      const date = new Date().toUTCString();
      connectionStatusContainer.append(makeDiv().text(`${date} - Connection status: ${peerState.status}`));
    });
    elem.append(connectionStatusContainer);
  }

  private getVideoEnabledStatusWrapper(): Observable<boolean> {
    return this.call.videoToggle$.pipe(map(ev => ev.enabled));
  }

  private notifyVideoChange(enabled: boolean): void {
    return this.call.setVideoToggle(enabled, Date.now());
  }

  private removeVideoTracks(): void {
    this.localTracks.filter(track => track.kind === 'video').forEach(track => track.stop());
    this.localTracks = this.localTracks.filter(track => track.kind !== 'video');
  }
}
