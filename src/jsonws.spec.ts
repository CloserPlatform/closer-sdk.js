import { log } from "./fixtures.spec";
import { JSONWebSocket } from "./jsonws";
import { chatSendCustom, codec } from "./protocol/wire-events";

describe("JSONWebSocket", () => {
  it("should call a callback on connection error", (done) => {
    const jws = new JSONWebSocket(log, codec);
    jws.onError((e) => done());
    jws.connect("ws://invalid.url");
  });

  it("should reject sending messages when connection is not established", (done) => {
    const jws = new JSONWebSocket(log, codec);
    jws.onError((e) => done.fail());
    jws.send(chatSendCustom("123", "body", "json", { payload: "{\"key\": \"value\"}" }))
      .then(() => done.fail())
      .catch((e) => done());
  });
});
