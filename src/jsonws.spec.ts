import {isPhantomJS, log, whenever} from "./fixtures.spec";
import {JSONWebSocket} from "./jsonws";

describe("JSONWebSocket", () => {
  whenever(!isPhantomJS())("should call a callback on connection error", (done) => {
    let jws = new JSONWebSocket("ws://invalid.url", log);
    jws.onError((error) => done());
  });
});
