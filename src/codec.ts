import { ID, Type } from "./protocol/protocol";

export interface EventEntity {
  id?: ID;
  type: Type;
}

export interface Encoder<T extends EventEntity> {
  encode(value: T): string;
}

export interface Decoder<T extends EventEntity> {
  decode(data: string): T;
}

export interface Codec<T extends EventEntity> extends Encoder<T>, Decoder<T> {}
