import { DomainCommand, encoder } from '../protocol/commands/domain-command';
import { errorEvents } from '../protocol/events/error-events';
import { JSONWebSocket } from '../json-websocket/json-websocket';
import { decoder, DomainEvent } from '../protocol/events/domain-event';
import * as proto from '../protocol/protocol';
import { Logger } from '../logger';
import { internalEvents } from '../protocol/events/internal-events';
import { roomCommand } from '../protocol/commands/room-commands';
import { Callback } from '../events/event-handler';
import { RESTfulAPI } from './restful-api';
import { PromiseFunctions } from '../utils/promise';

export class APIWithWebsocket extends RESTfulAPI {
  private socket: JSONWebSocket;
  private promises: { [ref: string]: PromiseFunctions } = {};

  constructor(log: Logger) {
    super(log);
    this.socket = new JSONWebSocket(this.log, encoder, decoder);
  }

  public connect(url: string): void {
    this.socket.connect(url);
  }

  public disconnect(): void {
    this.socket.disconnect();
  }

  public send(command: DomainCommand): Promise<void> {
    return this.socket.send(command);
  }

  public ask<Response extends DomainEvent>(cmd: roomCommand.SendMessage | roomCommand.SendCustomMessage):
  Promise<Response> {
    return new Promise<Response>((resolve, reject): void => {
      const ref = 'ref' + Date.now(); // FIXME Use UUID instead.
      this.promises[ref] = {
        resolve,
        reject
      };
      cmd.ref = ref;
      this.send(cmd).catch((e) => this.reject(ref, new errorEvents.Error('Ask failed')));
    });
  }

  public onEvent(callback: Callback<DomainEvent>): void {
    this.socket.onDisconnect((ev) =>
      callback(new internalEvents.WebsocketDisconnected(ev.code, ev.reason))
    );

    this.socket.onError((ev) =>
      callback(new errorEvents.Error('Websocket connection error.' + ev))
    );

    this.socket.onEvent((event: DomainEvent) => {
      if (errorEvents.isError(event)) {
        // FIXME
        // tslint:disable-next-line:no-any
        this.reject((event as any).ref, event);
      } else {
        // FIXME
        // tslint:disable-next-line:no-any
        this.resolve((event as any).ref, event);
      }
      callback(event);
    });
  }

  private resolve(ref: proto.Ref, event: DomainEvent): void {
    if (ref && ref in this.promises) {
      this.promises[ref].resolve(event);
      delete this.promises[ref];
    }
  }

  private reject(ref: proto.Ref, error: errorEvents.Error): void {
    if (ref && ref in this.promises) {
      this.promises[ref].reject(error);
      delete this.promises[ref];
    }
  }
}
