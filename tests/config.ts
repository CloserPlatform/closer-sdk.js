import { Config, load } from "../src/config";

describe("Config", () => {
    it("should load with defaults", () => {
        let d = load({} as Config);

        let c = load({
            url: "localhost",
            debug: !d.debug
        } as Config);

        expect(c.url).toBe("localhost");
        expect(c.debug).toBe(!d.debug);
        expect(c.rtc).toBeDefined();
    });
});
