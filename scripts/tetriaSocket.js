tetresse.modules.tetriaSocket = {
    uid: 0,
    onConnect: {}, // funcs only in here
    onFuncs: {}, // ["play-update"]: {"rooms": [func1, func2, ...], "play": [func1, ...]}
    connected: false,
    socket: null,
    setup() {
        try {
            this.socket = io();
            this.socket.on('connect', this.connect);
            this.socket.on('tetria-uid', function(data) {
                tetresse.modules.tetriaSocket.uid = data.d;
            });
            this.socket.on("err", function(data) {
                console.warn("server error: " + data);
            });
        } catch (e) {
            console.warn(e);
        }
    },
    create(game, settings) {},
    send(term, data) {
        var ts = tetresse.modules.tetriaSocket;
        console.log('%csent:%c [' + term + '] ' + JSON.stringify(data), 'background: #c6dcff;', 'background: #000000000');
        if (ts.socket === null) return;
        ts.socket.emit(term, {d: data, t: (new Date()).getTime()});
    },
    recieve(term, func, view = "default") {
        var ts = tetresse.modules.tetriaSocket;
        if (ts.socket === null) return;
        var createOn = false;
        if (ts.onFuncs[term] === undefined) { ts.onFuncs[term] = {}; createOn = true; }
        if (ts.onFuncs[term][view] === undefined) ts.onFuncs[term][view] = [];
        if (createOn) {
            ts.socket.on(term, function(data) {
                if (tetresse.modules.tetriaSocket.uid !== data.d.uid)
                    console.log('%crecieved (%d):%c [%s] %s', 'background: #c6ffd3;', (new Date()).getTime(), 'background: #00000000;', this.term, JSON.stringify(data));
                for (var v in this.funcs[this.term])
                    for (var f of this.funcs[this.term][v])
                        f(data);
            }.bind({funcs: ts.onFuncs, term: term}));
        }
        ts.onFuncs[term][view].push(func);
    },
    stopRecieve(view = "default", term) {
        var ts = tetresse.modules.tetriaSocket;
        if (term === undefined)
            for (var t in ts.onFuncs)
                delete ts.onFuncs[t][view];
        // ts.socket.removeListener(term, ts.components[comp].func);
    },
    connect(data) {
        var ts = tetresse.modules.tetriaSocket;
        if (!ts.connected) { ts.connected = true; return; }
        console.log("connected");
        for (var v in ts.onConnect) ts.onConnect[v](data);
    },
    reconnect(lbl, func, remove = false) {
        if (typeof(func) !== "function") { console.warn("func is not a function"); return; }
        var ts = tetresse.modules.tetriaSocket;
        if (remove) delete ts.onConnect[lbl];
        else ts.onConnect[lbl] = func;
    },
};