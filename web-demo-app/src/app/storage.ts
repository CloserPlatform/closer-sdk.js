import { Logger } from './logger';
import { ID } from '../../../dist/protocol/protocol';

export interface EntryInputs {
  readonly artichoke: string;
  readonly spinner: string;
  readonly orgId: string;
}

export interface SessionDetails {
  readonly apiKey: ID;
  readonly id: ID;
  readonly orgId: ID;
  readonly roomId: ID;
}

interface BrowserData {
  readonly entryInputs?: EntryInputs;
  readonly session?: SessionDetails;
}

export class Storage {
  private static readonly storageName = 'crdls';

  public getSessionDetails(): SessionDetails | undefined {
    return this.getBrowserData().session;
  }

  public setSessionDetails(session?: SessionDetails): void {
    return this.saveBrowserData({session});
  }

  public getEntryInputs(): EntryInputs | undefined {
    return this.getBrowserData().entryInputs;
  }

  public setEntryInputs(entryInputs: EntryInputs): void {
    return this.saveBrowserData({entryInputs});
  }

  public clear(): void {
    return localStorage.removeItem(Storage.storageName);
  }

  private saveBrowserData(browserData: BrowserData): void {
    return localStorage.setItem(Storage.storageName,
      JSON.stringify({
        ...this.getBrowserData(),
        ...browserData
      }));
  }

  private getBrowserData(): BrowserData {
    const json = localStorage.getItem(Storage.storageName);
    try {
      if (json) {
        return JSON.parse(json) as BrowserData;
      }
    } catch (e) {
      Logger.error('Could not parse storage json object', e);

      return {};
    }

    return {};
  }
}
