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

function makeChatContainer(id) {
    var list = $('<ul id="room-list" class="nav nav-pills nav-stacked">');
    var rooms = $('<div class="col-lg-3">').append(list);
    var container = $('<div class="container-fluid" id="chatbox-container">');
    var chatbox = $('<div class="col-lg-9">').append(container);
    var row = $('<div class="row">')
        .append(rooms)
        .append(chatbox);

    return $('<div id="' + id + '">')
        .append(row)
        .hide();
}

function makeSwitcher(id, contents, onClick, onDblClick) {
    var name = $('<a href="#">')
        .append(contents)
        .click(onClick)
        .dblclick(onDblClick);

    return $('<li class="switcher" id="' + id + '">')
        .append(name);
}
