import { ObjectUtils } from '../../../src/utils/object-utils';

describe('ObjectUtils', () => {
  it('deepcopy should perform a deep copy', () => {
    const testVal2 = 5;
    const obj = {
      foo: 23,
      bar: {
        baz: testVal2
      }
    };

    const testVal3 = 42;

    const cpy = ObjectUtils.deepcopy(obj);
    expect(cpy).toEqual(obj);

    obj.bar.baz = testVal3;
    expect(cpy.bar.baz).toEqual(testVal2);
  });

  it('mapDefined should apply function on a defined value', () => {
    const value = 'string';

    const fn = (v: string): string => v.toUpperCase();

    const result = ObjectUtils.mapDefined(value, fn);

    expect(result).toBe(fn(value));
  });

  it('mapDefined should not apply function on undefined', () => {
    const value = undefined;

    const result = ObjectUtils.mapDefined(value, v => String(v).toUpperCase());

    expect(result).toBe(value);
  });
});
