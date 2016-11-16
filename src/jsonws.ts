import { Callback } from "./events";
import { Logger } from "./logger";
import { disconnect, Disconnect, error, Error, Event, read, write } from "./protocol";

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

  onDisconnect(callback: Callback<Disconnect>) {
    this.socket.onclose = (close) => {
      this.log("WS disconnected: " + close.reason);
      callback(disconnect(close.code, close.reason));
    };
  }

  onError(callback: Callback<Error>) {
    this.socket.onerror = (err) => {
      this.log("WS error: " + err.message);
      callback(error(err.message, err));
    };
  }

  onEvent(callback: Callback<Event>) {
    this.socket.onmessage = (event) => {
      this.log("WS received: " + event.data);
      callback(read(event.data) as Event);
    };
  }

  send(event: Event) {
    let json = write(event);
    this.log("WS sent: " + json);
    this.socket.send(json);
  }
}
