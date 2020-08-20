import * as $ from 'jquery';
import { makeDiv, makeButton } from './view';

export class Nav {
  public static readonly nav = $('#nav');
  public static readonly navButtonsRight = $('#nav-buttons-right');
  public static readonly navButtons = $('#nav-buttons');

  public static setNav = (obj: JQuery): void => {
    Nav.nav.empty();
    Nav.nav.append(obj);
  }

  public static clearButtons = (): void => {
    Nav.navButtons.empty();
  }

  public static setLogoutCallback = (c: () => void): void => {
    const button = makeButton('btn-dark', 'Sign out', c);
    const div = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3'
    }).append(button);

    Nav.navButtonsRight.empty();
    Nav.navButtonsRight.append(div);
  }

  public static setNavButtons = (objs: ReadonlyArray<JQuery>): void => {
    const navigation = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3'
    });
    objs.forEach(o => {
      navigation.append(o);
    });

    Nav.navButtons.empty();
    Nav.navButtons.append(navigation);
  }
}
