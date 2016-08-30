import * as RatelSDK from "../src/main";
import { config } from "./fixtures";

describe("Authorization", () => {
    it("should authorize with API key", (done) => {
        RatelSDK.withApiKey("12345", "54321", config).then((session) => {
            expect(session.id).toBe("12345");
            expect(session.chat).toBeDefined();
            done();
        }).catch((error) => done.fail());
    });

    it("should authorize with session data", (done) => {
        let sessionData: RatelSDK.SessionData = {
            organizationId: "09876",
            sessionId: "12345",
            timestamp: Date.now(),
            signature: "Secure Signature"
        };

        RatelSDK.withSignedAuth(sessionData, config).then((session) => {
            expect(session.id).toBe("12345");
            expect(session.chat).toBeDefined();
            done();
        }).catch((error) => done.fail());
    });

    // FIXME Actually implement proper auth.
    xit("shouldn't authorize with invalid session data", (done) => {
        let sessionData: RatelSDK.SessionData = {
            organizationId: "09876",
            sessionId: "12345",
            timestamp: Date.now(),
            signature: "Secure Signature"
        };

        RatelSDK.withSignedAuth(sessionData, config)
            .then((session) => done.fail())
            .catch((error) => done());
    });
});
