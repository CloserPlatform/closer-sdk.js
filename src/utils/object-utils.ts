// tslint:disable:no-unnecessary-class

export class ObjectUtils {

  /**
   * Unsafe deepclone - wont clone nulls, undefines and functions
   * @param obj any
   */
  public static deepcopy<T>(obj: T): T {
    // tslint:disable:no-unsafe-any
    return JSON.parse(JSON.stringify(obj)); // FIXME Deal with it.
  }
}
