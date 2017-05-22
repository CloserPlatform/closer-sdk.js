function makeLoginForm(id, onClick) {
    var form = $('<form id="login_form">')
        .append([makeInput('server', 'Server:', 'Server', 'artichoke.ratel.io'),
                 makeInput('ratel-server', 'RatelServer:', 'RatelServer', 'briefcase.ratel.io'),
                 makeInput('user-phone', 'Phone:', '+48123456789'),
                 makeInput('user-password', 'Password:', 'pa$$w0rd!')]);

    var button = $('<button class="btn btn-primary" form="login_form">')
        .append('Login!')
        .click(onClick);

    return $('<div>')
        .prop('id', id)
        .append([form, button])
        .hide();
}

function makeLabel(id, className, name) {
    return $('<label>')
        .prop({
            for: id,
            class: className
        })
        .append(name);
}

function makeInput(id, name, placeholder, value) {
    var input = $('<input>')
        .prop({
            id: id,
            type: 'text',
            class: 'form-control',
            placeholder: placeholder,
            value: value || ""
        });
    return $('<div>').addClass('form-group').append([makeLabel(id, '', name), input]);
}

function makeCheckbox(id, value, checked) {
    var input = $('<input>')
        .prop({
            id: id,
            type: 'checkbox',
            checked: !!checked
        });
    return $('<div>').append(input, [makeLabel(id, '', value)]);
}

function makeChatContainer(id, switcherId, chatboxesId, controlsId, onJoin) {
    var list = $('<ul>').prop({
        id: switcherId,
        class: 'nav nav-pills nav-stacked'
    });
    var panel = makePanel(list).addClass('switchers-wrapper');
    var wrapper = makeDiv().addClass('switchers').append([panel, makeInputField('Join!', onJoin, function() {})]);
    var switchers = $('<div>')
        .prop({
            id: 'switchers-container',
            class: 'col-lg-2'
        })
        .append(wrapper);

    var chatboxes = $('<div>').prop({
        id: chatboxesId,
        class: 'col-lg-8'
    });

    var controls = $('<div>').prop({
        id: controlsId,
        class: 'col-lg-2'
    });

    return $('<div>').prop('id', id).append([switchers, chatboxes, controls]);
}

function makeAnchor(className, contents, onClick) {
    return $('<a href="#">').addClass(className).append(contents).click(onClick);
}

function makeSwitcher(id, contents, onClick, onClose) {
    var close = onClose ? makeAnchor('out-of-way pull-right', '✖', onClose) : $('<span>');
    close.hide();
    contents[0] = $('<span>').text(contents[0]);
    var switcher = contents.concat([close]);
    return $('<li>')
        .prop({
            id: id,
            class: 'switcher'
        })
        .append($('<a href="#">').append(switcher).click(onClick))
        .mouseenter(function() {
            close.show();
        })
        .mouseleave(function() {
            close.hide();
        });
}

function makeBadge() {
    return $('<span>').addClass('badge');
}

function makePill(className, contents, onClick) {
    return $('<li>').addClass(className).append(makeAnchor("", contents, onClick));
}

function makePanel(contents) {
    var body = $('<div>').addClass('panel-body').append(contents);
    return $('<div>').addClass('panel panel-default').append([body]);
}

function makePills(className) {
    return $('<ul>').addClass('nav nav-pills ' + className);
}

function makeTextLine(id, className, timestamp, sender, line) {
    function time(timestamp) {
        var date = new Date(timestamp);
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        return date.getHours() + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }

    function spanify(item) {
        return ((typeof item.jquery !== "undefined") ? item : $('<span>').text(item)).addClass('contents');
    }

    var ts = time(timestamp);
    return $('<p>')
        .prop({
            id: id,
            class: className
        })
        .append(sender == "" ? [ts, " ", spanify(line)] : [ts, " ", sender, ": ", spanify(line)]);
}

function makeTextArea(className) {
    var text = $('<div>').addClass('panel panel-default ' + className);

    text.bind('scroll-to-bottom', function(event) {
        var area = text.get()[0];
        text.scrollTop(area.scrollHeight - area.clientHeight);
    });

    return text;
}

function makeInputField(name, onClick, onKey) {
    var field = $('<input>')
        .prop({
            type: 'text',
            class: 'form-control form-group'
        })
        .keyup(function(e) {
            if (e.keyCode == 13) {
                onClick(field.val());
                field.val("");
            } else {
                onKey(field.val());
            }
        });
    var button = $('<span>')
        .addClass('input-group-btn')
        .append($('<button>')
                .addClass('btn btn-primary')
                .append(name)
                .click(function() {
                    onClick(field.val());
                    field.val("");
                }));

    return $('<div>')
        .addClass('form-group input-field')
        .append($('<div>').addClass('input-group') .append([field, button]));
}

function makeNInputField(n, name, onClick) {
    var fields = [];
    for(var i = 0; i < n; i++) {
        fields.push($('<input>')
                    .prop({
                        type: 'text',
                        class: 'form-control form-group',
                        style: 'width: ' + 100/n + '%'
                    }));
    }

    var button = $('<span>')
        .addClass('input-group-btn')
        .append($('<button>')
                .addClass('btn btn-primary')
                .append(name)
                .click(function() {
                    onClick(fields.map(function(f) {
                        return f.val();
                    }));
                    fields.forEach(function(f) {
                        f.val("");
                    });
                }));

    return $('<div>')
        .addClass('form-group input-field')
        .append($('<div>').addClass('input-group').append(fields).append(button));
}

function makeChatbox(id, className, text, input) {
    return $('<div>')
        .prop({
            id: id,
            class: className
        })
        .append([text, input]);
}

function makeButton(className, contents, onClick) {
    return $('<button>')
        .prop({
            type: 'button',
            class: "btn " + className
        })
        .append(contents)
        .click(onClick);
}

function makeButtonGroup() {
    return $('<div>').addClass('btn-group buttons');
}

function makeStreamBox(id, name, stream, muted) {
    var video = $('<video>')
        .prop({
            id: id,
            class: 'video-stream',
            autoplay: true,
            muted: muted,
            srcObject: stream.stream
        });

    var status = "";
    if(stream.muted && stream.paused) status = "(paused & muted)";
    else if (stream.muted) status = "(muted)";
    else if (stream.paused) status = "(paused)";

    var panel = $('<div>')
        .addClass('panel panel-default stream-wrapper')
        .append([makeLabel(id, '', name), video, status])
    return $('<div>').append(panel);
}

function makeSplitGrid(contents) {
    var size = Math.ceil(Math.sqrt(contents.length)); // FIXME Should be 1 for contents.length == 2.
    var rows = [];
    for(var i = 0; i < size; i++) {
        rows.push($('<div>').addClass('grid-row'));
    }
    for(var i = 0; i < contents.length; i++) {
        // FIXME Size it properly.
        rows[Math.floor(i / size)].css('height', (1 / size * 100) + '%').append(contents[i].addClass('grid-item'));
    }
    return $('<div>').addClass('grid').append(rows);
}

function makeDiv() {
    return $('<div>');
}

function makeCallbox(id, className, streams) {
    return $('<div>')
        .prop({
            id: id,
            class: className
        })
        .append(streams);
}

function makeLineBreak() {
    return $('<br>');
}

function makeAvatar(className, url) {
    return $('<img>').prop({
        src: url,
        class: className
    });
}

function makeControls(id, contents) {
    return $('<div>')
        .prop({
            id: id,
            class: 'controls'
        })
        .append(contents);
}

function makeEmbed(object) {
    switch(object.type) {
    case "media":
        switch(object.media.mimeType) {
        case "image/gif":
            return makePanel([$('<img>').prop('src', object.media.content),
                              $('<br>'),
                              object.media.description])
                .addClass('text-center')
                .css('width', "50%");
        default:
            return "";
        }

    case "agent":
        return $('<span>').text('User agent: ' + object.agent);

    default:
        return "";
    }
}

function confirmModal(title, text, confirmText, onConfirm, cancelText, onCancel) {
  var buttons = {};
  buttons[confirmText] = function() {
    onConfirm();
    modal.dialog("close");
  };
  buttons[cancelText] = function() {
    onCancel();
    modal.dialog("close");
  };
  var modal = makeDiv()
      .prop('title', title)
      .append($('<span>').text(text))
      .dialog({
        "resizable": false,
        "height": "auto",
        "width": 400,
        "modal": true,
        "buttons": buttons
      });
  return function() {
    modal.dialog("close");
  };
}

function createImageStream(url, fps, onLoad) {
  var canvas = $('<canvas>');
  var ctx = canvas.get(0).getContext("2d");
  var img = new Image();
  img.onload = function() {
    ctx.drawImage(img, 0, 0);
    onLoad(canvas.get(0).captureStream(fps));
  };
  img.crossOrigin = "anonymous";
  img.src = url;
}
