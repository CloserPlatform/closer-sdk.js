import { API } from "./api";
import { EventHandler } from "./events";
import { config, log, sleep } from "./fixtures.spec";
import { createMessage } from "./message";
import { ChatDelivered, Message } from "./protocol";

const roomId = "123";
const bob = "456";
const msg1 = "2323";

class APIMock extends API {
    setDelivery = false;

    setDelivered(messageId, timestamp) {
        this.setDelivery = true;
    }
}

function makeMsg(delivered?: number): Message {
    return {
        id: msg1,
        body: "Hi!",
        user: bob,
        room: roomId,
        timestamp: 123,
        delivered
    };
}

describe("Message", () => {
    let events;
    let api;
    let msg;

    beforeEach(() => {
        events = new EventHandler(log);
        api = new APIMock(config, log);
        msg = createMessage(makeMsg(), log, events, api);
    });

    it("should allow marking as delivered", () => {
        expect(msg.delivered).not.toBeDefined();
        msg.markDelivered();
        expect(api.setDelivery).toBe(true);
        expect(msg.delivered).toBeDefined();
    });

    it("should not mark delivered msgs as delivered", () => {
        msg = createMessage(makeMsg(987), log, events, api);
        let d = msg.delivered;

        msg.markDelivered();
        expect(api.setDelivery).toBe(false);
        expect(msg.delivered).toBe(d);
    });

    it("should not mark as delivered twice", (done) => {
        expect(msg.delivered).not.toBeDefined();
        msg.markDelivered();
        expect(api.setDelivery).toBe(true);
        api.setDelivery = false;

        let d = msg.delivered;

        sleep(100).then(() => {
            msg.markDelivered();
            expect(api.setDelivery).toBe(false);
            expect(msg.delivered).toBe(d);
            done();
        });
    });

    it("should run a callback on delivery", (done) => {
        expect(msg.delivered).not.toBeDefined();
        msg.onDelivery((delivery) => {
            expect(api.setDelivery).toBe(false);
            expect(msg.delivered).toBe(12345);
            done();
        });

        events.notify({
            type: "chat_delivered",
            id: msg.id,
            user: bob,
            timestamp: 12345
        } as ChatDelivered);
    });

    it("should run a callback on each delivery", (done) => {
        let count = 0;

        expect(msg.delivered).not.toBeDefined();
        msg.onDelivery((m) => {
            count++;
            if (count === 2) {
                done();
            }
        });

        [123, 456].forEach((t) => events.notify({
            type: "chat_delivered",
            id: msg.id,
            user: bob,
            timestamp: t
        } as ChatDelivered));
    });
});
