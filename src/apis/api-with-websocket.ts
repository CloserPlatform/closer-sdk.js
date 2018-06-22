import { DomainCommand, encoder } from '../protocol/commands/domain-command';
import { errorEvents } from '../protocol/events/error-events';
import { JSONWebSocket } from '../json-websocket/json-websocket';
import { decoder, DomainEvent } from '../protocol/events/domain-event';
import { Logger } from '../logger';
import { internalEvents } from '../protocol/events/internal-events';
import { roomCommand } from '../protocol/commands/room-commands';
import { Callback } from '../events/event-handler';
import { RESTfulAPI } from './restful-api';
import { Ref } from '../protocol/protocol';
import { chatEvents } from '../protocol/events/chat-events';
import { RandomUtils } from '../utils/random-utils';

interface AskPromise {
  resolve(res: chatEvents.Received): void;
  reject(err: errorEvents.Error): void;
}

export class APIWithWebsocket extends RESTfulAPI {
  private socket: JSONWebSocket;
  private askPromises: { [ref: string]: AskPromise } = {};

  constructor(logger: Logger) {
    super(logger);
    this.socket = new JSONWebSocket(logger, encoder, decoder);
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

  public ask(roomCmd: roomCommand.SendMessage | roomCommand.SendCustomMessage):
  Promise<chatEvents.Received> {
    return new Promise<chatEvents.Received>((resolve, reject): void => {
      const ref = RandomUtils.randomUUID();
      roomCmd.ref = ref;
      this.askPromises[ref] = { resolve, reject };
      this.send(roomCmd).catch((e) => {
        this.logger.warn(`Ask failed with error: ${e}`);
        this.reject(new errorEvents.Error('Ask failed'), ref);
      });
    });
  }

  public onEvent(callback: Callback<DomainEvent>): void {
    this.socket.onDisconnect((ev) =>
      callback(new internalEvents.WebsocketDisconnected(ev.code, ev.reason))
    );

    this.socket.onError(ev =>
      callback(new errorEvents.Error(`Websocket connection error. ${ev}`))
    );

    this.socket.onEvent((event: DomainEvent) => {
      if (errorEvents.isError(event) && event.ref) {
        this.reject(event, event.ref);
      } else if (chatEvents.Received.isReceived(event) && event.ref) {
        this.resolve(event, event.ref);
      }
      callback(event);
    });
  }

  private resolve(event: chatEvents.Received, ref: Ref): void {
    if (ref in this.askPromises) {
      this.askPromises[ref].resolve(event);
      const { [ref]: value, ...withoutRefPromise } = this.askPromises;
      this.askPromises = withoutRefPromise;
    }
  }

  private reject(error: errorEvents.Error, ref: Ref): void {
    if (ref in this.askPromises) {
      this.askPromises[ref].reject(error);
      const { [ref]: value, ...withoutRefPromise } = this.askPromises;
      this.askPromises = withoutRefPromise;
    }
  }
}
