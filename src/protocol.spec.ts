import * as proto from "./protocol";

const actionId = "567";
const roomId = "123";
const callId = "234";
const msgId = "345";
const alice = "321";
const bob = "987";

const events: Array<proto.Event> = [{
  type: "heartbeat",
  timestamp: Date.now()
} as proto.Heartbeat, {
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
} as proto.RoomTyping, proto.presenceRequest("available"), {
  type: "presence_update",
  user: alice,
  status: "away",
  timestamp: Date.now(),
} as proto.PresenceUpdate, proto.error("Because!", {
  error: "error",
  text: "string"
}, "23425"), {
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
} as proto.RoomActionSent, {
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
} as proto.RoomActionSent, {
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
} as proto.RoomActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "joined",
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as proto.CallActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "invited",
    id: actionId,
    call: callId,
    user: alice,
    invitee: bob,
    timestamp: Date.now()
  }
} as proto.CallActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "left",
    id: actionId,
    call: callId,
    user: alice,
    reason: "reason",
    timestamp: Date.now()
  }
} as proto.CallActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "audio_muted",
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as proto.CallActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "audio_unmuted",
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as proto.CallActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "video_paused",
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as proto.CallActionSent, {
  type: "call_action",
  id: callId,
  action: {
    action: "video_unpaused",
    id: actionId,
    call: callId,
    user: alice,
    timestamp: Date.now()
  }
} as proto.CallActionSent,
proto.muteAudio(callId),
proto.unmuteAudio(callId),
proto.pauseVideo(callId),
proto.unpauseVideo(callId)];

describe("Protocol", () => {
  it("should be reversible", () => {
    events.forEach((e) => expect(proto.read(proto.write(e))).toEqual(e));
  });
});
