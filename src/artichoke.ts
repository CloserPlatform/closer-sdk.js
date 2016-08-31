import { API } from "./api";
import { Call, createCall, DirectCall } from "./call";
import { Config } from "./config";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage } from "./message";
import { CallInvitation, Error, Event, ID, Message, Presence, RoomCreated, Status } from "./protocol";
import { createRoom, DirectRoom, Room } from "./room";
import { nop, wrapPromise } from "./utils";

export class Artichoke {
    private api: API;
    private config: Config;
    private log: Logger;
    private events: EventHandler;

    constructor(config: Config, log: Logger, events: EventHandler, api: API) {
        this.api = api;
        this.config = config;
        this.log = log;
        this.events = events;

        // NOTE Disable some events by default.
        events.onEvent("error", nop);
        events.onEvent("msg_received", nop);
        events.onEvent("msg_delivered", nop);
    }

    // Callbacks:
    onConnect(callback: Callback<Event>) {
        this.events.onEvent("hello", callback);
    }

    onError(callback: Callback<Error>) {
        this.events.onError(callback);
    }

    // API:
    connect() {
        this.api.connect();

        let _this = this;
        this.api.onEvent(function(e: Event) {
            // FIXME Adjust format on the backend.
            switch (e.type) {
            case "call_invitation":
                let c = e as CallInvitation;
                _this.events.notify({
                    type: c.type,
                    sender: c.user,
                    call: createCall(c.call, _this.config.rtc, _this.log, _this.events, _this.api)
                } as Event);
                break;

            case "room_created": // FIXME Rename to room_invitation.
                _this.events.notify({
                    type: e.type,
                    room: createRoom((e as RoomCreated).room, _this.log, _this.events, _this.api)
                } as Event);
                break;

            case "message":
                _this.events.notify(createMessage(e as Message, _this.log, _this.events, _this.api));
                break;

            case "presence":
                let p = e as Presence;
                _this.events.notify({
                    type: p.type,
                    user: p.sender,
                    status: p.status,
                    timestamp: p.timestamp
                } as Event);
                break;

            default:
                _this.events.notify(e);
            }
        });
    }

    // Misc API:
    onStatusChange(callback: Callback<Presence>) {
        this.events.onEvent("presence", callback);
    }

    setStatus(status: Status) {
        this.api.setStatus(status, Date.now());
    }

    // Call API:
    onCall(callback: Callback<CallInvitation>) {
        this.events.onEvent("call_invitation", callback);
    }

    createDirectCall(peer: ID): Promise<DirectCall> {
        return this._wrapCall(this.api.createDirectCall(peer));
    }

    createCall(users: Array<ID>): Promise<Call> {
        return this._wrapCall(this.api.createCall(users));
    }

    getCall(call: ID): Promise<Call | DirectCall> {
        return this._wrapCall(this.api.getCall(call));
    }

    getCalls(): Promise<Array<Call | DirectCall>> {
        return this._wrapCall(this.api.getCalls());
    }

    // Chat room API:
    onRoom(callback: Callback<RoomCreated>) {
        this.events.onEvent("room_created", callback);
    }

    createRoom(name: string): Promise<Room> {
        return this._wrapRoom(this.api.createRoom(name));
    }

    createDirectRoom(peer: ID): Promise<DirectRoom> {
        return this._wrapRoom(this.api.createDirectRoom(peer));
    }

    getRoom(room: ID): Promise<Room | DirectRoom> {
        return this._wrapRoom(this.api.getRoom(room));
    }

    getRooms(): Promise<Array<Room | DirectRoom>> {
        return this._wrapRoom(this.api.getRooms());
    }

    getRoster(): Promise<Array<Room | DirectRoom>> {
        return this._wrapRoom(this.api.getRoster());
    }

    // Utils:
    _wrapCall(promise) {
        return wrapPromise(promise, createCall, [this.config.rtc, this.log, this.events, this.api]);
    }

    _wrapRoom(promise) {
        return wrapPromise(promise, createRoom, [this.log, this.events, this.api]);
    }
}
