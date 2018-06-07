import { Logger } from '../logger';

export interface AuthSession {
  id: string;
  apiKey: string;
}

export class LoginService {

  private static readonly successStatusCode = 200;

  public login = (authServer: URL, email: string, password: string): Promise<AuthSession> =>
    new Promise<AuthSession>((resolve, reject): void => {
      const xhttp = new XMLHttpRequest();
      xhttp.open('POST', `${authServer}api/session`, false);
      xhttp.setRequestHeader('Content-Type', 'application/json');
      xhttp.send(JSON.stringify({email, password}));
      if (xhttp.status !== LoginService.successStatusCode) {
        reject('Invalid credentials.');
      } else {
        const result = JSON.parse(xhttp.responseText);
        Logger.log('Logged successfully', result);
        resolve(result);
      }
    })

}
