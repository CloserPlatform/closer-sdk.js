import { wrapPromise } from "./utils";

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
});
