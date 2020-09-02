// tslint:disable: no-floating-promises
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
  // TODO: REMOVE saves
  await Storage.saveGuest(StorageNames.IsGuest, 'true');
  await Storage.saveGuest(StorageNames.OrgId, '510ae455-69a3-4b16-b1cc-6e2b72c70e90');
  await Storage.saveGuest(StorageNames.Id, '5430e66a-2313-4c46-b9b4-27e9d690244e');
  await Storage.saveGuest(StorageNames.ApiKey, '9c4d8b8c-af1b-4185-b350-42b1772b41ba');

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

export const signUpGuest = async (orgId: string | undefined, spinnerClient: SpinnerClient | undefined,
  navigation: ThisNavigation): Promise<GuestContext | undefined> => {
    if (!orgId) {
      navigation.navigate(Components.Error, { reason: 'No org id while trying to sign up guest' });
    }
    else if (!spinnerClient) {
      navigation.navigate(Components.Error, { reason: 'Spinner client does not exist' });
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
        navigation.navigate(Components.Error, { reason: 'Could not sign up as guest at spinner api' });
      }
    }
};

export const getGuestProfile = async (orgId: string | undefined, id: string| undefined,
  spinnerClient: SpinnerClient | undefined, navigation: ThisNavigation): Promise<GuestContext | undefined> => {
    if (!orgId || !id) {
      navigation.navigate(Components.Error, { reason: 'No org or id while trying to get guest profile' });
    }
    else if (!spinnerClient) {
      navigation.navigate(Components.Error, { reason: 'Spinner client does not exist' });
    }
    else if (!spinnerClient.apiKey) {
      navigation.navigate(Components.Error, { reason: 'Api key is not specified' });
    }
    else {
      try {
        const guestProfile = await spinnerClient.getGuestProfile(orgId, id);

        return { roomId: guestProfile.roomId, apiKey: spinnerClient.apiKey, orgId, id };
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Could not get guest profile at spinner api' });
      }
    }
};
