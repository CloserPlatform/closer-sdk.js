import { Decoder, Encoder } from '../codec';
import { Logger } from '../logger';
import { DomainCommand } from '../protocol/commands/domain-command';
import { DomainEvent } from '../protocol/events/domain-event';
import { Callback } from '../events/event-handler';

export class JSONWebSocket {
  private socket: WebSocket;

  private onCloseCallback: Callback<CloseEvent>;
  private onErrorCallback: Callback<Event>;
  private onMessageCallback: Callback<MessageEvent>;

  constructor(private log: Logger,
              private encoder: Encoder<DomainCommand>,
              private decoder: Decoder<DomainEvent>) {
  }

  public connect(url: string): void {
    this.cleanupBeforeConnecting();
    this.log.info('WS connecting to: ' + url);

    this.socket = new WebSocket(url);

    this.socket.onopen = (): void => {
      this.log.info('WS connected to: ' + url);
    };

    this.setupOnClose(this.onCloseCallback);
    this.socket.onerror = this.onErrorCallback;
    this.socket.onmessage = this.onMessageCallback;
  }

  public disconnect(): void {
    this.socket.close();
  }

  public onDisconnect(callback: Callback<CloseEvent>): void {
    this.onCloseCallback = (close): void => {
      this.unregisterCallbacks();
      this.socket = undefined;
      this.log.info('WS disconnected: ' + close.reason);
      callback(close);
    };

    if (this.socket) {
      this.setupOnClose(this.onCloseCallback);
    }
  }

  public onError(callback: Callback<Event>): void {
    this.onErrorCallback = (err): void => {
      this.log.warn('WS error: ' + err);
      callback(err);
    };

    if (this.socket) {
      this.socket.onerror = this.onErrorCallback;
    }
  }

  public onEvent(callback: Callback<DomainEvent>): void {
    this.onMessageCallback = (event): void => {
      this.log.debug('WS received: ' + event.data);
      callback(this.decoder.decode(event.data));
    };

    if (this.socket) {
      this.socket.onmessage = this.onMessageCallback;
    }
  }

  public send(event: DomainCommand): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const json = this.encoder.encode(event);
      this.log.debug('WS sent: ' + json);
      this.socket.send(json);

      return Promise.resolve();
    } else {
      return Promise.reject<void>(new Error('Websocket is not connected!'));
    }
  }

  private cleanupBeforeConnecting(): void {
    if (this.socket) {
      this.log.info('Cleaning up previous websocket');
      this.unregisterCallbacks();
      this.socket.close();
      this.socket = undefined;
    }
  }

  private unregisterCallbacks(): void {
    if (this.socket) {
      this.socket.onclose = undefined;
      this.socket.onerror = undefined;
      this.socket.onmessage = undefined;
      this.socket.onopen = undefined;
    }
  }

  private setupOnClose(callback: Callback<CloseEvent>): void {
    this.socket.onclose = callback;
  }
}
