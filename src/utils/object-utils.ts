// tslint:disable:no-unnecessary-class

export class ObjectUtils {

  public static deepcopy<T>(obj: T): T {
    // tslint:disable:no-unsafe-any
    return JSON.parse(JSON.stringify(obj)); // FIXME Deal with it.
  }

  public static mapDefined<T, Z>(maybeValue: null | undefined | T, fn: (value: T) => Z): Z | undefined {
    return maybeValue ? fn(maybeValue) : undefined;
  }
}
