import { Callback } from "./events";
import { Logger } from "./logger";
import { Error, Event, read, write } from "./protocol";

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
      this.log("Connected to: " + url);
    };
  }

  onError(callback: Callback<Error>) {
    this.socket.onerror = (error) => {
      this.log("WS error: " + error.message);
      callback({
        type: "error",
        reason: error.message
      } as Error);
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
