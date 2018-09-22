tetresse.modules.tetriasocket = {
    socket: null,
    setup() {
        try {
            this.socket = this.game.socket = this.rooms.socket = io("https://tetria.tetresse.com");
            console.log("connected");
            this.rooms.init();
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
                tetresse.modules.tetria.rooms.add(data);
            });
            this.socket.on("roomsJoined", function(data) { // data: {id}
                tetresse.modules.tetriasocket.rooms.log("roomsJoined", data);
                tetresse.modules.tetria.rooms.update({id: data.id}, 1);
            });
            this.socket.on("roomsLeft", function(data) { // data: {id}
                tetresse.modules.tetriasocket.rooms.log("roomsLeft", data);
                tetresse.modules.tetria.rooms.update({id: data.id}, -1);
            });
            this.socket.on("roomsCreated", function(data) { // data: {id, name, curPlayers, maxPlayers}
                tetresse.modules.tetriasocket.rooms.log("roomsCreated", data);
                tetresse.modules.tetria.rooms.add(data);
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
    game: { // action, chat, leave | oAction, joined, left
        socket: null,
        logCommunication: true,
        logShow: false,
        communication: [],
        init() {
            
        }
    }
}