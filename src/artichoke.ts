import { API } from "./api";
import { Call, createCall, DirectCall } from "./call";
import { Config } from "./config";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage } from "./message";
import * as proto from "./protocol";
import { createRoom, DirectRoom, Room } from "./room";
import { wrapPromise } from "./utils";

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
        let nop = (e: proto.Event) => {
            // Do nothing.
        };
        events.onEvent("error", nop);
        events.onEvent("msg_received", nop);
        events.onEvent("msg_delivered", nop);
    }

    // Callbacks:
    onConnect(callback: Callback<proto.Event>) {
        this.events.onEvent("hello", callback);
    }

    onError(callback: Callback<proto.Error>) {
        this.events.onError(callback);
    }

    // API:
    connect() {
        this.api.connect();

        let _this = this;
        this.api.onEvent(function(e: proto.Event) {
            // FIXME Adjust format on the backend.
            switch (e.type) {
            case "call_invitation":
                let c = e as proto.CallInvitation;
                _this.events.notify({
                    type: c.type,
                    sender: c.user,
                    call: createCall(c.call, _this.config.rtc, _this.log, _this.events, _this.api)
                } as proto.Event);
                break;

            case "room_action":
                let a = e as proto.RoomAction;
                if (a.action === "invited" && a.subject === _this.config.sessionId) {
                    _this.getRoom(a.id).then(function(room) {
                        _this.events.notify({
                            type: "room_created",
                            room
                        } as proto.Event);
                        _this.events.notify(e);
                    }).catch((error) => _this.events.notify(error));

                } else {
                    _this.events.notify(e);
                }
                break;

            case "room_created": // FIXME Rename to room_invitation.
                _this.events.notify({
                    type: e.type,
                    room: createRoom((e as proto.RoomCreated).room, _this.log, _this.events, _this.api)
                } as proto.Event);
                break;

            case "message":
                _this.events.notify(createMessage(e as proto.Message, _this.log, _this.events, _this.api));
                break;

            case "presence":
                let p = e as proto.Presence;
                _this.events.notify({
                    type: p.type,
                    user: p.sender,
                    status: p.status,
                    timestamp: p.timestamp
                } as proto.Event);
                break;

            default:
                _this.events.notify(e);
            }
        });
    }

    // Misc API:
    onStatusChange(callback: Callback<proto.Presence>) {
        this.events.onEvent("presence", callback);
    }

    setStatus(status: proto.Status) {
        this.api.setStatus(status, Date.now());
    }

    // Call API:
    onCall(callback: Callback<proto.CallInvitation>) {
        this.events.onEvent("call_invitation", callback);
    }

    createDirectCall(peer: proto.ID): Promise<DirectCall> {
        return this.wrapCall(this.api.createDirectCall(peer));
    }

    createCall(users: Array<proto.ID>): Promise<Call> {
        return this.wrapCall(this.api.createCall(users));
    }

    getCall(call: proto.ID): Promise<Call | DirectCall> {
        return this.wrapCall(this.api.getCall(call));
    }

    getCalls(): Promise<Array<Call | DirectCall>> {
        return this.wrapCall(this.api.getCalls());
    }

    // Chat room API:
    onRoom(callback: Callback<proto.RoomCreated>) {
        this.events.onEvent("room_created", callback);
    }

    createRoom(name: string): Promise<Room> {
        return this.wrapRoom(this.api.createRoom(name));
    }

    createDirectRoom(peer: proto.ID): Promise<DirectRoom> {
        return this.wrapRoom(this.api.createDirectRoom(peer));
    }

    getRoom(room: proto.ID): Promise<Room | DirectRoom> {
        return this.wrapRoom(this.api.getRoom(room));
    }

    getRooms(): Promise<Array<Room | DirectRoom>> {
        return this.wrapRoom(this.api.getRooms());
    }

    getRoster(): Promise<Array<Room | DirectRoom>> {
        return this.wrapRoom(this.api.getRoster());
    }

    // Utils:
    private wrapCall(promise: Promise<proto.Call | Array<proto.Call>>) {
        return wrapPromise(promise, (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
    }

    private wrapRoom(promise: Promise<proto.Room | Array<proto.Room>>) {
        return wrapPromise(promise, (room: proto.Room) => createRoom(room, this.log, this.events, this.api));
    }
}
