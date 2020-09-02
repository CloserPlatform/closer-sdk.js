import { protocol } from '@closerplatform/closer-sdk';

import { Storage, StorageNames } from '../../storage';

export interface AgentContext {
  readonly id?: protocol.ID;
  readonly orgId?: protocol.ID;
  readonly roomId?: protocol.ID;
  readonly apiKey?: string;
}

export const loadContext = async (): Promise<AgentContext | undefined> => {
  const isGuest = await Storage.getItem(StorageNames.IsGuest);

  if (isGuest === 'false') {
    const apiKey = await Storage.getItem(StorageNames.ApiKey);
    const orgId = await Storage.getItem(StorageNames.OrgId);
    const id =  await Storage.getItem(StorageNames.Id);
    const roomId = await Storage.getItem(StorageNames.RoomId);

    return { apiKey, orgId, id, roomId };
  }
  else {
    Storage.clearAll();
  }
};
