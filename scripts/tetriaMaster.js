// TODO fix problem of too much empty space at some screen sizes
/**
 * goto(view)
 * views
 *      [rooms, play, mod, settings, results]
 *          overlay - whether to preserve (clean) previous view
 *          built - true if built
 *          setup() - on load
 *          build() - on enter
 *          clean() - on leave
 *          socketInterface(data, init) - function for socket to pass data through, init is true if initializing mode
 * components
 *      [room, textEntry, button, results]
 *          setup() - on load
 *          create() - to create instance
 *          destroy() - to destroy instance
 */

tetresse.modules.tetriaMaster = {
    currentView: [],
    currentRoom: {
        rid: null,
        next: [],
        players: {}, // [uid]: {game: gameId, d: data (temp)}
        playerQueue: [],
        spectators: [],
        phase: -1
    },
    create(game, settings) {
        if (settings.m.tetriaMaster === undefined) return;
        // console.log(JSON.stringify(settings.m.));
        game.modules.tetriaMaster = {actions: [], tActions: [], action: 0, placed: 0, pid: 0, hpid: -1, incoming: []};
        tetresse.on(game, "collapse", 30, function(game, _0, value, event) {
            var tm = game.modules.tetriaMaster;
            if (value.length !== 0) return;
            for (var i = 0; i < tm.incoming.length; i++) {
                game.board.splice(0, 1);
                var row = []
                for (var c = 0; c < game.board[0].length; c++) 
                    row.push(c != tm.incoming[i] ? "garbage" : "");
                game.board.push(row);
            }
            tm.incoming = [];
            tetresse.execute(game, "incoming", tm.incoming.length);
        });
        if (settings.m.tetriaMaster.playable) {
            for (var e of ["hold", "move", "rotate", "softdrop", "place", "collapse", "incoming"])
                tetresse.on(game, e, 30, function(game, _0, value, event) {
                    if (tetresse.modules.tetriaMaster.currentRoom.phase !== 1) return;
                    // console.log('sending action: ' + event);
                    var tm = game.modules.tetriaMaster;
                    if (event === "collapse") 
                        if (value.length === 0) return; 
                        else value = {amt: value.length, spin: game.cur.spin, combo: game.cur.combo, b2b: game.cur.b2b};
                    tetresse.modules.tetriaSocket.send("play-update",
                        {event: "game-" + event, value: value, aid: tm.action, pid: tm.pid});
                    tm.action++;
                    if (event === "hold") {
                        var temp = tm.hpid;
                        tm.hpid = tm.pid;
                        tm.pid = temp === -1 ? tm.placed + 1 : temp;
                    }
                    if (event === "place") {
                        tm.placed++; 
                        tm.pid = tm.placed + (tm.hpid === -1 ? 0 : 1);
                    }
                });
        }
    },
    gameIds: [],
    userType: "", // player, spectator, HDspectator
    loading() { // loading graphic
        console.log("loading");
    },
    loaded() { // entry point for game
        console.log("loaded");
        tetresse.setup();
        for (var view in this.views)
            if (this.views[view].setup !== undefined) this.views[view].setup();
        for (var comp in this.components)
            if (this.components[comp] !== undefined) this.components[comp].setup();
        // for (var component in this.components)
        //     if (this.components[component].setup != null) this.components[component].setup();
        this.goto("rooms");
        // this.goto("results");
        // this.goto("settings");

        document.getElementById("loading").style.display = "none";
    },
    goto(view) { // adds view to currentView stack. If already in stack, cleans / pops stack until view is on top
        if (view === undefined && this.currentView.length > 1) view = this.currentView[this.currentView.length - 2];
        var i, i2, cur;
        for (i = this.currentView.length - 1; i >= 0; i--) if (this.currentView[i] == view) break;
        if (i >= 0) // if in stack, pop all above, clean first overlaying
            while (this.currentView.length > i) {
                cur = this.currentView.pop();
                if (this.views[cur].built) { this.views[cur].clean(); this.views[cur].built = false; }
            }
        if (!this.views[view].overlay && i < 0) { // clean overlays if this is not overlay
            for (i2 = this.currentView.length - 1; i2 >= 0; i2--) {
                cur = this.currentView[i2];
                if (this.views[cur].built) { this.views[cur].clean(); this.views[cur].built = false; }
                else break;
            }
        }
        this.currentView.push(view);
        if (!this.views[view].built) { this.views[view].build(); this.views[view].built = true; }
    },
    views: {
        rooms: {
            setup() {
                // create room
                $("#roomsCreate").on("click", function(e) {
                    var name = document.getElementById("roomsName").innerHTML;
                    if (name.length < 3 || name.length > 16) {
                        console.warn('invalid room name'); return; }
                    tetresse.modules.tetriaMaster.goto("play");
                    tetresse.modules.tetriaSocket.send("rooms-create", {name: name});
                });
            },
            build() {
                var tm = tetresse.modules;
                $("#rooms-container")[0].classList.remove("hidden");
                for (var v in this.si)
                    tm.tetriaSocket.recieve(v, this.si[v], "rooms");
                tm.tetriaSocket.send("rooms-update", {enable: true});
                tm.tetriaSocket.reconnect("rooms", this.socketReconnect);
                // tetresse.start(tetresse.games.get(0));
            },
            clean() {
                var tm = tetresse.modules;
                $("#rooms-container")[0].classList.add("hidden");
                tetresse.modules.tetriaSocket.stopRecieve("rooms");
                tetresse.modules.tetriaSocket.send("rooms-update", {enable: false});
                tm.tetriaSocket.reconnect('rooms', this.socketReconnect, true);
            },
            socketReconnect() {
                tetresse.modules.tetriaSocket.send("rooms-update", {enable: true});
            },
            si: {
                "rooms-update": function(data) {
                    var rooms = tetresse.modules.tetriaMaster.views.rooms;
                    for (r of data.d) {
                        delete (e = r.event);
                        if (e === "create") rooms.create(rooms.list, r);
                        else if (e === "destroy") rooms.destroy(rooms.list, r);
                        else if (e === "update") rooms.update(rooms.list, r);
                        else console.warn("unrecognizable event: " + e + ", " + JSON.stringify(r));
                    }
                },
                "rooms-update-init": function(data) {
                    var tm = tetresse.modules.tetriaMaster;
                    var ele = document.getElementById("rooms-list");
                    while (ele.children.length != 0) ele.removeChild(ele.children[0]);
                    tm.views.rooms.list = {};
                    tm.views.rooms.si["rooms-update"](data);
                },
                "play-update-init": function(data) {
                    var tm = tetresse.modules.tetriaMaster;
                    tm.goto("play");
                    tm.views.play.si["play-update-init"](data);
                },
                // "play-update-init": function(data) {
                //     var tm = tetresse.modules.tetriaMaster;
                //     tm.goto("play");
                //     tm.currentRoom = data.d;
                //     tm.userType = "player";
                // }
            },
            list: {},
            create(list, room) {
                if (room.rid === undefined) { console.warn("invalid room: " + JSON.stringify(room)); return; }
                if (list[room.rid] !== undefined) return;
                list[room.rid] = room;

                var table = $('#rooms-list')[0];
                if (table.children.length == 0 || table.children[table.children.length - 1].children.length == 2) {
                    table.appendChild(document.createElement("div"));
                }
                var title = document.createElement("span");
                title.innerHTML = room.name;
                var players = document.createElement("div");
                players.classList.add("players");
                for (var j = 0; j < room.maxPlayers; j++) {
                    var box = document.createElement("div");
                    // if (j < room.numPlayers) box.classList.add("filled");
                    players.appendChild(box);
                }
                var ele = document.createElement("div");
                ele.id = "room-" + room.rid;
                ele.classList.add("button");
                ele.appendChild(title);
                ele.appendChild(players);
                table.children[table.children.length - 1].appendChild(ele);

                $("#" + ele.id).on("click", function(e) {
                    tetresse.modules.tetriaSocket.send("play-join", {room: parseInt(e.target.id.substring(5)), type: 'player'});
                });
                var rooms = tetresse.modules.tetriaMaster.views.rooms;
                rooms.update(rooms.list, room);
            },
            update(list, room) {
                if (room.rid === undefined) { console.error("room does not have id"); return; }
                // if (list[room.rid] === undefined) { console.error("rid does not exist"); return; }
                // if (room.numPlayers !== undefined)
                // for (var v in room)
                //     this.rooms[room.rid][v] = room[v];
                // room = this.rooms[room.rid];

                // if (this.rooms[room.rid].numPlayers <= 0) this.remove(room.rid);

                var ele = document.getElementById("room-" + room.rid);
                if (ele == null) return;
                if (room.numPlayers === 0 && room.numSpectators === 0) {
                    ele.parentElement.removeChild(ele);
                    delete tetresse.modules.tetriaMaster.views.rooms.list[room.rid];
                    return;
                }

                var players = ele.children[1];
                for (var i = 0; i < players.children.length; i++) {
                    if (i < room.numPlayers) players.children[i].classList.add("filled");
                    else players.children[i].classList.remove("filled");
                };
            },
            destroy(list, room) {
                var ele = document.getElementById("room-" + room.rid);
                ele.parentNode.removeChild(ele);

                delete this.rooms[room.rid];
                this.clear();
                for (var v in this.rooms)
                    this.add(this.rooms[v]);
            },
        },
        play: {
            setup() {
                var tm = tetresse.modules;
                $("#settings-button").click(function(e) {
                    tm.tetriaMaster.goto("settings");
                });

                document.getElementById("exit-button").onclick = function(e) {
                    tetresse.modules.tetriaMaster.goto("rooms");
                }

                for (var i = 0; i < 6; i++)
                    tm.tetriaMaster.gameIds.push(tetresse.create({m: {
                        defaultGraphics: {id: "game-" + i, layout: i === 0 ? {} : {"board": 1, "mana": 1, "incoming": 1}},
                        tetriaMaster: {playable: i === 0},
                        defaultControls: i === 0 ? {} : undefined
                    }, generateNext: false
                    }));
                tm.tetriaMaster.components.chat.setup();
            },
            build() {
                $("#game-container")[0].classList.remove("hidden");
                var tm = tetresse.modules;
                for (var v of ["play-update", "play-update-init"])
                    tm.tetriaSocket.recieve(v, this.si[v], "play");
                tm.tetriaSocket.reconnect("play", this.socketReconnect);

                tm.tetriaMaster.components.chat.clear();
                tm.tetriaMaster.components.chat.generate(true);

                // for (var e of tm.tetriaMaster.gameIds) if (e !== 0)
                //     document.getElementById("game-" + e).classList.add("hidden");

                var game = tetresse.games.get(tm.tetriaMaster.gameIds[0]);
                game.modules.defaultGraphics.settings.abilities = {ClearTop: 1}; //{"ClearTop": 1, "Abc": 2, "class": 1, "passive": 0};
                game.settings.generateNext = true;
                tetresse.start(game);
            },
            clean() {
                var tm = tetresse.modules;
                for (var g of tm.tetriaMaster.gameIds)
                    tetresse.reset(tetresse.games.get(g));
                $("#game-container")[0].classList.add("hidden");
                tetresse.modules.tetriaSocket.send("play-leave", {});
                console.warn("cleaning play");
                tetresse.modules.tetriaSocket.stopRecieve("play");
                tm.tetriaSocket.reconnect("play", this.socketReconnect, true);
            },
            socketReconnect(data) {
                tetresse.modules.tetriaMaster.goto("rooms");
            },
            si: {
                "play-update-init": function(data) {
                    // TODO: spectator view (right now assuming you want to play)
                    var tm = tetresse.modules.tetriaMaster;
                    tm.currentRoom = {
                        rid: data.d.rid,
                        players: {},
                        playerQueue: [],
                        spectators: {},
                        phase: data.d.phase
                    };
                    var u;
                    for (t of ['players', 'spectators']) for (u of data.d[t])
                        tm.currentRoom[t][u.uid] = u;
                    tm.views.play.refresh();
                },
                "play-update": function(data) {
                    var event = data.d.event;
                    var tm = tetresse.modules.tetriaMaster;
                    if (event.startsWith("game")) event = "game";
                    if (tm.views.play.events[event] === undefined) { console.warn("Unknown event: " + event); return; }
                    tm.views.play.events[event](data);
                }
            },
            refresh() { // relayout boards and (TODO) spectators
                var tm = tetresse.modules.tetriaMaster;
                var players = tm.currentRoom.players;
                var t = Object.keys(players).length + tm.currentRoom.playerQueue.length < 2;
                document.getElementById("play-waitingForPlayers").classList[t ? "remove" : "add"]("hidden");
                var u, i;
                var uid = tetresse.modules.tetriaSocket.uid;
                for (i = 1; i < tm.gameIds.length; i++) {
                    var used = false;
                    for (u in players) { if (u === uid) continue;
                        if (players[u].game === i) { used = true; break; }
                    }
                    if (used) continue;
                    used = false;
                    for (u in players) { if (u == uid) continue;
                        if (players[u].game === -1) { players[u].game = tm.gameIds[i]; used = true; break; }
                    }
                    if (!used) document.getElementById("game-" + i).classList.add("hidden");
                }
                if (players[uid] === undefined) players[uid] = {};
                players[uid].game = tm.gameIds[0];
                for (u in players)
                    document.getElementById("game-" + players[u].game).classList.remove("hidden");
            },
            events: {
                countdown: function(data) {
                    var tm = tetresse.modules.tetriaMaster;
                    if (tm.currentView[tm.currentView.length - 1] !== "play")
                    tm.goto("play");
                    var countdown = function(countdown, count) {
                        var chat = tetresse.modules.tetriaMaster.components.chat;
                        chat.add("countdown", count);
                        chat.generate();
                        if (count === 1) return;
                        window.setTimeout(countdown, 1000, countdown, count - 1);
                    };
                    var g, u;
                    tm.currentRoom.phase = 0;
                    for (g of tm.gameIds)
                        tetresse.reset(tetresse.games.get(g));
                    var norm = {curAction: 0, piece: 0};
                    for (u of data.d.players) {
                        tm.currentRoom.players[u] = {uid: u};
                        for (g in norm) tm.currentRoom.players[u][g] = norm[g];
                        tm.currentRoom.players[u].actions = [];
                        tm.currentRoom.players[u].game = -1;
                    }
                    tetresse.games.get(tm.gameIds[0]).settings.generateNext = false;
                    tetresse.games.get(tm.gameIds[0]).cur.next = data.d.next.slice();
                    for (g = 1; g < tm.gameIds.length; g++) tetresse.games.get(tm.gameIds[g]).cur.next = data.d.next.slice();
                    tm.views.play.refresh();
                    countdown(countdown, data.d.amount);
                },
                play: function(data) {
                    var chat = tetresse.modules.tetriaMaster.components.chat;
                    chat.add("countdown", "PLAY!");
                    chat.generate();
                    var tm = tetresse.modules.tetriaMaster;
                    tm.currentRoom.phase = 1;
                    var g;
                    for (g of tm.gameIds) tetresse.start(tetresse.games.get(g));
                },
                results: function(data) {
                    var tm = tetresse.modules.tetriaMaster;
                    var chat = tetresse.modules.tetriaMaster.components.chat;
                    chat.add("countdown", "RESULTS...");
                    chat.generate();
                    tm.currentRoom.phase = 2;
                    tm.goto("results");
                    // TODO add timer for going back to -1 phase (waiting)
                },
                waiting: function(data) {
                    console.log("waiting for more players...");
                },
                left: function(data) {
                    console.log("user %d left", data.d.uid);
                },
                next: function(data) {
                    // TODO push next pieces onto game board and currentRoom.next
                },
                game: function(data) {
                    var tm = tetresse.modules.tetriaMaster;
                    var ts = tetresse.modules.tetriaSocket;
                    if (tm.currentRoom.phase !== 1) { console.warn("recieved play-update during invalid phase"); return; }
                    var event = data.d.event.substring(5, data.d.event.length);
                    var game = tetresse.games.get(tm.currentRoom.players[data.d.uid].game);
                    if (game === null) { console.warn("no game allocated for play-update"); return; }
                    if (event === "sent") {
                        game = tetresse.games.get(tm.currentRoom.players[data.d.to].game);
                        for (var e of data.d.garbage)
                            game.modules.tetriaMaster.incoming.push(e);
                        tetresse.execute(game, "incoming", game.modules.tetriaMaster.incoming.length);
                    }
                    if (data.d.uid === tetresse.modules.tetriaSocket.uid) return;

                    if (event === "hold") {
                        tetresse.utils.game.hold(game);
                    } else if (event === "move") {
                        tetresse.utils.game.move(game, data.d.value);
                    } else if (event === "rotate") {
                        tetresse.utils.game.rotate(game, data.d.value.amt);
                    } else if (event === "softdrop") {
                        tetresse.utils.game.softDrop(game, data.d.value);
                    } else if (event === "place") {
                        game.cur.next.push()
                        tetresse.utils.game.hardDrop(game, data.d.value);
                    } else console.warn("unrecognized game event: " + event);
                    
                }
            },
            spectating: false,
            setupGame(game) {
                if (!game.state.spectating) { // generate keybinds table
                    // TODO include this in tetresse utils
                    var labelPairs = {"8": "backspace","9": "tab","13": "enter","16": "shift","17": "ctrl","18": "alt","19": "pause/break","20": "caps lock","27": "escape","32": "(space)","33": "page up","34": "page down","35": "end","36": "home","37": "left arrow","38": "up arrow","39": "right arrow","40": "down arrow","45": "insert","46": "delete","48": "0","49": "1","50": "2","51": "3","52": "4","53": "5","54": "6","55": "7","56": "8","57": "9","65": "a","66": "b","67": "c","68": "d","69": "e","70": "f","71": "g","72": "h","73": "i","74": "j","75": "k","76": "l","77": "m","78": "n","79": "o","80": "p","81": "q","82": "r","83": "s","84": "t","85": "u","86": "v","87": "w","88": "x","89": "y","90": "z","91": "left window key","92": "right window key","93": "select key","96": "numpad 0","97": "numpad 1","98": "numpad 2","99": "numpad 3","100": "numpad 4","101": "numpad 5","102": "numpad 6","103": "numpad 7 ","104": "numpad 8","105": "numpad 9","106": "multiply","107": "add","109": "subtract","110": "decimal point","111": "divide","112": "f1","113": "f2","114": "f3","115": "f4","116": "f5","117": "f6","118": "f7","119": "f8","120": "f9","121": "f10","122": "f11","123": "f12","144": "num lock","145": "scroll lock","186": "semi-colon","187": "equal sign","188": "comma","189": "dash","190": "period","191": "forward slash","192": "grave accent","219": "open bracket","220": "back slash","221": "close braket","222": "single quote"};
                    var table = document.getElementById("settings-area-keybinds-table").children[0];
                    for (var label in game.keyBinds) {
                        var tr = document.createElement("tr");
                        tr.id = "settings-area-keybinds-table-" + label + "-row";
                        var shownLabel = label.length > 3 ?
                            label.substring(0, 1).toUpperCase() + label.substring(1) : label.toUpperCase();
                        var keyArr = [];
                        game.keyBinds[label].forEach(function(ele) {
                            keyArr.push(labelPairs[ele]);
                        });
                        [{innerHTML: shownLabel}, {innerHTML: game.keyBinds[label].toString()}, {innerHTML: keyArr.toString()}].forEach(function(ele) {
                            var td = document.createElement("td");
                            for (var v in ele) td[v] = ele[v];
                            tr.appendChild(td);
                        });
                        table.appendChild(tr);
                    }
                }
            }
        },
        results: {
            overlay: true,
            setup() {
                
            },
            build() {
                $("#results-container")[0].classList.remove("hidden");
            },
            clean() {
                $("#results-container")[0].classList.add("hidden");
            },
            create() {
                
            },
            r: {
                rank() {
                    
                },
                replay() {
                    
                },
                stats() {
                    
                },
                
            }
        },
        settings: {
            overlay: true,
            setup() {
                $("#settings-close").click(function(e) {
                    tetresse.modules.tetriaMaster.goto();
                });
                // update current values
                // general: arr, das, line clear delay
                // keybinds
            },
            build() {
                
                $("#settings-menu-container")[0].classList.remove("hidden");
            },
            clean() {
                $("#settings-menu-container")[0].classList.add("hidden");
            },
            s: {
                bindsAdd(name, key) {
                    
                },
                bindsChange() {
                    
                },
            }
        },
        welcome: { // TODO

        }
    },
    components: {
        chat: {
            setup() {
                document.getElementById("chat-input").onkeydown = function(e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
                        tetresse.modules.tetriaSocket.send("play-update", {event: "chat", msg: e.target.innerHTML});
                        console.log("sent text");
                        e.target.innerHTML = "";
                        return false;
                    }
                }
            },
            history: [], // stores messages in format: {name, msg, timeStamp}
            add(uname, message, time = (new Date()).getTime()) {
                this.history.push({name: uname, msg: message, timeStamp: time})
            },
            clear() {
                this.history = [];
            },
            generate(clear = false) {
                var chatElement = document.getElementById("chat-area");
                if (clear) {
                    while(chatElement.children.length > 0)
                        chatElement.removeChild(chatElement.children[0]);
                }
                for(var i = chatElement.children.length; i < this.history.length; i++) {
                    var ele = document.createElement("div");
                    var eleData = this.history[i];
                    ele.innerHTML = "<strong>" + eleData.name + "</strong>: " + eleData.msg;
                    var date = new Date(eleData.timeStamp);
                    ele.title = ((date.getHours() - 1) % 12 + 1) + ":" + date.getMinutes() + " " + (date.getHours() > 12 ? "pm" : "am");
                    chatElement.appendChild(ele);
                }

            }
        },
        menus: {
            setup() {
                // close button
                $(".menu-navbar>.close").click(function(e) {
                    e.target.parentNode.parentNode.parentNode.classList.toggle("hidden");
                });
                // navigation buttons
                var navbars = $(".menu-navbar>.tabs").click(function(e) {
                    var getValue = function(text) {
                        return text.toLowerCase().replace(" ", "");
                    };
                    if (e.target.value == null) return;
                    var tabs = e.target.parentNode.parentNode;
                    var next = getValue(e.target.innerHTML);
                    var prev = tabs.attributes.selected.value;
                    tabs.attributes.selected.value = next;
                    var list = e.target.parentNode.children;
                    for (var i = 0; i < list.length; i++)
                        if (getValue(list[i].innerHTML) == prev) {
                            list[i].classList.remove("active");
                        }
                    e.target.classList.add("active");
                    list = e.target.parentNode.parentNode.parentNode.parentNode.children[1];
                    if (list == null) return;
                    for (var i = 0; i < list.children.length; i++) {
                        var eleValue = list.children[i].attributes.value.value
                        if (eleValue == prev || eleValue == next)
                            list.children[i].classList.toggle("hidden");
                    }
                });
            },
        },
    },
    
};