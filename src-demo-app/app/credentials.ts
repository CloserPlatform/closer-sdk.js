export class Credentials {
  public artichokeServer: string;
  public authServer: string;
  public email: string;
  public pwd: string;
  public apiKey: string;
  public id: string;
  public orgId: string;
  public roomId: string;
  public isGuest = true;

  public setServers = (artichoke: string, auth: string): void => {
    this.artichokeServer = artichoke;
    this.authServer = auth;
  }

  public setAgentCtx = (id: string, orgId: string, apiKey: string): void => {
    this.id = id;
    this.orgId = orgId;
    this.apiKey = apiKey;
    this.isGuest = false;
  }

  public setCredentials = (email: string, pwd: string): void => {
    this.email = email;
    this.pwd = pwd;
  }
}
