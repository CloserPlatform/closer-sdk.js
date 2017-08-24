import { Callback } from "./events";
import { Logger } from "./logger";
import * as wireEvents from "./protocol/wire-events";

export class JSONWebSocket {
  private log: Logger;
  private socket: WebSocket;

  private onCloseCallback: Callback<CloseEvent>;
  private onErrorCallback: Callback<Event>;
  private onMessageCallback: Callback<MessageEvent>;

  constructor(log: Logger) {
    this.log = log;
  }

  connect(url: string) {
    this.log("WS connecting to: " + url);

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.log("WS connected to: " + url);
    };

    this.setupOnClose(this.onCloseCallback);
    this.socket.onerror = this.onErrorCallback;
    this.socket.onmessage = this.onMessageCallback;
  }

  disconnect() {
    this.socket.close();
  }

  onDisconnect(callback: Callback<wireEvents.Disconnect>) {
    this.onCloseCallback = (close) => {
      this.socket = undefined;
      this.log("WS disconnected: " + close.reason);
      callback(wireEvents.disconnect(close.code, close.reason));
    };

    if (this.socket) {
      this.setupOnClose(this.onCloseCallback);
    }
  }

  onError(callback: Callback<wireEvents.Error>) {
    this.onErrorCallback = (err) => {
      this.log("WS error: " + err);
      callback(wireEvents.error("Websocket connection error.", err));
    };

    if (this.socket) {
      this.socket.onerror = this.onErrorCallback;
    }
  }

  onEvent(callback: Callback<wireEvents.Event>) {
    this.onMessageCallback = (event) => {
      this.log("WS received: " + event.data);
      callback(wireEvents.read(event.data) as wireEvents.Event);
    };

    if (this.socket) {
      this.socket.onmessage = this.onMessageCallback;
    }
  }

  send(event: wireEvents.Event): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const json = wireEvents.write(event);
      this.log("WS sent: " + json);
      this.socket.send(json);
      return Promise.resolve();
    } else {
      return Promise.reject<void>(new Error("Websocket is not connected!"));
    }
  }

  private setupOnClose(callback) {
    this.socket.onclose = callback;
    const wrappedCallback = (close) => {
      close.reason = "Browser offline.";
      close.code = 1006; // NOTE WebSocket.CLOSE_ABNORMAL
      callback(close);
    };
    if (typeof window.addEventListener !== "undefined") {
      window.addEventListener("offline", wrappedCallback);
    } else {
      (document.body as any).onoffline = wrappedCallback;
    }
    // TODO Check heartbeats.
  }
}
