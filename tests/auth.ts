import {withApiKey} from "../src/auth";
import {config} from "./fixtures";

describe("Authorization", () => {
    it("should authorize with API key", (done) => {
        withApiKey(12345, "54321", config).then((session) => {
            expect(session.id).toBe("12345");
            expect(session.chat).toBeDefined();
            done();
        }).catch((error) => done.fail());
    });

    // it("should authorize with session data", (done) => {
    //     let payloadData: Payload = {
    //         organizationId: 2,
    //         sessionId: -1,
    //         timestamp: 1473888342670
    //     };
    //
    //     let sessionData: SessionData = {
    //         payload: payloadData,
    //         signature: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6Miwic2Vzc2lvbklkIjotMSwidGl" +
    //         "tZXN0YW1wIjoxNDczODg4MzQyNjcwfQ.PjYC_bBX_vDKLzvM9YAk6Z4cIk4TZe_z6iy8WYLamuw"
    //     };
    //
    //     withSignedAuth(sessionData, config).then((session) => {
    //         expect(session.id).toBe("12345");
    //         expect(session.chat).toBeDefined();
    //         done();
    //     }).catch((error) => done.fail());
    // });
    //
    // // FIXME Actually implement proper auth.
    // xit("shouldn't authorize with invalid session data", (done) => {
    //     let sessionData: SessionData = {
    //         payload: {
    //             organizationId: 9876,
    //             sessionId: 12345,
    //             timestamp: Date.now(),
    //         },
    //         signature: "Secure Signature"
    //     };
    //
    //     withSignedAuth(sessionData, config)
    //         .then((session) => done.fail())
    //         .catch((error) => done());
    // });
});
