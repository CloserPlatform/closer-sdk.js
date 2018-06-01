import { DomainCommand } from './domain-command';

export namespace serverCommands {
  export class InputHeartbeat implements DomainCommand {
    static readonly tag: string = 'input_heartbeat';
    readonly __discriminator__ = 'domainCommand';

    constructor(timestamp: number) {
      this.timestamp = timestamp;
    }

    readonly tag = InputHeartbeat.tag;
    readonly timestamp: number;
  }
}
