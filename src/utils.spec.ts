import { isChrome, isFirefox } from "./fixtures.spec";
import { deepcopy, isBrowserSupported, wrapPromise } from "./utils";

describe("Utils", () => {
  it("wrapPromise should replace a Promise", (done) => {
    let fun = (i: number) => i.toString();

    wrapPromise(Promise.resolve(23), fun).then((i) => {
      expect(i).toBe("23");
      done();
    }).catch((error) => done.fail());

    wrapPromise(Promise.reject<number>("nope"), fun).then((i) => done.fail()).catch((error) => {
      expect(error).toBe("nope");
      done();
    });
  });

  it("wrapPromise should reject if an error appears in mapping", (done) => {
    wrapPromise(Promise.resolve(23), (i: number) => {
      throw Error("error!");
    }).then((i) => done.fail()).catch((error) => done());
  });

  it("deepcopy should perform a deep copy", () => {
    let obj = {
      foo: 23,
      bar: {
        baz: 5
      }
    };

    let cpy = deepcopy(obj) as typeof obj;
    expect(cpy).toEqual(obj);

    obj.bar.baz = 42;
    expect(cpy.bar.baz).toEqual(5);
  });

  it("isBrowserSupported should check if browser is supported", () => {
    if(isChrome()) {
      expect(isBrowserSupported()).toEqual(true);
    } else if(isFirefox()) {
      expect(isBrowserSupported()).toEqual(true);
    } else {
      expect(isBrowserSupported()).toEqual(false);
    }
  });
});
