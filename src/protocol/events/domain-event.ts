import { Decoder } from '../codec';

export interface DomainEvent {
  readonly tag: string;
  readonly __discriminator__: 'domainEvent';
}

export const decoder: Decoder<DomainEvent> = {
  decode: (data: string): DomainEvent => JSON.parse(data) as DomainEvent,
};
