export interface Encoder<T> {
  encode(value: T): string;
}

export interface Decoder<T> {
  decode(data: string): T;
}
