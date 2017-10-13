import * as wireEvents from "./wire-events";
import { actionTypes, codec, eventTypes } from "./wire-events";

const actionId = "567";
const roomId = "123";
const callId = "234";
const msgId = "345";
const alice = "321";
const bob = "987";

const events: Array<wireEvents.Event> = [{
  type: eventTypes.HEARTBEAT,
  timestamp: Date.now()
} as wireEvents.Heartbeat, {
  type: eventTypes.ROOM_INVITATION,
  inviter: bob,
  room: {
    id: roomId,
    name: "room",
    direct: false
  }
} as wireEvents.RoomInvitation, {
  type: eventTypes.ROOM_TYPING,
  id: roomId,
  user: alice,
  timestamp: Date.now(),
} as wireEvents.RoomTyping, wireEvents.error("Because!", {
  error: "error",
  text: "string"
}, "23425"), {
  type: eventTypes.ROOM_MARK,
  id: roomId,
  timestamp: Date.now()
} as wireEvents.RoomMark, {
  type: eventTypes.ROOM_MESSAGE,
  id: roomId,
  message: {
    type: "message",
    id: msgId,
    body: "Oi papi!",
    user: alice,
    channel: roomId,
    tag: actionTypes.TEXT_MESSAGE,
    timestamp: Date.now(),
  }
} as wireEvents.RoomMessage, {
  type: eventTypes.ROOM_MESSAGE,
  id: roomId,
  message: {
    type: "message",
    id: actionId,
    channel: roomId,
    user: alice,
    tag: actionTypes.ROOM_JOINED,
    timestamp: Date.now()
  }
} as wireEvents.RoomMessage, {
  type: eventTypes.ROOM_MESSAGE,
  id: roomId,
  message: {
    type: "message",
    id: actionId,
    channel: roomId,
    user: alice,
    tag: actionTypes.ROOM_INVITED,
    context: {
      invitee: bob
    },
    timestamp: Date.now()
  }
} as wireEvents.RoomMessage, {
  type: eventTypes.ROOM_MESSAGE,
  id: roomId,
  message: {
    type: "message",
    id: actionId,
    channel: roomId,
    user: alice,
    tag: actionTypes.ROOM_LEFT,
    context: {
      reason: "reason"
    },
    timestamp: Date.now()
  }
} as wireEvents.RoomMessage, {
  type: eventTypes.CALL_MESSAGE,
  id: callId,
  message: {
    type: "message",
    id: actionId,
    channel: callId,
    user: alice,
    tag: actionTypes.CALL_JOINED,
    timestamp: Date.now()
  }
} as wireEvents.CallMessage, {
  type: eventTypes.CALL_MESSAGE,
  id: callId,
  message: {
    type: "message",
    id: actionId,
    channel: callId,
    user: alice,
    tag: actionTypes.CALL_INVITED,
    context: {
      invitee: bob
    },
    timestamp: Date.now()
  }
} as wireEvents.CallMessage, {
  type: eventTypes.CALL_MESSAGE,
  id: callId,
  message: {
    type: "message",
    id: actionId,
    channel: callId,
    user: alice,
    tag: actionTypes.CALL_LEFT,
    context: {
      reason: "reason"
    },
    timestamp: Date.now()
  }
} as wireEvents.CallMessage, {
  type: eventTypes.CALL_MESSAGE,
  id: callId,
  message: {
    type: "message",
    id: actionId,
    channel: callId,
    user: alice,
    tag: actionTypes.OFFLINE,
    timestamp: Date.now()
  }
} as wireEvents.CallMessage, {
    type: eventTypes.CALL_MESSAGE,
    id: callId,
    message: {
      type: "message",
      id: actionId,
      channel: callId,
      user: alice,
      tag: actionTypes.ONLINE,
      timestamp: Date.now()
    }
  } as wireEvents.CallMessage];

describe("Protocol", () => {
  it("should be reversible", () => {
    events.forEach((e) => expect(codec.decode(codec.encode(e))).toEqual(e));
  });
});
