import { SpinnerClient } from '@swagger/spinner';
import { protocol } from '@closerplatform/closer-sdk';
import { Storage, StorageNames } from '../../storage';

import { defaultOrg } from '../../defaults';
import { Components } from '../types';

import { ThisNavigation } from './guestboard';

export interface GuestContext {
  readonly apiKey?: protocol.ApiKey;
  readonly id?: protocol.ID;
  readonly orgId?: protocol.ID;
  readonly roomId?: protocol.ID;
}

export const loadContext = async (): Promise<GuestContext | undefined> => {
  const isGuest = await Storage.getItem(StorageNames.IsGuest);

  if (isGuest === 'true') {
    return {
      orgId: await Storage.getItem(StorageNames.OrgId),
      id: await Storage.getItem(StorageNames.Id),
      apiKey: await Storage.getItem(StorageNames.ApiKey)
    };
  }
  else {
    Storage.clearAll();

    return { orgId: defaultOrg };
  }
};

// tslint:disable: no-floating-promises
export const signUpGuest = async (orgId: string | undefined, spinnerClient: SpinnerClient | undefined)
  : Promise<GuestContext | undefined> => {
    if (!orgId) {
      throw new Error('No org id while trying to sign up guest');
    }
    else if (!spinnerClient) {
      throw new Error('Spinner client does not exist');
    }
    else {
      try {
        const leadCtx = await spinnerClient.signUpGuest({ orgId });
        spinnerClient.apiKey = leadCtx.apiKey;

        Storage.saveGuest(StorageNames.ApiKey, leadCtx.apiKey);
        Storage.saveGuest(StorageNames.Id, leadCtx.id);
        Storage.saveGuest(StorageNames.OrgId, leadCtx.orgId);

        return { apiKey: leadCtx.apiKey, id: leadCtx.id, roomId: leadCtx.roomId, orgId };
      } catch (e) {
        throw new Error(`Error signing up as guest at spinner api: ${(e as Error).message}`);
      }
    }
};
// tslint:enable: no-floating-promises

export const getGuestProfile = async (orgId: string | undefined, id: string | undefined,
  spinnerClient: SpinnerClient | undefined): Promise<GuestContext | undefined> => {
    if (!orgId) {
      throw new Error('No org or id while trying to get guest profile');
    }
    else if (!id) {
      throw new Error('No id while trying to get guest profile');
    }
    else if (!spinnerClient) {
      throw new Error('Spinner client does not exist');
    }
    else if (!spinnerClient.apiKey) {
      throw new Error('Api key is not specified');
    }
    else {
      try {
        const guestProfile = await spinnerClient.getGuestProfile(orgId, id);

        return { roomId: guestProfile.roomId, apiKey: spinnerClient.apiKey, orgId, id };
      } catch (e) {
        throw new Error(`Could not get guest profile at spinner api: ${(e as Error).message}`);
      }
    }
};
