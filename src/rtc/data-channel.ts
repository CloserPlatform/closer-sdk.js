import { LoggerFactory } from '../logger/logger-factory';
import { LoggerService } from '../logger/logger-service';

export type DataChannelMessage = string;

export class DataChannel {

  private rtcDataChannel?: RTCDataChannel;
  private messageQueue: ReadonlyArray<DataChannelMessage> = [];

  private logger: LoggerService;

  constructor(private label: string,
              private rtcPeerConnection: RTCPeerConnection,
              private onChannelMessage: (msg: DataChannelMessage) => void,
              loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create(`DataChannel label(${label})`);
    this.logger.debug('Creating');
  }

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
        this.logger.warn('Cannot create channel - channel already exists');
      }
    } else {
      this.logger.warn('channel is not supported, your peers will not receive any p2p messages');
    }
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
      this.logger.debug('Opened');
      this.messageQueue.forEach(msg => this.sendMessageViaChannel(channel, msg));
      this.messageQueue = [];
    };
    channel.onmessage = (ev): void => {
      this.onChannelMessage(ev.data);
    };
    channel.onclose = (): void => {
      this.logger.debug('Closed');
    };
    channel.onerror = (er): void => {
      this.logger.error('On channel error:', er);
    };
  }
}
