import { XMLHttpRequestFactory } from '../../../src/http/xml-http-request-factory';

describe('XMLHttpRequestFActory', () => {
  describe('create', () => {
    it('XMLHttpRequest', () => {
      const factory = new XMLHttpRequestFactory();
      const request = factory.create();

      expect(request instanceof XMLHttpRequest).toBeTruthy();
    });
  });
});
