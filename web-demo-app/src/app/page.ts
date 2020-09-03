import * as $ from 'jquery';

export class Page {

  public static readonly contents = $('#page-contents');

  public static readonly calleeId = 'callee-id';
  public static readonly calleeInputId = 'input-callee-id';
  public static readonly calleeBoxId = 'calling';
  public static readonly orgInputId = 'org-input';
  public static readonly roomInputId = 'room-input';
  public static readonly msgInputId = 'msg-input';
  public static readonly msgInputInnerId = `input-${Page.msgInputId}`;
  public static readonly artichokeFormId = 'server-artichoke';
  public static readonly authFormId = 'server-auth';

  public static getCalleeBox(): JQuery {
    return $(`#${Page.calleeBoxId}`);
  }

  public static setHeader(desc: string): JQuery {
    return $('#demo-name').html(desc);
  }
}
