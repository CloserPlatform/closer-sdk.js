import { SpinnerApi } from './spinner-api';
import { GuestProfile, LeadCtx, Call, CreateCall } from './protocol';
import { ID } from '../protocol/protocol';

export class Spinner {
    constructor(
        private spinnerApi: SpinnerApi,
    ) {
    }

    public async getGuestProfile(orgId: ID, id: ID): Promise<GuestProfile> {
        return this.spinnerApi.getGuestProfile(orgId, id);
    }

    public async signUpGuest(orgId: ID): Promise<LeadCtx> {
        const lead = await this.spinnerApi.signUpGuest({orgId});
        this.spinnerApi.setApiKey(lead.apiKey);

        return lead;
    }

    public async createCall(body: CreateCall): Promise<Call> {
        return this.spinnerApi.createCall(body);
    }
}
