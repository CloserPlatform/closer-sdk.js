import { Config, load } from "./config";

describe("Config", () => {
    it("should load with defaults", () => {
        let d = load({} as Config);

        let c = load({
            hostname: "localhost",
            debug: !d.debug
        } as Config);

        expect(c.hostname).toBe("localhost");
        expect(c.port).toBe(d.port);
        expect(c.debug).toBe(!d.debug);
        expect(c.rtc).toBeDefined();
    });
});
