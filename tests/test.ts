import { createCall } from "../src/call";

describe('example test', () => {
  it('should exist XD', () => {
    expect(true).toBe(true)
  });
});

class Greeter {
  constructor(public greeting: string) { }
  greet() {
    return "<h1>" + this.greeting + "</h1>";
  }
};