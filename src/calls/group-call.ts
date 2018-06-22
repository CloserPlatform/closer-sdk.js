import * as proto from '../protocol/protocol';
import { Call } from './call';
import { callEvents } from '../protocol/events/call-events';
import { CallType } from './call-type';
import { Observable } from 'rxjs';

export class GroupCall extends Call {
    public readonly callType: CallType = CallType.GROUP;

    public static isGroup(call: Call): call is GroupCall {
        return call.callType === CallType.GROUP;
    }

    public invite(user: proto.ID): Promise<void> {
        return this.artichokeApi.inviteToCall(this.id, user);
    }

    public join(stream: MediaStream): Promise<void> {
        this.addStream(stream);

        return this.artichokeApi.joinCall(this.id);
    }

    public get invited$(): Observable<callEvents.Invited> {
        return this.getInvited$();
    }
}
