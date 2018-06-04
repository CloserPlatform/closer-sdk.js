import { GroupCall } from './group-call';
import { Call } from './call';
import { CallType } from './call-type';

export class BusinessCall extends GroupCall {
    public readonly callType: CallType = CallType.BUSINESS;

    public static isBusiness(call: Call): call is BusinessCall {
        return call.callType === CallType.BUSINESS;
    }
}
