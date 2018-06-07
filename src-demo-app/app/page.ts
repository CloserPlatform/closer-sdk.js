import * as $ from 'jquery';

export class Page {

  public static readonly contents = $('#page-contents');
  public static readonly calleeBoxId = 'calling';

  public static getCalleeBox = (): JQuery =>
    $(`#${Page.calleeBoxId}`)

  public static setHeader = (desc: string): JQuery =>
    $('#demo-name').html(desc)
}
