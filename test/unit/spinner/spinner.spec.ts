import { Spinner } from '../../../src';
import { getSpinnerApi, sessionData, agentContext } from './spinner-api.spec';

export const getSpinner = (api = getSpinnerApi()) =>
    new Spinner(api);

describe('Spinner', () => {
    it('verifySignature', async () => {
        const api = getSpinnerApi();
        spyOn(api, 'verifySignature').and.returnValue(Promise.resolve(agentContext));
        const spinner = getSpinner(api);

        const ac = await spinner.verifySignature(sessionData);

        expect(ac).toBe(agentContext);
    });
});
