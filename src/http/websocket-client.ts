import { DomainCommand } from '../protocol/commands/domain-command';
import { chatEvents, errorEvents } from '..';
import { DomainEvent } from '../protocol/events/domain-event';
import { UUIDGenerator } from '../utils/uuid-generator';
import { merge, Observable, throwError, of } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { ArtichokeMessage } from '../protocol/artichoke-message';
import { filter, map, mergeMap, take, timeout, ignoreElements, tap } from 'rxjs/operators';
import { roomCommand } from '../protocol/commands/room-commands';

export class WebsocketClient {

  constructor(
    private socket$: WebSocketSubject<ArtichokeMessage>,
    private uuidGenerator: UUIDGenerator,
    private askTimeoutMs: number,
  ) {
  }

  public get connection$(): Observable<DomainEvent> {
    return this.socket$.pipe(
      map(ev => ev as DomainEvent),
    );
  }

  public send(command: DomainCommand): void {
    return this.socket$.next(command);
  }

  /**
   * Cold observable
   * @param command Message
   */
  public ask(command: roomCommand.SendMessage | roomCommand.SendCustomMessage): Observable<chatEvents.Received> {
    const ref = this.uuidGenerator.next();
    const newCommand = { ...command, ref };

    return merge(
      of(newCommand).pipe(
        tap((cmd: typeof newCommand) => this.send(cmd)),
        ignoreElements(),
      ),
      this.connection$.pipe(
        filter(chatEvents.Received.isReceived),
        filter(rec => rec.ref === ref),
      ),
      this.connection$.pipe(
        filter(errorEvents.Error.isError),
        filter(rec => rec.ref === ref),
        mergeMap(err => throwError(err, undefined)),
      ),
    ).pipe(
      timeout(this.askTimeoutMs),
      take(1),
    );
  }
}
