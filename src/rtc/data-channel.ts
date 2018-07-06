import { Logger } from '../logger';
import { Subject } from 'rxjs/internal/Subject';
import { Observable } from 'rxjs/internal/Observable';

export type DataChannelMessage = string;

export class DataChannel {

  private rtcDataChannel?: RTCDataChannel;
  private messageQueue: ReadonlyArray<DataChannelMessage> = [];
  private messageEvent = new Subject<DataChannelMessage>();

  constructor (private label: string, private rtcPeerConnection: RTCPeerConnection, private logger: Logger) {}

  // Edge do not support rtc data channels ATM - 06.07.2018
  public static isSupported = (): boolean =>
    typeof RTCPeerConnection.prototype.createDataChannel !== 'undefined'

  public createConnection = (): void => {
    // Becasue the not `negotiated` is not fully supported by Safari
    if (DataChannel.isSupported()) {
      this.logger.debug('DataChannel is supported - creating connection');
      if (!this.rtcDataChannel) {
        this.rtcDataChannel = this.rtcPeerConnection.createDataChannel(this.label, {negotiated: true, id: 1});
        this.registerChannelEvents(this.rtcDataChannel);
      } else {
        this.logger.warn('Cannot create data channel: data channel already exists');
      }
    } else {
      this.logger.warn('DataChannel is not supported, your peers will not receive any p2p messages');
    }
  }

  public get message$(): Observable<DataChannelMessage> {
    return this.messageEvent;
  }

  public send = (msg: DataChannelMessage): void => {
    if (this.rtcDataChannel) {
      switch (this.rtcDataChannel.readyState) {
        case 'connecting':
          this.logger.info('Connection is connecting, adding message to queue');
          this.addToQueue(msg);
          break;
        case 'open':
          this.logger.debug('Sending message');
          this.sendMessageViaChannel(this.rtcDataChannel, msg);
          break;
        case 'closing':
          this.logger.error('Can not send message, channel is closing');
          break;
        case 'closed':
          this.logger.error('Can not send message, channel is already closed');
          break;
        default:
          this.logger.error('Unsupported rtc data channel state');
      }
    } else {
      this.logger.info('There is no data channel, adding message to queue');
      this.addToQueue(msg);
    }
  }

  private sendMessageViaChannel = (channel: RTCDataChannel, msg: DataChannelMessage): void =>
    channel.send(msg)

  private addToQueue = (msg: DataChannelMessage): void => {
    this.messageQueue = [...this.messageQueue, msg];
  }

  private registerChannelEvents = (channel: RTCDataChannel): void => {
    channel.onopen = (): void => {
      this.logger.debug('DataChannel opened');
      this.messageQueue.forEach(msg => this.sendMessageViaChannel(channel, msg));
      this.messageQueue = [];
    };
    channel.onmessage = (ev): void => {
      this.messageEvent.next(ev.data);
    };
    channel.onclose = (): void => {
      this.logger.debug('DataChannel closed');
    };
    channel.onerror = (er): void => {
      this.logger.error(er);
    };
  }
}
