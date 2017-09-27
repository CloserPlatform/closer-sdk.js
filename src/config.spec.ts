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
      chat: {
        hostname: "chat-nonlocalhost"
      },
      ratel: {
        hostname: "ratel-nonlocalhost"
      },
    } as Config);

    expect(c.chat.hostname).toBe("chat-nonlocalhost");
    expect(c.ratel.hostname).toBe("ratel-nonlocalhost");
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

  it("should merge config deeply", () => {
    let d = deepcopy(defaultConfig);

    let cfg: Config = {
      chat: {
        rtc: {
          rtcpMuxPolicy: "require",
          defaultOfferOptions: {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
          }
        }
      }
    } as Config;
    let copy = deepcopy(cfg);

    let c = load(cfg);

    expect(c.chat.rtc.rtcpMuxPolicy).toEqual(copy.chat.rtc.rtcpMuxPolicy);
    expect(c.chat.rtc.rtcpMuxPolicy).not.toEqual(d.chat.rtc.rtcpMuxPolicy);
    expect(c.chat.rtc.defaultOfferOptions).toBeDefined();
    expect(c.chat.rtc.defaultOfferOptions.offerToReceiveAudio)
      .toEqual(cfg.chat.rtc.defaultOfferOptions.offerToReceiveAudio);
  });
});
