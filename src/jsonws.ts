import { Codec, EventEntity } from "./codec";
import { Callback } from "./events";
import { Logger } from "./logger";

export class JSONWebSocket<T extends EventEntity> {
  private log: Logger;
  private socket: WebSocket;
  private codec: Codec<T>;

  private onCloseCallback: Callback<CloseEvent>;
  private onErrorCallback: Callback<Event>;
  private onMessageCallback: Callback<MessageEvent>;

  constructor(log: Logger, codec: Codec<T>) {
    this.log = log;
    this.codec = codec;
  }

  connect(url: string) {
    this.cleanupBeforeConnecting();
    this.log.info("WS connecting to: " + url);

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.log.info("WS connected to: " + url);
    };

    this.setupOnClose(this.onCloseCallback);
    this.socket.onerror = this.onErrorCallback;
    this.socket.onmessage = this.onMessageCallback;
  }

  disconnect() {
    this.socket.close();
  }

  onDisconnect(callback: Callback<CloseEvent>) {
    this.onCloseCallback = (close) => {
      this.unregisterCallbacks();
      this.socket = undefined;
      this.log.info("WS disconnected: " + close.reason);
      callback(close);
    };

    if (this.socket) {
      this.setupOnClose(this.onCloseCallback);
    }
  }

  onError(callback: Callback<Event>) {
    this.onErrorCallback = (err) => {
      this.log.warn("WS error: " + err);
      callback(err);
    };

    if (this.socket) {
      this.socket.onerror = this.onErrorCallback;
    }
  }

  onEvent(callback: Callback<T>) {
    this.onMessageCallback = (event) => {
      this.log.debug("WS received: " + event.data);
      callback(this.codec.decode(event.data));
    };

    if (this.socket) {
      this.socket.onmessage = this.onMessageCallback;
    }
  }

  send(event: T): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const json = this.codec.encode(event);
      this.log.debug("WS sent: " + json);
      this.socket.send(json);
      return Promise.resolve();
    } else {
      return Promise.reject<void>(new Error("Websocket is not connected!"));
    }
  }

  private cleanupBeforeConnecting(): void {
    if (this.socket) {
      this.log.info("Cleaning up previous websocket");
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

  private setupOnClose(callback): void {
    this.socket.onclose = callback;
  }
}
