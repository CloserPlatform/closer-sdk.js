export class UrlService {

  public static getURL = (server: string): URL =>
    new URL(`${(server.startsWith('http') ? '' : `${window.location.protocol}//`)}${server}`)
}
