import { Callback } from "./events";
import { Logger } from "./logger";
import * as wireEvents from "./protocol/wire-events";

export class JSONWebSocket {
  private log: Logger;
  private url: string;
  private socket: WebSocket;

  constructor(url: string, log: Logger) {
    this.log = log;
    this.url = url;

    this.log("Connecting to: " + this.url);
    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      this.log("WS connected to: " + url);
    };
  }

  disconnect() {
    this.socket.close();
  }

  onDisconnect(callback: Callback<wireEvents.Disconnect>) {
    this.socket.onclose = (close) => {
      this.log("WS disconnected: " + close.reason);
      callback(wireEvents.disconnect(close.code, close.reason));
    };
  }

  onError(callback: Callback<wireEvents.Error>) {
    this.socket.onerror = (err) => {
      this.log("WS error: " + err);
      callback(wireEvents.error("Websocket connection error.", err));
    };
  }

  onEvent(callback: Callback<wireEvents.Event>) {
    this.socket.onmessage = (event) => {
      this.log("WS received: " + event.data);
      callback(wireEvents.read(event.data) as wireEvents.Event);
    };
  }

  send(event: wireEvents.Event) {
    let json = wireEvents.write(event);
    this.log("WS sent: " + json);
    this.socket.send(json);
  }
}
