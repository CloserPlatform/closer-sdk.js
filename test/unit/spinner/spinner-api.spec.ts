import { getHttpClientMock } from '../../mocks/http-client.mock';
import { SpinnerApi } from '../../../src/spinner/spinner-api';
import { SignUpGuest, LeadCtx, GuestProfile, Call, AgentCtx } from '../../../src/spinner/protocol';

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

export const getSpinnerApi = (httpClient = getHttpClientMock()) =>
    new SpinnerApi(httpClient);

describe('SpinnerApi', () => {
    it('signUpGuest', async () => {
        const http = getHttpClientMock();
        const signUpGuest: SignUpGuest = {orgId, context};
        spyOn(http, 'post').and.returnValue(Promise.resolve(leadCtx));
        const guest = await getSpinnerApi(http).signUpGuest(signUpGuest);
        expect(http.post).toHaveBeenCalledWith('users/guest', signUpGuest);
        expect(guest).toBe(leadCtx);
    });

    it('getGuestProfile', async () => {
        const http = getHttpClientMock();
        spyOn(http, 'get').and.returnValue(Promise.resolve(guestProfile));
        const guest = await getSpinnerApi(http).getGuestProfile(orgId, id);
        expect(http.get).toHaveBeenCalledWith(`users/guest/${id}/${orgId}`);
        expect(guest).toBe(guestProfile);
    });

    it('createCall', async () => {
        const http = getHttpClientMock();
        spyOn(http, 'post').and.returnValue(Promise.resolve(callEvent));
        const call = await getSpinnerApi(http).createCall(createCall);
        expect(http.post).toHaveBeenCalledWith(`calls/create`, createCall);
        expect(call).toBe(callEvent);
    });

    it('setApiKey', () => {
        const http = getHttpClientMock();
        spyOn(http, 'setApiKey');
        getSpinnerApi(http).setApiKey(apiKey);
        expect(http.setApiKey).toHaveBeenCalledWith(apiKey);
    });

    it('login with token', async () => {
        const http = getHttpClientMock();
        spyOn(http, 'post').and.returnValue(Promise.resolve(agentCtx));
        const body = {token};
        const ctx = await getSpinnerApi(http).login(body);
        expect(http.post).toHaveBeenCalledWith('session', body);
        expect(ctx).toBe(agentCtx);
    });

    it('login with creds', async () => {
        const http = getHttpClientMock();
        spyOn(http, 'post').and.returnValue(Promise.resolve(agentCtx));
        const body = {email, password};
        const ctx = await getSpinnerApi(http).login(body);
        expect(http.post).toHaveBeenCalledWith('session', body);
        expect(ctx).toBe(agentCtx);
    });

    it('getSession', async () => {
        const http = getHttpClientMock();
        spyOn(http, 'get').and.returnValue(Promise.resolve(agentCtx));
        const ctx = await getSpinnerApi(http).getSession();
        expect(http.get).toHaveBeenCalledWith('session');
        expect(ctx).toBe(agentCtx);
    });
});
