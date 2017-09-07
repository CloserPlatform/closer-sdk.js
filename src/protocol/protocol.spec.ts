import * as wireEvents from "./wire-events";
import { actionTypes, eventTypes } from "./wire-events";

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
    room: roomId,
    timestamp: Date.now(),
  }
} as wireEvents.RoomMessage, {
  type: eventTypes.ROOM_ACTION,
  id: roomId,
  action: {
    type: eventTypes.ROOM_ACTION,
    action: actionTypes.JOINED,
    id: actionId,
    room: roomId,
    user: alice,
    timestamp: Date.now()
  }
} as wireEvents.RoomActionSent, {
  type: eventTypes.ROOM_ACTION,
  id: roomId,
  action: {
    type: eventTypes.ROOM_ACTION,
    action: actionTypes.INVITED,
    id: actionId,
    room: roomId,
    user: alice,
    invitee: bob,
    timestamp: Date.now()
  }
} as wireEvents.RoomActionSent, {
  type: eventTypes.ROOM_ACTION,
  id: roomId,
  action: {
    type: eventTypes.ROOM_ACTION,
    action: actionTypes.LEFT,
    id: actionId,
    room: roomId,
    user: alice,
    reason: "reason",
    timestamp: Date.now()
  }
} as wireEvents.RoomActionSent, {
  type: eventTypes.CALL_ACTION,
  id: callId,
  action: {
    type: eventTypes.CALL_ACTION,
    action: actionTypes.JOINED,
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as wireEvents.CallActionSent, {
  type: eventTypes.CALL_ACTION,
  id: callId,
  action: {
    type: eventTypes.CALL_ACTION,
    action: actionTypes.INVITED,
    id: actionId,
    call: callId,
    user: alice,
    invitee: bob,
    timestamp: Date.now()
  }
} as wireEvents.CallActionSent, {
  type: eventTypes.CALL_ACTION,
  id: callId,
  action: {
    type: eventTypes.CALL_ACTION,
    action: actionTypes.LEFT,
    id: actionId,
    call: callId,
    user: alice,
    reason: "reason",
    timestamp: Date.now()
  }
} as wireEvents.CallActionSent, {
  type: eventTypes.CALL_ACTION,
  id: callId,
  action: {
    type: eventTypes.CALL_ACTION,
    action: actionTypes.OFFLINE,
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as wireEvents.CallActionSent, {
    type: eventTypes.CALL_ACTION,
    id: callId,
    action: {
      type: eventTypes.CALL_ACTION,
      action: actionTypes.ONLINE,
      id: actionId,
      call: callId,
      user: alice,
      timestamp: Date.now()
    }
  } as wireEvents.CallActionSent];

describe("Protocol", () => {
  it("should be reversible", () => {
    events.forEach((e) => expect(wireEvents.read(wireEvents.write(e))).toEqual(e));
  });
});
