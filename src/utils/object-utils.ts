// tslint:disable:no-unnecessary-class
export class ObjectUtils {
  public static deepcopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)); // FIXME Deal with it.
  }
}
