import { Decoder } from "../../codec";

export interface DomainEvent {
  readonly tag: string;
}

export const decoder: Decoder<DomainEvent> = {
  decode: (data: string): DomainEvent => JSON.parse(data),
};
