// TODO fix problem of too much empty space at some screen sizes
tetresse.modules.tetria = {
    games: [],
    sizeGroups: [[0], [1, 2, 3, 4, 5]],
    currentMenu: [],
    loading() { // loading graphic
        console.log("loading");
    },
    loaded() { // entry point for game
        console.log("loaded");
        tetresse.setup();

        for (var menu in this.menus)
            if (this.menus[menu].setup != null) this.menus[menu].setup();
        for (var component in this.components)
            if (this.components[component].setup != null) this.components[component].setup();

        this.goto("rooms");

        document.getElementById("loading").style.display = "none";
    },
    goto(menu) { // goes to specified menu
        if (this.menus[menu].overlay != null && this.menus[menu].overlay) {
            this.currentMenu.push(menu);
            this.menus[menu].init();
            return;
        }
        if (this.currentMenu.length != 0) {
            for (var i = this.currentMenu.length - 1; i >= 0; i--) {
                if (this.currentMenu[i] == menu) break;
                this.menus[this.currentMenu.splice(i)[0]].clean();
            }
        }
        if (this.currentMenu.length != 0) return;
        this.currentMenu.push(menu);
        this.menus[menu].init();
    },
    menus: { // setup: onload, init: on navigate, clean: on leave
        rooms: {
            setup() {
                // create room
                $("#roomsCreate").on("click", function(e) {
                    tetresse.modules.tetriasocket.rooms.create(document.getElementById("roomsName").innerHTML);
                    tetresse.modules.tetria.goto("game");
                });
            },
            init() {
                $("#rooms-container")[0].classList.remove("hidden");
            },
            clean() {
                this.clear();
                $("#rooms-container")[0].classList.add("hidden");
            },
            rooms: {},
            add(rooms) { // rooms can be a single room or array of rooms: {id, name, numPlayers, maxPlayers}
                if (rooms.length == undefined) { rooms = [rooms]; }
                var table = $('#rooms-list')[0];
                for (var i = 0; i < rooms.length; i++) {
                    var room = rooms[i];
                    this.rooms[room.id] = room;

                    if (table.children.length == 0 || table.children[table.children.length - 1].children.length == 2) {
                        table.appendChild(document.createElement("div"));
                    }
                    var title = document.createElement("span");
                    title.innerHTML = room.name;
                    var players = document.createElement("div");
                    players.classList.add("players");
                    for (var j = 0; j < room.maxPlayers; j++) {
                        var box = document.createElement("div");
                        if (j < room.numPlayers) box.classList.add("filled");
                        players.appendChild(box);
                    }

                    var ele = document.createElement("div");
                    ele.id = "room-" + room.id;
                    ele.classList.add("button");
                    ele.appendChild(title);
                    ele.appendChild(players);
                    table.children[table.children.length - 1].appendChild(ele);

                    $("#" + ele.id).on("click", function(e) {
                        tetresse.modules.tetriasocket.rooms.join(e.target.id.substring(5));
                        tetresse.modules.tetria.goto("play");
                    });
                }
            },
            update(room, amount) { 
                if (room.id == null) { console.log("room does not have id"); return; }
                if (amount !== undefined) {
                    if (room.numPlayers !== undefined) room.numPlayers += amount;
                    else this.rooms[room.id].numPlayers += amount;
                }
                for (var v in room)
                    this.rooms[room.id][v] = room[v];

                var ele = document.getElementById("room-" + room.id);

                var players = ele.children[1];
                for (var i = 0; i < players.children.length; i++) {
                    if (i < room.numPlayers) players.children[i].classList.add("filled");
                    else players.children[i].classList.remove("filled");
                };
            },
            remove(id) {
                var ele = document.getElementById("room-" + id);
                ele.parentNode.removeChild(ele);

                delete this.rooms[id];
                this.clear();
                for (var v in this.rooms)
                    this.add(this.rooms[v]);
            },
            clear() {
                var ele = document.getElementById("rooms-list");
                while (ele.children.length != 0)
                    ele.removeChild(ele.children[0]);
            },
        },
        game: {
            setup() {
                $("#settings-button").click(function(e) {
                    tetresse.modules.tetria.goto("settings");
                });

                document.getElementById("exit-button").onclick = function(e) {
                    tetresse.modules.tetria.goto("rooms");
                }
            },
            init() {
                $("#game-container")[0].classList.remove("hidden");

                tetresse.modules.tetria.components.chat.clear();
                tetresse.modules.tetria.components.chat.generate(true);

                var characters = ["warrior", "tank", "juggernaut", "healer", "healer", "mage"];
                for (var i = 0; i < 6; i++)
                    tetresse.modules.tetria.games.push(tetresse.create(document.getElementById("game-" + i), characters[i], {"state.spectating": i == 0 ? false : true}));
                // window.onresize = function() {
                //     tetresse.modules.tetria.resize();
                // };

                // resize() { // resize the games to be the same size as their groups
                //     tetresse.modules.tetria.games.forEach(function(game) {
                //         tetresse.modules.graphics.game.resize(game);
                //     });
                //     tetresse.modules.tetria.sizeGroups.forEach(function(groupArr) {
                //         var min = null;
                //         groupArr.forEach(function(num) {
                //             var graphics = tetresse.modules.tetria.games[num].modules.graphics;
                //             min = min == null || graphics.n < min ? graphics.n : min;
                //         });
                //         groupArr.forEach(function(num) {
                //             var game = tetresse.modules.tetria.games[num];
                //             tetresse.modules.graphics.game.resize(game, min);
                //         });
                //     });
                // },

                tetresse.modules.tetria.resize();
            },
            clean() {
                $("#game-container")[0].classList.add("hidden");
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
        settings: {
            overlay: true,
            setup() {},
            init() {
                $("#settings-menu-container")[0].classList.remove("hidden");
            },
            clean() {
                $("#settings-menu-container")[0].classList.add("hidden");
            }
        },
        results: {
            overlay: true,
            setup() {},
            init() {
                $("#results-container")[0].classList.remove("hidden");
            },
            clean() {
                $("#results-container")[0].classList.add("hidden");
            }
        },
        welcome: { // TODO

        }
    },
    components: {
        chat: {
            setup() {
                // chat send message
                document.getElementById("chat-input").onkeydown = function(e) {
                    if (e.keyCode === 13 && !e.shiftKey) {
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
                    console.log([e.target]);
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