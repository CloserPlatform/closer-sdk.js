import { Encoder } from '../../codec';

export interface DomainCommand {
  readonly tag: string;
  readonly __discriminator__: 'domainCommand';
}

export const encoder: Encoder<DomainCommand> = {
  encode: (cmd: DomainCommand): string => JSON.stringify(cmd),
};
