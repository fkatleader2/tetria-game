tetresse.modes.default.settings.modules.push("tetriasocket");
tetresse.modules.tetriasocket = {
    socket: null,
    setup() {
        try {
            this.socket = this.game.socket = this.rooms.socket = io("https://tetria.tetresse.com");
            console.log("connected");
            this.rooms.init();
            this.game.init();
        } catch(e) {
            console.log("offline mode");
        }
    },
    rooms: { // refresh, joined, left, created | get, create, join
        socket: null,
        logCommunication: true,
        logShow: false,
        communication: [],
        init() {
            this.socket.on("roomsRefresh", function(data) { // data: [{id, name, curPlayers, maxPlayers}, {}]
                tetresse.modules.tetriasocket.rooms.log("roomsRefresh", data);
                tetresse.modules.tetria.menus.rooms.add(data);
            });
            this.socket.on("roomsJoined", function(data) { // data: {id}
                tetresse.modules.tetriasocket.rooms.log("roomsJoined", data);
                tetresse.modules.tetria.menus.rooms.update({id: data.id}, 1);
            });
            this.socket.on("roomsLeft", function(data) { // data: {id}
                tetresse.modules.tetriasocket.rooms.log("roomsLeft", data);
                tetresse.modules.tetria.menus.rooms.update({id: data.id}, -1);
            });
            this.socket.on("roomsCreated", function(data) { // data: {id, name, curPlayers, maxPlayers}
                tetresse.modules.tetriasocket.rooms.log("roomsCreated", data);
                tetresse.modules.tetria.menus.rooms.add(data);
            });
        },
        refresh() {
            if (this.socket == null) return;
            this.socket.emit("roomsGet");
            this.log("roomsGet");
        },
        create(name) {
            if (this.socket == null) return;
            this.socket.emit("roomsCreate", {name: name});
            this.log("roomsCreate", {name: name});
        },
        join(id) {
            if (this.socket == null) return;
            this.socket.emit("roomsJoin", {id: id});
            this.log("roomsJoin", {id: id});
        },
        log(msg, data) {
            if (!this.logCommunication) return;
            this.communication.push({time: (new Date()).getTime(), msg: msg, data});
            if (this.logShow) { console.log("-----\n" + msg); console.log(data); }
        }
    },
    game: { // action, chat, leave | actionO, joined, left
        socket: null,
        logCommunication: true,
        logShow: true,
        communication: [],
        players: [],
        init() {
            this.socket.on("gameAction", function(data) { // {type, data} type: "next|place|move|rotate|drop|hold|ability", data: {player, amount|target}
                console.log("recieved: ");
                console.log(data);
            });
            // this.socket.on("gameActionExtra", function(data) { // {type, data}

            // });
            this.socket.on("gameJoined", function(data) { // {name, spectator: false, team: 1|2}

            });
            this.socket.on("gameLeft", function(data) { // {name}

            });
            this.socket.on("gameChat", function(data) { // {time, msg}

            });
            this.socket.on("gameData", function(data) { // {bag: str, games: [{name, board, curpiece}]}

            });
        },
        setup(game) { // every tetresse board created goes through here
            tetresse.modules.tetriasocket.game.players.push(game);
            if (!game.state.spectating) {
                console.log("players:");
                console.log(game);
                tetresse.on("placedPiece", function(args, action) {
                    tetresse.modules.tetriasocket.game.action({type: "next", data: action});
                }, null, "socketAction", 100, game.listeners);
                ["hold", "move", "rotate", "drop"].forEach(function(listener) {
                    tetresse.on(listener, function(args, action) {
                        tetresse.modules.tetriasocket.game.action({type: args,action: action});
                    }, listener, "socketAction-" + listener, 100, game.listeners);
                });
            }
        },
        action(a) {
            this.log("gameActionSend", a);
            if (this.socket == null) return;
            this.socket.emit("gameActionSend", a);
        },
        chat(msg) {

        },
        leave() {

        },
        log(msg, data) {
            if (!this.logCommunication) return;
            this.communication.push({time: (new Date()).getTime(), msg: msg, data});
            if (this.logShow) { console.log("----- " + msg); console.log(data); }
        }
    }
}