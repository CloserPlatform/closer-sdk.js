function makeLoginForm(id, onClick) {
    var form = $('<form>')
        .css('text-align', "left")
        .append([makeInput("server", "Server:", "Server", "artichoke.ratel.io"),
                 makeInput("session-id", "Name:", "Nickname")]);

    return $('<div>')
        .prop({
            id: id,
            class: "col-lg-2 col-lg-offset-5"
        })
        .append([form, makeButton("btn-primary", "Login!", onClick)])
        .hide();
}

function makeInput(id, name, placeholder, value) {
    var label = $('<label>').prop('for', id).append(name);
    var input = $('<input>')
        .prop({
            id: id,
            type: "text",
            class: "form-control",
            placeholder: placeholder,
            value: value || ""
        });
    return $('<div>').addClass("form-group").append([label, input]);
}

function makeChatContainer(id, listId, chatsId, onJoin) {
    var list = $('<ul>').prop({
        id: listId,
        class: "nav nav-pills nav-stacked"
    });
    var panel = makePanel().append(list);

    var rooms = $('<div>').addClass('col-lg-2').append([panel, makeInputField("Join!", onJoin, function() {})]);

    var container = $('<div>').prop({
        id: chatsId,
        class: "container-fluid"
    });
    var chatbox = $('<div>').addClass('col-lg-8').append(container);

    return $('<div id="' + id + '">')
        .append([rooms, chatbox])
        .hide();
}

function makeSwitcher(id, contents, onClick, onClose) {
    var close = undefined;

    if(onClose) {
        close = $('<a href="#" class="out-of-way pull-right">')
            .append("✖")
            .click(onClose)
            .hide();
    } else {
        close = $('<span>').hide();
    }

    var name = $('<a href="#">')
        .append(contents)
        .append(close)
        .click(onClick);

    return $('<li class="switcher" id="' + id + '">')
        .append(name)
        .mouseenter(function() {
            close.show();
        })
        .mouseleave(function() {
            close.hide();
        });
}

function makeBadge() {
    return $('<span class="badge">');
}

function makePill(className, contents, onClick) {
    return $('<li class="' + className +'">').append($('<a href="#">')
                                                     .html(contents)
                                                     .click(onClick));
}

function makePanel() {
    return $('<div>').addClass('well well-sm');
}

function makePills(className) {
    return $('<ul class="nav nav-pills ' + className + '">');
}

function makeTextLine(id, className, timestamp, string) {
    function time(timestamp) {
        var date = new Date(timestamp);
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        return date.getHours() + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }

    return $('<p id="' + id + '" class="' + className + '">')
        .append(time(timestamp))
        .append(string);
}

function makeTextArea(className) {
    var text = $('<div class="' + className + '">');

    text.bind('scroll-to-bottom', function(event) {
        var area = text.get()[0];
        text.scrollTop(area.scrollHeight - area.clientHeight)
    });

    return text;
}

function makeInputField(name, onClick, onKey) {
    var field = $('<input type="text" class="form-control form-group">')
        .keyup(function(e) {
            if (e.keyCode == 13) {
                onClick(field.val());
                field.val("");
            } else {
                onKey(field.val());
            }
        });
    var button = $('<span class="input-group-btn">').append(
        $('<button class="btn btn-primary">')
            .html(name)
            .click(function() {
                onClick(field.val());
                field.val("");
            }));

    return $('<div class="form-group input-field">').append(
        $('<div class="input-group">')
            .append(field)
            .append(button));
}

function makeChatbox(id, className, controls, text, input) {
    return $('<div class="' + className + '" id="' + id + '">')
        .append(controls)
        .append(text)
        .append(input);
}

function makeButton(className, contents, onClick) {
    return $('<button type="button" class="btn ' + className + '">')
        .prop({
            type: "button",
            class: "btn " + className
        })
        .append(contents)
        .click(onClick);
}

function makeButtonGroup() {
    return $('<div class="btn-group">');
}

function makeStreamBox(className) {
    return $('<video class="video-stream ' + className + '" autoplay>');
}

function makeSplitGrid(contents) {
    var row = $('<div class="row">');
    contents.forEach(function(content) {
        var col = $('<div class="col-lg-' + Math.floor(12 / contents.length) + '">')
            .append(content);
        row.append(col);
    });
    return row;
}

function makeDiv() {
    return $('<div>');
}
