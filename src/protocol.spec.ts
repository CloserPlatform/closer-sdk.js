import * as proto from "./protocol";

const actionId = "567";
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
  type: "error",
  ref: "23425",
  reason: "Because!"
} as proto.Error, {
  type: "room_mark",
  id: roomId,
  timestamp: Date.now()
} as proto.RoomMark, {
  type: "room_message",
  id: roomId,
  message: {
    id: msgId,
    body: "Oi papi!",
    user: alice,
    room: roomId,
    timestamp: Date.now(),
  }
} as proto.RoomMessage, {
  type: "room_action",
  id: roomId,
  action: {
    action: "joined",
    id: actionId,
    room: roomId,
    user: alice,
    timestamp: Date.now()
  }
} as proto.RoomAction, {
  type: "room_action",
  id: roomId,
  action: {
    action: "invited",
    id: actionId,
    room: roomId,
    user: alice,
    invitee: bob,
    timestamp: Date.now()
  }
} as proto.RoomAction, {
  type: "room_action",
  id: roomId,
  action: {
    action: "left",
    id: actionId,
    room: roomId,
    user: alice,
    reason: "reason",
    timestamp: Date.now()
  }
} as proto.RoomAction];

describe("Protocol", () => {
  it("should be reversible", () => {
    events.forEach((e) => expect(proto.read(proto.write(e))).toEqual(e));
  });
});
