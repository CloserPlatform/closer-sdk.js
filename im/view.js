function makeLoginForm(id, onClick) {
    var form = $('<form>')
        .css('text-align', 'left')
        .append([makeInput('server', 'Server:', 'Server', 'artichoke.ratel.io'),
                 makeInput('session-id', 'Name:', 'Nickname')]);

    return $('<div>')
        .prop({
            id: id,
            class: 'col-lg-2 col-lg-offset-5'
        })
        .append([form, makeButton('btn-primary', 'Login!', onClick)])
        .hide();
}

function makeLabel(id, name) {
    return $('<label>').prop('for', id).append(name);
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
    return $('<div>').addClass('form-group').append([makeLabel(id, name), input]);
}

function makeChatContainer(id, switcherId, chatboxesId, controlsId, onJoin) {
    var list = $('<ul>').prop({
        id: switcherId,
        class: 'nav nav-pills nav-stacked'
    });
    var panel = makePanel(list).addClass('switcher-wrapper');
    var switchers = $('<div>').addClass('col-lg-2').append([panel, makeInputField('Join!', onJoin, function() {})]);
    var chatboxesContainer = $('<div>').prop({
        id: chatboxesId
    });
    var chatboxes = $('<div>').addClass('col-lg-8').append(chatboxesContainer);

    var controlsContainer = $('<div>').prop({
        id: controlsId,
        class: 'controls-wrapper'
    });
    var controls = $('<div>').addClass('col-lg-2').append(controlsContainer);

    return $('<div>').prop('id', id).append([switchers, chatboxes, controls]);
}

function makeAnchor(className, contents, onClick) {
    return $('<a href="#">').addClass(className).append(contents).click(onClick);
}

function makeSwitcher(id, contents, onClick, onClose) {
    var close = onClose ? makeAnchor('out-of-way pull-right', '✖', onClose) : $('<span>');

    var c = Array.isArray(contents) ? contents.concat([close.hide()]) : [contents, close.hide()];

    return $('<li>')
        .prop({
            id: id,
            class: 'switcher'
        })
        .append(makeAnchor("", c, onClick))
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

function makeTextLine(id, className, timestamp, string) {
    function time(timestamp) {
        var date = new Date(timestamp);
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        return date.getHours() + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }

    return $('<p>')
        .prop({
            id: id,
            class: className
        })
        .append([time(timestamp), string]);
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
    return $('<div>').addClass('btn-group');
}

function makeStreamBox(id, name, stream, muted) {
    var video = $('<video>')
        .prop({
            id: id,
            class: 'video-stream',
            autoplay: true,
            muted: muted,
            src: window.URL.createObjectURL(stream)
        });

    return makePanel([makeLabel(id, name), $('<br>'), video]).addClass('stream-wrapper');
}

function makeSplitGrid(contents) {
    var row = $('<div>').addClass('row');
    if (contents.length === 1) {
        row.append($('<div>')
                   .addClass('col-lg-8 col-lg-offset-2')
                   .append(contents))
    } else {
        contents.forEach(function(content) {
            var col = $('<div>')
                .addClass('col-lg-' + Math.floor(12 / contents.length))
                .append(content);
            row.append(col);
        });
    }
    return row;
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
