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

    connect(url: string) {
        this.socket.connect(url);
    }

    disconnect() {
        this.socket.disconnect();
    }

    send(command: DomainCommand): Promise<void> {
        return this.socket.send(command);
    }

    ask<Response extends DomainEvent>(cmd: roomCommand.SendMessage | roomCommand.SendCustomMessage): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            const ref = 'ref' + Date.now(); // FIXME Use UUID instead.
            this.promises[ref] = {
                resolve,
                reject
            };
            cmd.ref = ref;
            this.send(cmd).catch((e) => this.reject(ref, new errorEvents.Error('Ask failed')));
        });
    }

    onEvent(callback: Callback<DomainEvent>) {
        this.socket.onDisconnect((ev) =>
            callback(new internalEvents.WebsocketDisconnected(ev.code, ev.reason))
        );

        this.socket.onError((ev) =>
            callback(new errorEvents.Error('Websocket connection error.' + ev))
        );

        this.socket.onEvent((event: DomainEvent) => {
            if (errorEvents.isError(event)) {
                this.reject((event as any).ref, event);
            } else {
                this.resolve((event as any).ref, event);
            }
            callback(event);
        });
    }

    private resolve(ref: proto.Ref, event: DomainEvent) {
        if (ref && ref in this.promises) {
            this.promises[ref].resolve(event);
            delete this.promises[ref];
        }
    }

    private reject(ref: proto.Ref, error: errorEvents.Error) {
        if (ref && ref in this.promises) {
            this.promises[ref].reject(error);
            delete this.promises[ref];
        }
    }
}
