import { Config, defaultConfig, load } from "./config";
import { deepcopy } from "./utils";

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
    expect(c.ratel).toBeDefined();
    expect(c.chat.rtc).toBeDefined();
  });

  it("should automatically add service config", () => {
    let c = load({
      hostname: "localhost"
    } as Config);

    expect(c.hostname).toBe("localhost");
    expect(c.ratel.hostname).toBe("localhost");
    expect(c.chat.hostname).toBe("localhost");
  });

  it("should not override provided service config", () => {
    let c = load({
      hostname: "localhost",
      chat: {
        hostname: "notlocalhost"
      }
    } as Config);

    expect(c.hostname).toBe("localhost");
    expect(c.ratel.hostname).toBe("localhost");
    expect(c.chat.hostname).toBe("notlocalhost");
  });

  it("should not override defaultConfig", () => {
    let d = deepcopy(defaultConfig);
    load({} as Config);
    expect(defaultConfig).toEqual(d);
  });

  it("should not override supplied in config", () => {
    let cfg: Config = {
      hostname: "localhost"
    };

    let c = deepcopy(cfg);
    load(cfg);

    expect(cfg).toEqual(c);
  });
});
