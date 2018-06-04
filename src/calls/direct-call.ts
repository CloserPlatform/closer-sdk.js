import { Call } from './call';
import { CallType } from './call-type';

export class DirectCall extends Call {
    public readonly callType: CallType = CallType.DIRECT;

    public static isDirect(call: Call): call is DirectCall {
        return call.callType === CallType.DIRECT;
    }
}
