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

function makeInput(id, name, placeholder, value) {
    var label = $('<label>').prop('for', id).append(name);
    var input = $('<input>')
        .prop({
            id: id,
            type: 'text',
            class: 'form-control',
            placeholder: placeholder,
            value: value || ""
        });
    return $('<div>').addClass('form-group').append([label, input]);
}

function makeChatContainer(id, listId, chatsId, onJoin) {
    var list = $('<ul>').prop({
        id: listId,
        class: 'nav nav-pills nav-stacked'
    });
    var panel = makePanel().append(list);
    var rooms = $('<div>').addClass('col-lg-2').append([panel, makeInputField('Join!', onJoin, function() {})]);
    var container = $('<div>').prop({
        id: chatsId,
        class: 'container-fluid'
    });

    var chatbox = $('<div>').addClass('col-lg-8').append(container);

    return $('<div>').prop('id', id).append([rooms, chatbox]).hide();
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

function makePanel() {
    return $('<div>').addClass('well well-sm');
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
    var text = $('<div>').addClass(className);

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

function makeChatbox(id, className, controls, text, input) {
    return $('<div>')
        .prop({
            id: id,
            class: className
        })
        .append([controls, text, input]);
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

function makeStreamBox(className) {
    return $('<video>')
        .prop({
            class: 'video-stream ' + className,
            autoplay: true
        });
}

function makeSplitGrid(contents) {
    var row = $('<div>').addClass('row');
    contents.forEach(function(content) {
        var col = $('<div>')
            .addClass('col-lg-' + Math.floor(12 / contents.length))
            .append(content);
        row.append(col);
    });
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
