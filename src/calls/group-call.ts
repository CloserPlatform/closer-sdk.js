import * as proto from '../protocol/protocol';
import { Call } from './call';
import { callEvents } from '../protocol/events/call-events';
import { Callback } from '../events/event-handler';
import { CallType } from './call-type';

export class GroupCall extends Call {
    public readonly callType: CallType = CallType.GROUP;

    public static isGroup(call: Call): call is GroupCall {
        return call.callType === CallType.GROUP;
    }

    public invite(user: proto.ID): Promise<void> {
        return this.api.inviteToCall(this.id, user);
    }

    public join(stream: MediaStream): Promise<void> {
        this.addStream(stream);

        return this.api.joinCall(this.id);
    }

    public onInvited(callback: Callback<callEvents.Invited>): void {
        this.onInvitedCallback = callback;
    }
}
