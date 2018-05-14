import { log } from "./fixtures.spec";
import { JSONWebSocket } from "./jsonws";
import { encoder } from "./protocol/commands/domain-command";
import { roomCommand } from "./protocol/commands/room-commands";
import { decoder } from "./protocol/events/domain-event";

describe("JSONWebSocket", () => {
  it("should call a callback on connection error", (done) => {
    const jws = new JSONWebSocket(log, encoder, decoder);
    jws.onError((e) => done());
    jws.connect("ws://invalid.url");
  });

  it("should reject sending messages when connection is not established", (done) => {
    const jws = new JSONWebSocket(log, encoder, decoder);
    jws.onError((e) => done.fail());
    jws.send(new roomCommand.SendCustomMessage("123", "body", "json", { payload: "{\"key\": \"value\"}" }))
      .then(() => done.fail())
      .catch((e) => done());
  });
});
