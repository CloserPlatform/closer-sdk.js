// tslint:disable:no-any
// tslint:disable:no-implicit-dependencies
// tslint:disable:no-import-side-effect
// tslint:disable:no-submodule-imports
import * as $ from 'jquery';
import 'jquery-ui-bundle';

export interface LoginFormData {
  artichokeServer: string;
  authServer: string;
  userEmail: string;
  userPassword: string;
}

export const makeLoginForm = (id: string, onClick: (formData: LoginFormData) => void
): JQuery => {
  const form = $('<form id="login_form">')
    .append([
      makeInput('server-artichoke', 'ArtichokeServer:', 'ArtichokeServer', 'https://artichoke.stage.closerapp.com'),
      makeInput('server-auth', 'AuthServer:', 'AuthServer', 'https://spinner.stage.closerapp.com'),
      makeSelect('user-email-select', 'Email:', ['charlie@ratel.io', 'jimmy@ratel.io', 'none']),
      makeDiv().html(
        '<a href="https://git.contactis.pl/closer/runny-sea-men/blob/master/data/agents.csv" ' +
        'target="_blank">Agents data<a/>'),
      makeInput('user-email', '', 'charlie@ratel.io', ''),
      makeInput('user-password', 'Password:', 'stokrotka2817', 'stokrotka2817')
    ]);

  const button = $('<button class="btn btn-primary" form="login_form">')
    .append('Login!')
    .click(event => {
      event.preventDefault();
      const artichokeServer = String($('#server-artichoke').val());
      const authServer = String($('#server-auth').val());
      const userEmail = String($('#user-email').val());
      const userEmailSelect = String($('#user-email-select').val());
      const userPassword = String($('#user-password').val());
      const email = userEmailSelect === 'none' ? userEmail : userEmailSelect;
      onClick({artichokeServer, authServer, userEmail: email, userPassword});
    });

  return $('<div>')
    .prop('id', id)
    .append([form, button]);
};

export const makeLabel = (id: string, className: string, name: string | JQuery): JQuery =>
  $('<label>').prop({
    for: id,
    class: className
  })
    .append(name);

export const makeSelect = (id: string, name: string, options: ReadonlyArray<string>): JQuery => {
  const select = $('<select>')
      .prop({
        id, name
      })
      .append(options.map(value => $('<option>').prop({value}).text(value)));

  return $('<div>').append([makeLabel(id, '', name), select]);
};

export const makeInput = (id: string, name: string, placeholder: string, value?: string): JQuery => {
  const input = $('<input>')
    .prop({
      id,
      type: 'text',
      class: 'form-control',
      placeholder,
      value: value || ''
    });

  return $('<div>').addClass('form-group').append([makeLabel(id, '', name), input]);
};

export const makeCheckbox = (id: string, value: string, checked: boolean,
                             onClick?: (flag: boolean) => void): JQuery => {
  const input = $('<input>')
    .prop({
      id,
      type: 'checkbox',
      checked: !!checked
    });
  input.click(() => {
    if (onClick) {
      onClick(input.is(':checked'));
    }
  });

  return $('<div>').append(input, [makeLabel(id, '', value)]);
};

export const makeCallingInput = (id: string, onCall: (userId: string) => void,
                                 placeholder?: string, value?: string): JQuery => {
  const form = $('<form id="calling_form">')
    .append([
      makeInput('calling-id', 'Calle:', placeholder || '', value || '')
    ]);

  const button = $('<button class="btn btn-primary" form="calling_form">')
    .append('Call')
    .click((ev) => {
      ev.preventDefault();
      onCall(String($('#calling-id').val()));
    });

  return $('<div>')
    .prop('id', id)
    .append([form, button]);
};

export const makeButton = (className: string, contents: JQuery | string, onClick: () => void): JQuery =>
  $('<button>').prop({
    type: 'button',
    class: `btn ${className}`
  })
    .append(contents)
    .click(onClick);

export const makeButtonGroup = (): JQuery =>
  $('<div>').addClass('btn-group buttons');

const makeVideo = (id: string, stream: MediaStream, muted: boolean): JQuery => {
  try {
    return $('<video>')
      .prop({
        id,
        class: 'video-stream',
        autoplay: true,
        muted,
        srcObject: stream
      });
  } catch (error) {
    return $('<video>')
      .prop({
        id,
        class: 'video-stream',
        autoplay: true,
        muted,
        src: URL.createObjectURL(stream)
      });
  }
};

const makeStreamStatus = (stream: MediaStream): JQuery => {
  const audioTracks = stream.getAudioTracks();
  const mutedAudioTracks = audioTracks.filter(t => t.muted);
  const enabledAudioTracks = audioTracks.filter(t => t.enabled);

  const videoTracks = stream.getVideoTracks();
  const mutedVideoTracks = videoTracks.filter(t => t.muted);
  const enabledVideoTracks = videoTracks.filter(t => t.enabled);

  const audioStatus = `Audio tracks: ${audioTracks.length}, muted: ${mutedAudioTracks.length},
    enabled: ${enabledAudioTracks.length}`;
  const videoStatus = `Video tracks: ${videoTracks.length}, muted: ${mutedVideoTracks.length},
    enabled: ${enabledVideoTracks.length}`;

  const audioStatusDiv = makeDiv().text(audioStatus);
  const videoStatusDiv = makeDiv().text(videoStatus);

  return $('<div>').append([audioStatusDiv, videoStatusDiv]);
};

export const makeStreamBox = (id: string, name: string, stream: MediaStream, muted: boolean): JQuery => {
  const video = makeVideo(id, stream, muted);

  const label = makeLabel(id, '', name);

  const panel = $('<div>')
    .addClass('panel panel-default stream-wrapper')
    .append([label, video, makeStreamStatus(stream)]);

  return $('<div>').append(panel);
};

export const makeSplitGrid = (contents: ReadonlyArray<JQuery>): JQuery => {
  const size = Math.ceil(Math.sqrt(contents.length)); // FIXME Should be 1 for contents.length == 2.
  // tslint:disable-next-line
  const rows: any[] = [];
  // tslint:disable-next-line
  for (let i = 0; i < size; i++) {
    rows.push($('<div>').addClass('grid-row'));
  }
  // tslint:disable-next-line
  for (let i = 0; i < contents.length; i++) {
    // FIXME Size it properly.
    // tslint:disable-next-line
    rows[Math.floor(i / size)].css('height', (1 / size * 100) + '%').append(contents[i].addClass('grid-item'));
  }

  return $('<div>').addClass('grid').append(rows);
};

export const makeDiv = (): JQuery =>
  $('<div>');

export const makeCallbox = (id: string, className: string, streams: ReadonlyArray<JQuery>): JQuery =>
  $('<div>')
    .prop({
      id,
      class: className
    })
    .append([...streams]);

// tslint:disable:readonly-array
export const makeControls = (id: string, contents: JQuery | JQuery[]): JQuery =>
  $('<div>')
    .prop({
      id,
      class: 'controls'
    })
    .append(contents);

export const confirmModal = (title: string, text: string, confirmText: string, onConfirm: () => void,
                             cancelText: string, onCancel: () => void): () => void => {
  const buttons: { [key: string]: () => void } = {};
  buttons[confirmText] = (): void => {
    onConfirm();
    modal.dialog('close');
  };
  buttons[cancelText] = (): void => {
    onCancel();
    modal.dialog('close');
  };
  const modal = makeDiv()
    .prop('title', title)
    .append($('<span>').text(text))
    .dialog({
      resizable: false,
      height: 'auto',
      width: 400,
      modal: true,
      buttons
    });

  return (): void => {
    modal.dialog('close');
  };
};
