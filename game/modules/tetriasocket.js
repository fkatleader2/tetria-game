tetresse.modules.tetriasocket = {
    socket: null,
    setup() {
        try {
            this.socket = io("https://tetria.tetresse.com");
            console.log("connected");
            this.initRooms();
        } catch(e) {
            console.log("offline mode");
        }
    },
    initRooms() {
        // on: refresh, joined, left, created
        // emit: join, create, leave
        this.socket.on("roomsRefresh", function(data) { // data: [{id, name, curPlayers, maxPlayers}, {}]
            for (var i = 0; i < data.length; i++)
                tetresse.modules.tetriasocket.rooms.add(data[i]);
        });
        this.socket.on("roomsJoined", function(data) { // data: {id} TODO make this neater
            var r = tetresse.modules.tetriasocket.rooms;
            if (r.rooms[data.id] === undefined) { console.log("room id [" + data.id + "] undefined"); return; }
            r.update(data.id, r[data.id].numPlayers + 1);
        });
        this.socket.on("roomsLeft", function(data) { // data: {id}
            var r = tetresse.modules.tetriasocket.rooms;
            if (r[data.id] === undefined) { console.log("room id [" + data.id + "] undefined"); return; }
            r.update(data.id, r[data.id].numPlayers - 1);
        });
        this.socket.on("roomsCreated", function(data) { // data: {id, name, curPlayers, maxPlayers}
            tetresse.modules.tetriasocket.rooms.add(data);
        });
    },
    rooms: {
        rooms: {},
        clear() {
            this.rooms = {};
            tetresse.modules.tetria.components.rooms.clear();
        },
        update(id, data) { // data: {numPlayers, maxPlayers}
            for (var v in data)
                this.rooms[id][v] = data[v];
            tetresse.modules.tetria.components.rooms.update(this.rooms[id]);
        },
        add(data) {
            this.rooms[data.id] = data;
            tetresse.modules.tetria.components.rooms.add(data);
        },
        refresh() {
            var socket; if ((socket = this.getSocket()) == null) return;
            socket.emit("roomsGet");
        },
        sortBy(stuff) { /* TODO */},
        create(name) {
            var c = tetresse.modules.tetria.components;
            c.rooms.clean(); 
            c.game.init();
            var socket; if ((socket = this.getSocket()) == null) return;
            socket.emit("roomsCreate", {name: name});
        },
        join(id) {
            var socket; if ((socket = this.getSocket()) == null) return;
            socket.emit("roomsJoin", {id: id});
        },
        getSocket() {
            var socket = tetresse.modules.tetriasocket.socket; 
            if (socket == null) { console.log("not connected"); return null; }
            return socket;
        }
    },
    initGames() {

    }
}