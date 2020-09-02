import AsyncStorage from '@react-native-community/async-storage';

export enum StorageNames {
  ApiKey = 'apiKey',
  OrgId = 'orgId',
  Id = 'id',
  IsGuest = 'isGuest',
  RoomId = 'roomId'
}

// tslint:disable: no-floating-promises
export class Storage {
  public static readonly clearAll = (): void => {
    AsyncStorage.clear();
  }

  public static readonly saveGuest = async (key: StorageNames, value: string): Promise<void> => {
    AsyncStorage.setItem(StorageNames.IsGuest, 'true');
    AsyncStorage.setItem(key, value);
  }

  public static readonly saveAgent = async (key: StorageNames, value: string): Promise<void> => {
    AsyncStorage.setItem(StorageNames.IsGuest, 'false');
    AsyncStorage.setItem(key, value);
  }

  public static readonly getItem = async (key: StorageNames): Promise<string | undefined> => {
    const value = await AsyncStorage.getItem(key);

    return value || undefined;
  }

  public static readonly getAllKeys = async (): Promise<readonly string[] | undefined> => {
    const keys = await AsyncStorage.getAllKeys();

    return keys;
  }
}
// tslint:enable: no-floating-promises
