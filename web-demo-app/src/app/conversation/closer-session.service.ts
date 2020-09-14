import * as View from '../view';
import { Call, CallReason, serverEvents, Room, ID, GuestSession } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { createStream } from './stream';
import { CallHandler } from './call-handler';
import { Page } from '../page';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class CloserGuestSessionService {

  private readonly disconnectEvent = new Subject<void>();

  constructor(
    private guestSession: GuestSession
  ) { }

  public get id(): ID {
    return this.guestSession.id;
  }

  public connect(): void {
    this.guestSession.artichoke.error$.subscribe(error =>
      Logger.log('An error has occured: ', error));

    this.guestSession.serverUnreachable$.subscribe(_ =>
      Logger.log('Server unreachable'));

    this.guestSession.artichoke.roomCreated$.subscribe(roomCreated =>
      Logger.log('Room created: ', roomCreated));

    this.guestSession.artichoke.roomInvitation$.subscribe(roomInvitation =>
      Logger.log('Received room invitation: ', roomInvitation));

    this.guestSession.artichoke.callCreated$.subscribe(callCreated =>
      Logger.log('Call created: ', callCreated));

    this.guestSession.artichoke.callInvitation$.subscribe(async callInvitation => {
      Logger.log('Received call invitation: ', callInvitation);
      try {
        const call = await this.guestSession.getCall(callInvitation.callId);
        this.handleCallInvitation(call);
      } catch (err) {
        Logger.error('Could not get call for call invitation', err, callInvitation);
      }
    });

    this.guestSession.connection$.pipe(
      takeUntil(this.disconnectEvent),
    ).subscribe(
      (hello: serverEvents.Hello) => {
        Page.setHeader(`Connected Session(${this.guestSession.id})`);
        Logger.log('Connected to Artichoke!', hello);
      },
      err => Logger.error('Connection error', err),
      () => {
        Page.setHeader(`Disconnected Session(${this.guestSession.id})`);
        Logger.log('Session disconnected');
      }
    );
    Page.setHeader(`Connecting..`);
  }

  public disconnect(): void {
    this.disconnectEvent.next();
  }

  public async createCall(invitee: ID): Promise<Call> {
    return this.guestSession.createCall(invitee);
  }

  public async getCall(callId: ID): Promise<Call> {
    return this.guestSession.getCall(callId);
  }

  public async getRoom(): Promise<Room> {
    return this.guestSession.getRoom();
  }

  private handleCallInvitation(call: Call): void {
    const closeModal = View.confirmModal(
      'Call invitation',
      `${call.creator} calls you`,
      'Answer',
      () => this.answerCallInvitation(call),
      'Reject',
      () => this.rejectCallInvitation(call),
    );

    call.end$.subscribe(end => {
      Logger.log('Call ended: ', end.reason);
      closeModal();
    });
  }

  private async answerCallInvitation(call: Call): Promise<void> {
    const stream = await createStream();
    const callbox = View.makeCallbox(call.id, 'callbox', []);
    const callboxGridRow = View.makeSplitGridRow();
    const callHandler = new CallHandler(
      View.makeDiv(), callbox, callboxGridRow, call, stream.getTracks(), () => this.disconnect());
    callHandler.answer()
      .then(() => Logger.log('Call answered'))
      .catch(err => {
        Logger.error('Call answer failed', err);
        alert(`Answer failed ${err}`);
      });
  }

  private rejectCallInvitation(call: Call): void {
    Logger.log('Rejecting call');
    call.reject(CallReason.CallRejected).then(
      res => Logger.log('Call rejected', res),
      err => Logger.error('Call rejecting failed', err)
    );
  }
}
