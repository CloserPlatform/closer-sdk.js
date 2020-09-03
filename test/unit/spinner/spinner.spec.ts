import { Spinner } from '../../../src';
import { getSpinnerApi } from './spinner-api.spec';
import { Call, LeadCtx, AgentCtx, GuestProfile } from '../../../src/spinner/protocol';

const orgId = 'orgId';
const id = 'guestId';
const apiKey = 'apiKey';
const roomId = 'roomId';
const invitee = 'invitee';
const ended = 123;
const created = 123;
const creator = 'creator';
const token = 'token';
const context = {};
const email = 'email@email.com';
const presence = 'presence';
const role = 'AGENT';
const password = 'password';
const createCall = {invitee: id};
const callEvent: Call = {id, created, ended, creator, invitee };

const leadCtx: LeadCtx = {
    id, apiKey, orgId, roomId
};
const agentCtx: AgentCtx = {
    id, apiKey, orgId, email, presence, role
};

const guestProfile: GuestProfile = {
    id, roomId
};

export const getSpinner = (api = getSpinnerApi()) =>
    new Spinner(api);

describe('Spinner', () => {
    it('createCall', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'createCall').and.returnValue(Promise.resolve(callEvent));
        const call = await getSpinner(api).createCall(createCall);
        expect(api.createCall).toHaveBeenCalledWith(createCall);
        expect(call).toBe(callEvent);
    });

    it('getGuestProfile', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'getGuestProfile').and.returnValue(Promise.resolve(guestProfile));
        const guest = await getSpinner(api).getGuestProfile(orgId, id);
        expect(api.getGuestProfile).toHaveBeenCalledWith(orgId, id);
        expect(guest).toBe(guestProfile);
    });

    it('signUpGuest', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'setApiKey');
        spyOn(api, 'signUpGuest').and.returnValue(Promise.resolve(leadCtx));
        const guest = await getSpinner(api).signUpGuest(orgId);
        expect(api.signUpGuest).toHaveBeenCalledWith({orgId});
        expect(api.setApiKey).toHaveBeenCalledWith(leadCtx.apiKey);
        expect(guest).toBe(leadCtx);
    });

    it('login with token', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'login').and.returnValue(Promise.resolve(agentCtx));
        const body = {token};
        const agent = await getSpinner(api).login(body);
        expect(api.login).toHaveBeenCalledWith(body);
        expect(agent).toBe(agentCtx);
    });

    it('login with creds', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'login').and.returnValue(Promise.resolve(agentCtx));
        const body = {email, password};
        const agent = await getSpinner(api).login(body);
        expect(api.login).toHaveBeenCalledWith(body);
        expect(agent).toBe(agentCtx);
    });

    it('getSession', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'getSession').and.returnValue(Promise.resolve(agentCtx));
        const agent = await getSpinner(api).getSession();
        expect(api.getSession).toHaveBeenCalled();
        expect(agent).toBe(agentCtx);
    });
});
