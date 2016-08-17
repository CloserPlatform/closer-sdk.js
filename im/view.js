function makeLoginForm(id, onClick) {
    var form = $('<form>')
        .append('<input id="server" type="text" value="localhost:5431">')
        .append('<br>')
        .append('<input id="session-id" type="text" value="Alice">')
        .append('<br>');

    var button = $('<button>')
        .html("Login!")
        .click(onClick);

    return $('<div id="' + id + '" class="login-form">')
        .append(form)
        .append(button)
        .hide();
}

function makeChatContainer(id, listId, chatsId, onJoin) {
    var controls = makeInputField("Join!", onJoin);
    var list = $('<ul id="' + listId + '" class="nav nav-pills nav-stacked">');
    var rooms = $('<div class="col-lg-3">')
        .append(list)
        .append(controls);
    var container = $('<div class="container-fluid" id="' + chatsId + '">');
    var chatbox = $('<div class="col-lg-9">').append(container);
    var row = $('<div class="row">')
        .append(rooms)
        .append(chatbox);

    return $('<div id="' + id + '">')
        .append(row)
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
    return $('<div class="panel">');
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

function makeInputField(name, onClick) {
    var field = $('<input type="text">')
        .keyup(function(e) {
            if (e.keyCode == 13) {
                onClick(field.val());
                field.val("");
            }
        });
    var button = $('<button>')
        .html(name)
        .click(function() {
            onClick(field.val());
            field.val("");
        });

    return $('<div class="input-field">')
        .append(field)
        .append(button);
}

function makeChatbox(id, className, controls, text, input) {
    return $('<div class="' + className + '" id="' + id + '">')
        .append(controls)
        .append(text)
        .append(input);
}

function makeButton(className, contents, onClick) {
    return $('<button type="button" class="btn ' + className + '">')
        .html(contents)
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
