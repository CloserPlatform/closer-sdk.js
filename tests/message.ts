import { API } from "../src/api";
import { EventHandler } from "../src/events";
import { config, log, sleep } from "./fixtures";
import { createMessage } from "../src/message";
import { Message, MessageDelivered } from "../src/protocol";

class APIMock extends API {
    setDelivery = false;

    setDelivered(messageId, timestamp) {
        this.setDelivery = true;
    }
}

function msg(delivered?: number): Message {
    return {
        type: "message",
        id: "1234",
        body: "Hi!",
        sender: "bob",
        room: "dm-alice-bob",
        timestamp: 123,
        delivered
    }
}

describe("Message", () => {
    let events = new EventHandler(log);

    it("should allow marking as delivered", () => {
        let api = new APIMock(config, log);
        let m = createMessage(msg(), log, events, api);

        expect(m.delivered).not.toBeDefined();
        m.markDelivered();
        expect(api.setDelivery).toBe(true);
        expect(m.delivered).toBeDefined();
    });

    it("should not mark delivered msgs as delivered", () => {
        let api = new APIMock(config, log);
        let m = createMessage(msg(987), log, events, api);
        let d = m.delivered;

        m.markDelivered();
        expect(api.setDelivery).toBe(false);
        expect(m.delivered).toBe(d);
    });

    it("should not mark as delivered twice", (done) => {
        let api = new APIMock(config, log);
        let m = createMessage(msg(), log, events, api);

        expect(m.delivered).not.toBeDefined();
        m.markDelivered();
        expect(api.setDelivery).toBe(true);
        api.setDelivery = false;

        let d = m.delivered;

        sleep(100).then(() => {
            m.markDelivered();
            expect(api.setDelivery).toBe(false);
            expect(m.delivered).toBe(d);
            done();
        });
    });

    it("should run a callback on delivery", (done) => {
        let api = new APIMock(config, log);
        let m = createMessage(msg(), log, events, api);

        expect(m.delivered).not.toBeDefined();
        m.onDelivery((delivery) => {
            expect(api.setDelivery).toBe(false);
            expect(m.delivered).toBe(12345);
            done();
        });

        events.notify({
            type: "msg_delivered",
            id: m.id,
            timestamp: 12345
        } as MessageDelivered);
    });

    it("should run a callback on each delivery", (done) => {
        let api = new APIMock(config, log);
        let m = createMessage(msg(), log, events, api);
        let count = 0;

        expect(m.delivered).not.toBeDefined();
        m.onDelivery((m) => {
            count++;
            if (count === 2) {
                done();
            }
        });

        [123, 456].forEach((t) => events.notify({
            type: "msg_delivered",
            id: m.id,
            timestamp: t
        } as MessageDelivered));
    });
});
