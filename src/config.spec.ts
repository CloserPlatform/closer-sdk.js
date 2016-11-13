import { Config, defaultConfig, load } from "./config";
import { deepcopy } from "./utils";

describe("Config", () => {
  it("should load with defaults", () => {
    let d = load({} as Config);

    let c = load({debug: !d.debug} as Config);

    expect(d).toEqual(defaultConfig);
    expect(c.debug).toBe(!d.debug);
    expect(c.ratel).toBeDefined();
    expect(c.chat).toBeDefined();
  });

  it("should not override provided service config", () => {
    let c = load({
      ratel: {
        hostname: "ratel-nonlocalhost"
      },
      chat: {
        hostname: "chat-nonlocalhost"
      }
    } as Config);

    expect(c.ratel.hostname).toBe("ratel-nonlocalhost");
    expect(c.chat.hostname).toBe("chat-nonlocalhost");
  });

  it("should not override defaultConfig", () => {
    let d = deepcopy(defaultConfig);
    load({} as Config);
    expect(defaultConfig).toEqual(d);
  });

  it("should not override supplied in config", () => {
    let cfg: Config = {
      ratel: {
        hostname: "ratel-host"
      }
    } as Config;

    let c = deepcopy(cfg);
    load(cfg);

    expect(cfg).toEqual(c);
  });
});
