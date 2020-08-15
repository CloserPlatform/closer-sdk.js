export type UUID = string;

export class UUIDGenerator {

  public next(): UUID {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const r = Math.random() * 16 | 0; // tslint:disable-line
      const v = char === 'x' ? r : (r & 0x3 | 0x8); // tslint:disable-line
      const radix = 16;

      return v.toString(radix);
    });
  }
}
