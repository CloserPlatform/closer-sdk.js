import { getHttpClientMock } from '../../mocks/http-client.mock';
import { SpinnerApi } from '../../../src/spinner/spinner-api';
import { AgentContext, SessionData, Payload } from '../../../src/protocol/protocol';

export const agentContext: AgentContext = {
    id: 'id', orgId: 'orgId', apiKey: 'apiKey'
};

const payload: Payload = {orgId: agentContext.orgId, externalId: 'externalId', timestamp: 123};

export const sessionData: SessionData = { payload, signature: 'siganture' };

export const getSpinnerApi = (httpClient = getHttpClientMock()) =>
    new SpinnerApi(httpClient);

describe('SpinnerApi', () => {
    it('verifySignature', async () => {
        const httpClient = getHttpClientMock();
        spyOn(httpClient, 'post').and.returnValue(Promise.resolve(agentContext));
        const api = getSpinnerApi(httpClient);

        const sig = await api.verifySignature(sessionData);

        expect(sig).toBe(agentContext);
    });
});
