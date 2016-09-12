import * as proto from "../src/protocol";

const roomId = "123";
const callId = "234";
const msgId = "345";
const alice = "321";
const bob = "987";

const events: Array<proto.Event> = [{
    type: "call_invited",
    id: callId,
    user: alice,
    inviter: bob,
    timestamp: Date.now()
} as proto.CallInvited, {
    type: "call_left",
    id: callId,
    user: alice,
    reason: "no reason",
    timestamp: Date.now()
} as proto.CallLeft, {
    type: "call_joined",
    id: callId,
    user: alice,
    timestamp: Date.now()
} as proto.CallJoined, {
    type: "room_invitation",
    inviter: bob,
    room: {
        id: roomId,
        name: "room",
        direct: false
    }
} as proto.RoomInvitation, {
    type: "room_typing",
    id: roomId,
    user: alice
} as proto.RoomTyping, {
    type: "presence",
    user: alice,
    status: "away",
    timestamp: Date.now(),
} as proto.Presence, {
    type: "room_action",
    id: roomId,
    originator: alice,
    action: "invited",
    subject: bob,
    timestamp: Date.now()
} as proto.LegacyRoomAction, {
    type: "error",
    ref: "23425",
    reason: "Because!"
} as proto.Error, {
    type: "room_mark",
    id: roomId,
    timestamp: Date.now()
} as proto.RoomMark];

describe("Protocol", () => {
    it("should be reversible", () => {
        events.forEach((e) => expect(proto.read(proto.write(e))).toEqual(e));
    });

    it("backend fixers should correctly handle LegacyRoomActions", () => {
        let invited: proto.LegacyRoomAction = {
            type: "room_action",
            id: roomId,
            action: "invited",
            originator: alice,
            subject: bob,
            timestamp: Date.now()
        };

        let roomInvited = proto.fix(invited) as proto.RoomInvited;

        expect(roomInvited.id).toBe(invited.id);
        expect(roomInvited.inviter).toBe(invited.originator);
        expect(roomInvited.user).toBe(invited.subject);
        expect(proto.unfix(roomInvited)).toEqual(invited);

        let joined: proto.LegacyRoomAction = {
            type: "room_action",
            id: roomId,
            action: "joined",
            originator: alice,
            timestamp: Date.now()
        };

        let roomJoined = proto.fix(joined) as proto.RoomJoined;

        expect(roomJoined.id).toBe(joined.id);
        expect(roomJoined.user).toBe(joined.originator);
        expect(proto.unfix(roomJoined)).toEqual(joined);

        let left: proto.LegacyRoomAction = {
            type: "room_action",
            id: roomId,
            action: "left",
            originator: alice,
            timestamp: Date.now()
        };

        let roomLeft = proto.fix(left) as proto.RoomLeft;

        expect(roomLeft.id).toBe(left.id);
        expect(roomLeft.user).toBe(left.originator);
        expect(proto.unfix(roomLeft)).toEqual(left);
    });

    it("backend fixers should correctly wrap Message", () => {
        let msg: proto.Message = {
            type: "message",
            id: msgId,
            body: "Oi papi!",
            sender: alice,
            room: roomId,
            timestamp: Date.now(),
        };

        let roomMsg = proto.fix(msg) as proto.RoomMessage;

        expect(roomMsg.message).toBe(msg);
        expect(roomMsg.id).toBe(msg.room);
        expect(proto.unfix(roomMsg)).toEqual(msg);
    });
});
