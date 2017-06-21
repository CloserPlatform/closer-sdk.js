import {isPhantomJS, log, whenever} from "./fixtures.spec";
import {JSONWebSocket} from "./jsonws";
import {presenceRequest} from "./protocol/wire-events";

describe("JSONWebSocket", () => {
  whenever(!isPhantomJS())("should call a callback on connection error", (done) => {
    const jws = new JSONWebSocket(log);
    jws.onError((e) => done());
    jws.connect("ws://invalid.url");
  });

  whenever(!isPhantomJS())("should reject sending messages when connection is not established", (done) => {
    const jws = new JSONWebSocket(log);
    jws.onError((e) => done.fail());
    jws.send(presenceRequest("away")).then(() => done.fail()).catch((e) => done());
  });
});
