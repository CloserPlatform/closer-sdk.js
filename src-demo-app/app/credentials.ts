// tslint:disable:no-unsafe-any
// tslint:disable:no-empty
export class Credentials {
  private static readonly storageName = 'crdls';
  public artichokeServer: string;
  public authServer: string;
  public email: string;
  public pwd: string;
  public apiKey: string;
  public id: string;
  public orgId: string;
  public roomId: string;
  public isGuest = true;

  constructor() {
    const json = localStorage.getItem(Credentials.storageName);
    try {
      const obj = JSON.parse(json);

      this.artichokeServer = obj.artichokeServer;
      this.authServer = obj.authServer;
      this.apiKey = obj.apiKey;
      this.id = obj.id;
      this.orgId = obj.orgId;
      this.roomId = obj.roomId;
      this.isGuest = obj.isGuest;
    } catch (e) { }
  }

  public areServersSaved = (): boolean => (
    this.artichokeServer !== undefined  && this.authServer !== undefined && this.id !== undefined
  )

  public isGuestSessionSaved = (): boolean => (
    this.apiKey !== undefined && this.id !== undefined && this.orgId !== undefined
  )

  public isSessionSaved = (): boolean => this.apiKey !== undefined;

  public clear = (): void => {
    localStorage.removeItem(Credentials.storageName);
  }

  public setServers = (artichoke: string, auth: string): void => {
    this.artichokeServer = artichoke;
    this.authServer = auth;

    this.save();
  }

  public setAgentCtx = (id: string, orgId: string, apiKey: string): void => {
    this.id = id;
    this.orgId = orgId;
    this.apiKey = apiKey;
    this.isGuest = false;

    this.save();
  }

  public setGuestCtx = (id: string, orgId: string, apiKey: string): void => {
    this.id = id;
    this.orgId = orgId;
    this.apiKey = apiKey;

    this.save();
  }

  public setRoom = (roomId: string): void => {
    this.roomId = roomId;

    this.save();
  }

  public setCredentials = (email: string, pwd: string): void => {
    this.email = email;
    this.pwd = pwd;
  }

  private save = (): void => {
    const json = JSON.stringify({
      artichokeServer: this.artichokeServer,
      authServer: this.authServer,
      apiKey: this.apiKey,
      id: this.id,
      orgId: this.orgId,
      roomId: this.roomId,
      isGuest: this.isGuest
    });

    localStorage.setItem(Credentials.storageName, json);
  }
}
