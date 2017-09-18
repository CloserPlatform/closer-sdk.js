import {log} from "./fixtures.spec";
import {JSONWebSocket} from "./jsonws";
import {chatRequest} from "./protocol/wire-events";

describe("JSONWebSocket", () => {
  it("should call a callback on connection error", (done) => {
    const jws = new JSONWebSocket(log);
    jws.onError((e) => done());
    jws.connect("ws://invalid.url");
  });

  it("should reject sending messages when connection is not established", (done) => {
    const jws = new JSONWebSocket(log);
    jws.onError((e) => done.fail());
    jws.send(chatRequest("123", "body", "TEXT_MESSAGE",
      {type: "json", payload: "{\"key\": \"value\"}"})).then(() => done.fail()).catch((e) => done());
  });
});
