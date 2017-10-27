export function fn() {
    return 123;
}

export function makeLoginForm(id, onClick) {
    let form = $("<form id=\"login_form\">")
        .append([makeInput("server", "Server:", "Server", "artichoke.ratel.io"),
            makeInput("ratel-server", "RatelServer:", "RatelServer", "briefcase.ratel.io"),
            makeInput("user-phone", "Phone:", "+48123456789")]);

    let button = $("<button class=\"btn btn-primary\" form=\"login_form\">")
        .append("Login!")
        .click(onClick);

    return $("<div>")
        .prop("id", id)
        .append([form, button])
        .hide();
}

export function makeLabel(id: string, className: string, name: string): JQuery {
    return $("<label>")
        .prop({
            for: id,
            class: className
        })
        .append(name);
}

export function makeInput(id: string, name: string, placeholder: string, value?: string): JQuery {
    let input = $("<input>")
        .prop({
            id,
            type: "text",
            class: "form-control",
            placeholder,
            value: value || ""
        });
    return $("<div>").addClass("form-group").append([makeLabel(id, "", name), input]);
}

export function makeCheckbox(id, value, checked, onClick?: (flag: boolean) => void) {
    let input = $("<input>")
        .prop({
            id,
            type: "checkbox",
            checked: !!checked
        });
    input.click(function () {
        if (onClick) {
            onClick(input.is(":checked"));
        }
    });
    return $("<div>").append(input, [makeLabel(id, "", value)]);
}

export function makeChatContainer(id, switcherId, chatboxesId, controlsId, onJoin) {
    let list = $("<ul>").prop({
        id: switcherId,
        class: "nav nav-pills nav-stacked"
    });
    let panel = makePanel(list).addClass("switchers-wrapper");
    let wrapper = makeDiv().addClass("switchers").append([panel, makeInputField("Join!", onJoin, function () {
        return undefined;
    })]);
    let switchers = $("<div>")
        .prop({
            id: "switchers-container",
            class: "col-xs-2"
        })
        .append(wrapper);

    let chatboxes = $("<div>").prop({
        id: chatboxesId,
        class: "col-xs-8"
    });

    let controls = $("<div>").prop({
        id: controlsId,
        class: "col-xs-2"
    });

    return $("<div>").prop("id", id).append([switchers, chatboxes, controls]);
}

export function makeAnchor(className, contents, onClick) {
    return $("<a href=\"#\">").addClass(className).append(contents).click(onClick);
}

export function makeSwitcher(id, contents, onClick, onClose) {
    let close = onClose ? makeAnchor("out-of-way pull-right", "✖", onClose) : $("<span>");
    close.hide();
    contents[0] = $("<span>").text(contents[0]);
    let switcher = contents.concat([close]);
    return $("<li>")
        .prop({
            id,
            class: "switcher"
        })
        .append($("<a href=\"#\">").append(switcher).click(onClick))
        .mouseenter(function () {
            close.show();
        })
        .mouseleave(function () {
            close.hide();
        });
}

export function makeBadge() {
    return $("<span>").addClass("badge");
}

export function makePill(className, contents, onClick) {
    return $("<li>").addClass(className).append(makeAnchor("", contents, onClick));
}

export function makePanel(contents) {
    let body = $("<div>").addClass("panel-body").append(contents);
    return $("<div>").addClass("panel panel-default").append([body]);
}

export function makePills(className) {
    return $("<ul>").addClass("nav nav-pills " + className);
}

export function makeTextLine(id: string, className: string, timestamp, sender, line) {
    function time(_timestamp) {
        let date = new Date(_timestamp);
        let minutes = "0" + date.getMinutes();
        let seconds = "0" + date.getSeconds();
        return date.getHours() + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);
    }

    function spanify(item) {
        return ((typeof item.jquery !== "undefined") ? item : $("<span>").text(item)).addClass("contents");
    }

    let ts = time(timestamp);
    return $("<p>")
        .prop({
            id,
            class: className
        })
        .append(sender === "" ? [ts, " ", spanify(line)] : [ts, " ", sender, ": ", spanify(line)]);
}

export function makeTextArea(className) {
    let text = $("<div>").addClass("panel panel-default " + className);

    text.bind("scroll-to-bottom", function (event) {
        let area = text.get()[0];
        text.scrollTop(area.scrollHeight - area.clientHeight);
    });

    return text;
}

export function makeInputField(name, onClick, onKey) {
    let field = $("<input>")
        .prop({
            type: "text",
            class: "form-control form-group"
        })
        .keyup(function (e) {
            if (e.keyCode === 13) {
                onClick(field.val());
                field.val("");
            } else {
                onKey(field.val());
            }
        });
    let button = $("<span>")
        .addClass("input-group-btn")
        .append($("<button>")
            .addClass("btn btn-primary")
            .append(name)
            .click(function () {
                onClick(field.val());
                field.val("");
            }));

    return $("<div>")
        .addClass("form-group input-field")
        .append($("<div>").addClass("input-group").append([field, button]));
}

export function makeNInputField(n: number, name: string, onClick: (arr: string[]) => void) {
    let fields = [];
    for (let i = 0; i < n; i++) {
        fields.push($("<input>")
            .prop({
                type: "text",
                class: "form-control form-group",
                style: "width: " + 100 + "%"
            }));
    }

    let button = $("<span>")
        .addClass("input-group-btn")
        .append($("<button>")
            .addClass("btn btn-primary")
            .append(name)
            .click(function () {
                onClick(fields.map(function (f) {
                    return f.val();
                }));
                fields.forEach(function (f) {
                    f.val("");
                });
            }));

    return $("<div>")
        .addClass("form-group input-field")
        .append($("<div>").addClass("input-group").append(fields).append(button));
}

export function makeChatbox(id, className, text, input) {
    return $("<div>")
        .prop({
            id,
            class: className
        })
        .append([text, input]);
}

export function makeButton(className, contents, onClick) {
    return $("<button>")
        .prop({
            type: "button",
            class: "btn " + className
        })
        .append(contents)
        .click(onClick);
}

export function makeButtonGroup() {
    return $("<div>").addClass("btn-group buttons");
}

export function makeStreamBox(id: string, name: string, stream: any, muted: boolean) {
    const video = $("<video>")
        .prop({
            id,
            class: "video-stream",
            autoplay: true,
            muted,
            srcObject: stream.stream
        });

    let status = "";
    if (stream.muted && stream.paused) {
        status = "(paused & muted)";
    }
    else if (stream.muted) {
        status = "(muted)";
    }
    else if (stream.paused) {
        status = "(paused)";
    }

    const label = makeLabel(id, "", name);

    const arr: any[] = [label, video, status];

    const panel = $("<div>")
        .addClass("panel panel-default stream-wrapper")
        .append(arr);
    return $("<div>").append(panel);
}

export function makeSplitGrid(contents: JQuery[]) {
    let size = Math.ceil(Math.sqrt(contents.length)); // FIXME Should be 1 for contents.length == 2.
    let rows = [];
    for (let i = 0; i < size; i++) {
        rows.push($("<div>").addClass("grid-row"));
    }
    for (let i = 0; i < contents.length; i++) {
        // FIXME Size it properly.
        rows[Math.floor(i / size)].css("height", (1 / size * 100) + "%").append(contents[i].addClass("grid-item"));
    }
    return $("<div>").addClass("grid").append(rows);
}

export function makeDiv(): JQuery {
    return $("<div>");
}

export function makeCallbox(id: string, className: string, streams: JQuery[]): JQuery {
    return $("<div>")
        .prop({
            id,
            class: className
        })
        .append(streams);
}

export function makeLineBreak(): JQuery {
    return $("<br>");
}

export function makeAvatar(className, url): JQuery {
    return $("<img>").prop({
        src: url,
        class: className
    });
}

export function makeControls(id, contents): JQuery {
    return $("<div>")
        .prop({
            id,
            class: "controls"
        })
        .append(contents);
}

export function makeEmbed(object): JQuery | string {
    switch (object.tag) {
        case "MEDIA":
            switch (object.context.mimeType) {
                case "image/gif":
                    return makePanel([$("<img>").prop("src", object.context.content),
                        $("<br>"),
                        object.context.description])
                        .addClass("text-center")
                        .css("width", "50%");
                default:
                    return "";
            }

        case "AGENT":
            return $("<span>").text("User agent: " + object.context.agent);

        default:
            return "";
    }
}

export function confirmModal(title: string, text: string, confirmText: string, onConfirm: () => void,
                             cancelText: string, onCancel: () => void) {
    let buttons = {};
    buttons[confirmText] = function () {
        onConfirm();
        modal.dialog("close");
    };
    buttons[cancelText] = function () {
        onCancel();
        modal.dialog("close");
    };
    let modal: any = makeDiv()
        .prop("title", title)
        .append($("<span>").text(text))
        .dialog({
            "resizable": false,
            "height": "auto",
            "width": 400,
            "modal": true,
            "buttons": buttons
        });

    return function () {
        modal.dialog("close");
    };
}

export function createImageStream(url, fps, onLoad) {
    const canvas: any = $("<canvas>");
    const ctx = canvas.get(0).getContext("2d");
    const img = new Image();
    img.onload = function () {
        ctx.drawImage(img, 0, 0);
        onLoad(canvas.get(0).captureStream(fps));
    };
    img.crossOrigin = "anonymous";
    img.src = url;
}
