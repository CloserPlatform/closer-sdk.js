import { LoggerService } from '../logger/logger-service';
import { Queue } from '../utils/queue';

export type DataChannelMessage = string;

export class DataChannel {

  // tslint:disable-next-line:readonly-keyword
  private rtcDataChannel?: RTCDataChannel;

  constructor(
    private label: string,
    private messageCallback: (message: DataChannelMessage) => void,
    private rtcPeerConnection: RTCPeerConnection,
    private logger: LoggerService,
    private messageQueue: Queue<DataChannelMessage>,
  ) {
    this.logger.debug('Creating');
  }

  public static isSupported(): boolean {
    // tslint:disable-next-line:no-unbound-method
    return typeof RTCPeerConnection.prototype.createDataChannel !== 'undefined';
  }

  public createConnection(): void {
    this.logger.debug('DataChannel is supported - creating connection');
    if (!this.rtcDataChannel) {
      this.rtcDataChannel = this.rtcPeerConnection.createDataChannel(this.label, {negotiated: true, id: 1});

      return this.registerChannelEvents(this.rtcDataChannel);
    } else {
      return this.logger.error('Cannot create channel - channel already exists');
    }
  }

  public send(msg: DataChannelMessage): void {
    if (this.rtcDataChannel) {
      switch (this.rtcDataChannel.readyState) {
        case 'connecting':
          this.logger.info('Connection is connecting, adding message to queue');

          return this.messageQueue.add(msg);
        case 'open':
          this.logger.debug('Sending message', msg);

          return this.sendMessageViaChannel(this.rtcDataChannel, msg);
        case 'closing':
          return this.logger.error('Can not send message, channel is closing');
        case 'closed':
          return this.logger.error('Can not send message, channel is already closed');
        default:
          return this.logger.error('Unsupported rtc data channel state');
      }
    } else {
      this.logger.info('There is no data channel, adding message to queue');

      return this.messageQueue.add(msg);
    }
  }

  private sendMessageViaChannel(channel: RTCDataChannel, msg: DataChannelMessage): void {
    return channel.send(msg);
  }

  private registerChannelEvents(channel: RTCDataChannel): void {
    channel.onopen = (): void => {
      this.logger.debug('Opened');

      return this.messageQueue.drain().forEach(msg => this.sendMessageViaChannel(channel, msg));
    };
    channel.onmessage = (ev): void => {
      this.logger.debug('Received message', ev.data);

      return this.messageCallback(ev.data as DataChannelMessage);
    };
    channel.onclose = (): void => this.logger.debug('Closed');
    channel.onerror = (er): void => this.logger.error('On channel error:', er);
  }
}
