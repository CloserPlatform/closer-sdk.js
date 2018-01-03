import { BumpableTimeout, deepcopy, isBrowserSupported, isChrome, isFirefox, onceDelayed, wrapPromise } from "./utils";

describe("Utils", () => {
  it("wrapPromise should replace a Promise", (done) => {
    let fun = (i: number) => i.toString();

    wrapPromise(Promise.resolve([23]), fun).then((i) => {
      expect(i).toEqual(["23"]);
      done();
    }).catch((error) => done.fail());

    wrapPromise(Promise.reject<Array<number>>("nope"), fun).then((i) => done.fail()).catch((error) => {
      expect(error).toEqual("nope");
      done();
    });
  });

  it("wrapPromise should reject if an error appears in mapping", (done) => {
    wrapPromise(Promise.resolve([23]), (i: number) => {
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
    }
  });

  it("onceDelayed should only execute once", (done) => {
    let timer: number;
    timer = onceDelayed(timer, 50, () => {
      done.fail();
    });
    timer = onceDelayed(timer, 100, () => {
      done();
    });
  });

  it("BumpableTimeout should fail if not bumped within given timeout", (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, () => done());

    jasmine.clock().tick(ms + 1);
    jasmine.clock().uninstall();
  });

  it("BumpableTimetout should not fail if bumped within given timeout", (done) => {
    jasmine.clock().install();

    const ms = 10;
    const bumpableTimeout = new BumpableTimeout(ms, () => done.fail());

    setInterval(() => bumpableTimeout.bump(), ms - 1);
    setTimeout(() => done(), 10 * ms);


    jasmine.clock().tick(10 * ms + 1);
    jasmine.clock().uninstall();
  });
});
