const tetresse = {
    setup() {
        for (var v in tetresse.modules)
            if (tetresse.modules[v].setup != null)
                tetresse.modules[v].setup();
        $(document).keydown(function(e) {
            if (tetresse.settings.keyBinds[e.keyCode] == null) return;
            if (tetresse.settings.keyBinds[e.keyCode].down != null && tetresse.settings.keyBinds[e.keyCode].down) return;
            tetresse.settings.keyBinds[e.keyCode].down = true;
            for (var label in tetresse.settings.keyBinds[e.keyCode]) {
                var ele = tetresse.settings.keyBinds[e.keyCode][label];
                if (ele.down == null || ele.down.func == null) continue;
                tetresse.q.add(ele.down.func, ele.down.args);
            }
        });
        $(document).keyup(function(e) {
            if (tetresse.settings.keyBinds[e.keyCode] == null) return;
            if (tetresse.settings.keyBinds[e.keyCode].down == null || !tetresse.settings.keyBinds[e.keyCode].down) return;
            tetresse.settings.keyBinds[e.keyCode].down = false;
            for (var label in tetresse.settings.keyBinds[e.keyCode]) {
                var ele = tetresse.settings.keyBinds[e.keyCode][label];
                if (ele.up == null || ele.up.func == null) continue;
                tetresse.q.add(ele.up.func, ele.up.args);
            }
        });
    },
    create(div = document.createElement("div"), mode = "default", args = {}) { // returns created game object
        args.div = div;
        args.mode = mode;
        var game = tetresse.get("generateGame")(args);
        div.classList.add("game");
        if (div.id == "") div.id = game.id = "game-" + $("tetresse")[0].children.length;
        $("tetresse")[0].appendChild(div);

        tetresse.get("s.modules", game).forEach(function(label) {
            var temp = tetresse.modules[label].game;
            if (temp == null || temp.setup == null) return;
            tetresse.modules[label].game.setup(game);
        });

        tetresse.on("startGame", function(game) {
            tetresse.get("nextPiece", game)(game);
        }, game, "bootstrap", 50, game.listeners);

        tetresse.get("setup", game)(game);

        tetresse.execute("startGame", null, game.listeners);
        if (!game.state.spectating) {
            tetresse.get("enableKeybinds", game)(game);
            game.div.tabIndex = "1";
        }
        // console.log(game);

        /**
         * objects: board, hold, next, cur
         * mechanics: piece movement, line clear
         */
         return game;
    },
    cleanup(game) { // TODO?
        if (game != null) {
            tetresse.modes.default.cleanup(game);
        }
    },
    listeners: {},
    /**
     * priority: lowest numbers execute first. graphics: 70, mechanics: 50
     */
    on(event, func, args = null, id = null, priority = 100, listeners = tetresse.listeners) { // priority is a number between 1 and 100
        if (event == null || func == null) { tetresse.utils.error("invalid args, event and or func can't be null"); return; }
        var newElement = {func: func, args: args, id: id, priority: priority};
        if (listeners[event] == null)
            listeners[event] = {arr: []};
        listeners[event].arr.splice(tetresse.utils.getLocToInsert(listeners[event].arr, "priority", newElement), 0, newElement);
    },
    execute(event, value, listeners = tetresse.listeners) {
        if (listeners[event] == null) return;
        listeners[event].arr.forEach(function(ele) {
            tetresse.q.add(ele.func, ele.args, value, event);
        });
    },
    q: {
        arr: [],
        running: false,
        execute() {
            if (this.running) return;
            this.running = true;
            while (this.arr.length != 0) {
                var e = this.arr.splice(0, 1)[0];
                e.f(e.a1, e.a2, e.a3);
            }
            this.running = false;
        },
        add(func = null, args1 = null, args2 = null, args3 = null) {
            if (func == null) { tetresse.utils.error("func cannot be null when being added to action queue (tetresse.q)"); return; }
            this.arr.push({f: func, a1: args1, a2: args2, a3: args3});
            this.execute();
        },
    },
    /**
     * gets data from the mode the game specifies
     * label: string that specifies path to data with splits ".", if first part of path is "a." => "actions.", or "s." => "settings"
     * game: either string, game object with game.mode specifying mode, or null. if null then the entire struct will be searched
     * struct: structure to search through
     * pointer: leave object with pointer to the last setting
     * create: whether to create the label's path as it searches
     */
    get(label, game = "default", struct = tetresse.modes, pointer = false, create = false) {
        if (game != null && game.state != null && game.state.cleanup) tetresse.utils.error("game should be cleaned up");
        if (label === undefined || typeof label != "string") { tetresse.utils.error("invalid label type: " + (typeof label)); return; }
        if (struct == null) { tetresse.utils.error("struct can't be null"); return; }
        if (game != null && struct["default"] == null) tetresse.utils.error("[warning] struct does not contain default mode");
        var getData = function(struct, mode, label) {
            if (mode != null && struct[mode] == null) return {error: "struct doesn't contain mode: " + mode};
            var arr = label.split(".");
            if (pointer) arr.splice(arr.length - 1, 1);
            if (arr.length > 1) { if (arr[0] == "a") arr[0] = "actions"; else if (arr[0] == "s") arr[0] = "settings" }
            var cur = mode != null ? struct[mode] : struct;
            arr.forEach(function(lbl) {
                if (cur == null) return;
                if (cur[lbl] == null && create) cur[lbl] = {};
                cur = cur[lbl];
            });
            return {data: cur};
        };
        var attempt1 = getData(struct, typeof game == "string" || game == null ? game : game.mode, label);
        if (attempt1 != null && attempt1.data !== undefined) {
            if (attempt1.error == null)
                return attempt1.data;
            tetresse.utils.error("attempt 1: " + attempt1.error);
        }
        var attempt2 = getData(struct, "default", label);
        if (attempt2 == null) { tetresse.utils.error("could not get " + label); return; }
        if (attempt2.error != null) { tetresse.utils.error("attempt 2: " + attempt2.error); return; }
        return attempt2.data;
    },
    modes: {
        default: {
            settings: {
                boardWidth: 10,
                boardHeight: 40,
                shownHeight: 20.5,
                modules: ["graphics", "characters", "tetria"], // TODO make it so that games can have uniquely added modules
                upNext: 5,
                graphicsComponents: ["board", "background", "hold", "next"],
                spectatorGraphicsComponents: ["board", "background"],
                graphicsGhost: true,
                DAS: 125, // in ms
                ARR: 16, // in ms
                downDelay: 40, // in ms
                lineClearDelay: 500, // in ms
                gravity: true,
                gravitySpeed: 1000, // in ms
                gravityStall: 15, // number of times you can stall
                disableAnimations: false,
            },
            setup(game, args) {
                tetresse.get("gravity", game)(game, {enable: tetresse.get("s.gravity", game)});
            },
            leftControl(game, args = {down: null, stop: null}, paused = false) {
                if (args.stop != null && args.stop) { // stop current loop
                    window.clearTimeout(game.state.leftDown.loop);
                    game.state.leftDown.loop = null;
                    return;
                }
                if (args.down != null) {
                    if (!args.down) { // lifted
                        window.clearTimeout(game.state.leftDown.loop);
                        game.state.leftDown.loop = null;
                        game.state.leftDown.down = false;
                        if (game.state.rightDown.down) tetresse.get("rightControl", game)(game, {down: true}, paused);
                        return;
                    } else { // down
                        game.state.leftDown.down = true;
                        if (game.state.leftDown.loop != null) return; // loop already running
                        if (game.state.rightDown.loop != null) tetresse.get("rightControl", game)(game, {stop: true});
                    }
                }
                if (!paused)
                    tetresse.get("movePiece", game)(game, {amount: -1});
                game.state.leftDown.loop = window.setTimeout(function(game) {
                    tetresse.get("leftControl", game)(game);
                }, tetresse.get("s." + (args.down != null && args.down ? "DAS" : "ARR"), game), game);
            },
            rightControl(game, args = {down: null, stop: null}, paused) {
                if (args.stop != null && args.stop) { // stop current loop
                    window.clearTimeout(game.state.rightDown.loop);
                    game.state.rightDown.loop = null;
                    return;                
                }
                if (args.down != null) {
                    if (!args.down) { // lifted
                        window.clearTimeout(game.state.rightDown.loop);
                        game.state.rightDown.loop = null;
                        game.state.rightDown.down = false;
                        if (game.state.leftDown.down) tetresse.get("leftControl", game)(game, {down: true}, paused);
                        return;
                    } else { // down
                        game.state.rightDown.down = true;
                        if (game.state.rightDown.loop != null) return; // loop already running
                        if (game.state.leftDown.loop != null) tetresse.get("leftControl", game)(game, {stop: true});
                    }
                }
                if (!paused)
                    tetresse.get("movePiece", game)(game, {amount: 1});
                game.state.rightDown.loop = window.setTimeout(function(game) {
                    tetresse.get("rightControl", game)(game);
                }, tetresse.get("s." + (args.down != null && args.down ? "DAS" : "ARR"), game), game);
            },
            cwControl(game, args = {down: true}, paused = false) {
                if (args.down != null && args.down && !paused) {
                    tetresse.get("rotatePiece", game)(game, {direction: 1});
                }
            },
            ccwControl(game, args, paused = false) {
                if (args.down != null && args.down && !paused)
                    tetresse.get("rotatePiece", game)(game, {direction: -1});
            },
            hdControl(game, args, paused = false) {
                if (args.down != null && args.down && !paused)
                    tetresse.get("dropPiece", game)(game, {harddrop: true});
            },
            sdControl(game, args = {}, paused = false) {
                if (args.down != null && !args.down && game.state.downDown.loop == null) return; // tried to stop a stopped loop
                if (args.down != null && args.down && game.state.downDown.loop != null) return; // loop already running
                if (args.down != null && !args.down && game.state.downDown.loop != null) { // currently going right, stop it
                    window.clearTimeout(game.state.downDown.loop);
                    game.state.downDown.loop = null;
                    return;
                }
                if (paused) return;
                if (tetresse.get("dropPiece", game)(game, {pretend: true})) {
                    tetresse.execute("sdControl", args.down == null || args.down, game.listeners);
                    tetresse.get("dropPiece", game)(game);
                }
                game.state.downDown.loop = window.setTimeout(function(game) {
                    tetresse.get("sdControl", game)(game);
                }, tetresse.get("s.downDelay", game), game);
            },
            holdControl(game, args = {down: true}, paused = false) {
                if (args.down != null && args.down && !game.state.holdUsed && !paused) {
                    game.state.holdUsed = true;
                    tetresse.get("holdPiece", game)(game);
                }
            },
            holdPiece(game, args = {show: true}) {
                var temp = game.cur.hold;
                game.cur.hold = game.cur.piece;
                if (args.show == null || args.show)
                    tetresse.execute("graphicsHold", game.cur.hold, game.listeners);
                tetresse.get("nextPiece", game)(game, {piece: temp});
            },
            movePiece(game, args = {amount: 0, show: true}) { // args is number of tiles to move (positive right, negative left)
                var valid = tetresse.get("isPieceValid", game)(game, {layout: game.cur.layout, x: game.cur.loc.x + args.amount, y: game.cur.loc.y});
                if (valid){ 
                    game.cur.loc.x += args.amount;
                    if (args.show == null || args.show) tetresse.modules.graphics.game.components.board.piece(game);
                }
                tetresse.execute("movePiece", valid, game.listeners);
                return valid;
            },
            rotatePiece(game, args = {direction: 1, show: true}) { // rotates piece cw or ccw depending on direction (-1: ccw, 1: cw)
                var newLayout = tetresse.utils.pieces.rotate(game.cur.layout, (args.direction + 4) % 4);
                var rotationChart = tetresse.utils.pieces.rotationChart[game.cur.piece == "i" ? "i" : "default"];
                var rotNum = args.direction == 1 ? game.cur.rot : (game.cur.rot + 3) % 4; // target rotation state, eg state = 2 and amount = 3, final state is 1

                var pieceData = {layout: newLayout, x: game.cur.loc.x, y: game.cur.loc.y};
                var possible = false;
                for (var i = 0; i < rotationChart[rotNum].length; i++) {
                    pieceData.x = game.cur.loc.x + rotationChart[rotNum][i][0] * args.direction;
                    pieceData.y = game.cur.loc.y + (-1) * rotationChart[rotNum][i][1] * args.direction;
                    if (tetresse.get("isPieceValid", game)(game, pieceData)) {
                        game.cur.layout = newLayout;
                        game.cur.loc = {x: pieceData.x, y: pieceData.y};
                        game.cur.rot = (game.cur.rot + args.direction + 4) % 4;
                        if (args.show == null || args.show) {
                            tetresse.modules.graphics.game.components.board.piece(game);
                            tetresse.execute("rotatePiece", true, game.listeners);
                        }
                        return true;
                    }
                }
                tetresse.execute("rotatePiece", false, game.listeners);
                return false;
            },
            /**
             * harddrop: whether to harddrop it
             * force: whether to place if unable to drop
             * show: whether to show the change (mainly for harddrop, pretend also won't show)
             * pretend: get ability to drop. Note, if harddrop and pretend are true, returns row the piece would drop to
             */
            dropPiece(game, args = {harddrop: false, force: false, show: true, pretend: false}) {
                if (args.harddrop != null && args.harddrop) { // harddrop
                    var prev = game.cur.loc.y;
                    while(tetresse.get("dropPiece", game)(game, {show: false})) {}
                    if (args.pretend) { var value = game.cur.loc.y; game.cur.loc.y = prev; return value; }
                    tetresse.get("placePiece", game)(game);
                    return true;
                }
                if (tetresse.get("isPieceValid", game)(game, {layout: game.cur.layout, x: game.cur.loc.x, y: game.cur.loc.y + 1})) {
                    if (args.pretend != null && args.pretend) return true;
                    game.cur.loc.y++;
                    if (args.show == null || args.show) {
                        tetresse.modules.graphics.game.components.board.piece(game);
                        // tetresse.execute("dropPiece", false, game.listeners);
                    }
                    return true;
                }
                if (args.force != null && args.force)
                    tetresse.get("placePiece", game)(game);
                if (args.show == null || args.show)
                    tetresse.modules.graphics.game.components.board.piece(game);
                return false;
            },
            placePiece(game, args = {show: true, clearDelay: true}) { // places piece on board and calls nextPiece
                if (game.cur.piece != null) {
                    var layout = game.cur.layout;
                    for (var r = 0; r < layout.length; r++)
                        for (var c = 0; c < layout.length; c++)
                            if (layout[r][c] == 1)
                                game.board[r + game.cur.loc.y][c + game.cur.loc.x] = game.cur.piece;
                    game.cur.piece = null;
                    game.state.holdUsed = false;
                }
                var clearDelayPause = tetresse.get("collapseBoard", game)(game, {delay: args.clearDelay == null ? true : args.clearDelay});
                if (args.show == null || args.show) {
                    tetresse.execute("graphicsPiece", game.cur, game.listeners);
                    tetresse.execute("graphicsBoard", game.board, game.listeners);
                    tetresse.modules.graphics.game.components.board.piece(game);
                    tetresse.modules.graphics.game.components.board.update(game);
                }
                if (!clearDelayPause) return;
                tetresse.get("nextPiece", game)(game);
            },
            nextPiece(game, args = {piece: null}) { // gets the next piece and shuffles bag if need, if args.piece isn't null, makes that the next piece
                if (game.cur.next.length <= tetresse.get("s.upNext", game))
                    tetresse.utils.pieces.shuffle(["i", "j", "l", "o", "s", "t", "z"]).forEach(function(ele) {
                        game.cur.next.push(ele);
                    });
                var piece = args.piece == null ? game.cur.next.splice(0, 1)[0] : args.piece;
                game.cur.rot = 0;
                game.cur.layout = tetresse.utils.pieces.rotate(tetresse.utils.pieces.layouts[piece]);
                game.cur.loc = {x: Math.floor((game.board[0].length - game.cur.layout.length) / 2), y: piece == "i" ? 18 : 19};
                if (!tetresse.get("isPieceValid", game)(game, {layout: game.cur.layout, x: game.cur.loc.x, y: game.cur.loc.y})) {
                    console.log("toppedOut");
                    tetresse.execute("toppedOut", null, game.listeners);
                    return;
                }
                game.cur.piece = piece;
                tetresse.execute("graphicsNext", game.cur.next, game.listeners);
                tetresse.get("dropPiece", game)(game);
                tetresse.execute("nextPiece", true, game.listeners);
            },
            collapseBoard(game, args = {delay: true}) { // collapses the board (filled rows), returns true if execution should continue - needs to be used with nextpiece
                var filledRows = [];
                for (var r = game.board.length - 1; r >= 0; r--) {
                    var filled = true;
                    var empty = true;
                    for (var c = 0; c < game.board[0].length; c++) {
                        if (game.board[r][c] == "") filled = false;
                        else empty = false;
                    }
                    if (filled) { filledRows.push(r); foundFilled = true; }
                    if (empty) break;
                }
                if (filledRows.length != 0 && args.delay != null && args.delay && tetresse.get("s.lineClearDelay", game) != 0) {
                    tetresse.execute("linesCleared", filledRows, game.listeners);
                    if (tetresse.get("s.linesClearDelay", game) != 0) {
                        tetresse.get("gravity", game)(game, {stop: true});
                        game.state.pausedKeybinds = true;
                        window.setTimeout(function(game) {
                            tetresse.get("placePiece", game)(game, {clearDelay: false});
                            tetresse.get("gravity", game)(game, {reset: true});
                            game.state.pausedKeybinds = false;
                        }, tetresse.get("s.lineClearDelay", game), game);
                        return false;
                    }
                }
                var row = [];
                for (var c = 0; c < game.board[0].length; c++)
                    row.push("");
                for (var i = filledRows.length - 1; i >= 0; i--) {
                    game.board.splice(filledRows[i], 1);
                    game.board.splice(0, 0, row.slice());
                }
                return true;
            },
            isPieceValid(game, args = {layout: [], x: 0, y: 0}) { // private
                for (var r = 0; r < args.layout.length; r++)
                    for (var c = 0; c < args.layout[0].length; c++)
                        if (args.layout[r][c] == 1) {
                            if (r + args.y < 0 || r + args.y >= game.board.length) return false;
                            if (game.board[r + args.y][c + args.x] != "") return false;
                        }
                return true;
            },
            gravity(game, args = {reset: null, stop: null, enable: null}) { // enable sets up listeners, reset resets gravity tick, stop stops the current gravity loop
                if (game.state.gravity.loop != null) window.clearTimeout(game.state.gravity.loop);
                if (args.enable != null) { // TODO bug: needs to check if you're moving over a place it cannot drop
                    if (args.enable) { // setup listeners
                        game.state.gravity.events.forEach(function(event) {
                            tetresse.on(event, function(game, changed, label) {
                                var canDrop = tetresse.get("dropPiece", game)(game, {pretend: true});
                                if (label != "nextPiece" && label != "sdControl" && (!changed || canDrop)) return;
                                game.state.gravity.count++;
                                tetresse.get("gravity", game)(game, {reset: true});
                            }, game, "gravity", 60, game.listeners);
                        });
                        tetresse.on("toppedOut", function(game) {
                            tetresse.get("gravity", game)(game, {stop: true});
                        }, game, "gravity", 50, game.listeners);
                    } else { // remove listeners
                        game.state.gravity.events.forEach(function(event) {
                            tetresse.utils.removeListener("gravity", event, game.listeners);
                        });
                        tetresse.get("gravity", game)(game, {stop: true});
                    }
                    return;
                }
                if (args.stop != null && stop) { game.state.gravity.loop = null; return; }
                if (args.reset == null || !args.reset || game.state.gravity.count >= tetresse.get("s.gravityStall", game)) {
                    tetresse.get("dropPiece", game)(game, {force: true});
                    game.state.gravity.count = 0;
                    if (game.state.gravity.loop == null) return;
                }

                game.state.gravity.loop = window.setTimeout(function(game) {
                    tetresse.get("gravity", game)(game);
                }, tetresse.get("s.gravitySpeed", game), game);
            },
            // args are settings that will be inserted into game variable (eg: "div": <div> will be in game.div, "state.spectating": true will be in game.state.spectating)
            generateGame(args, alreadyGenerated = false) { 
                if (alreadyGenerated != null && alreadyGenerated) return;
                var board = [];
                for (var r = 0; r < tetresse.get("s.boardHeight", args.mode); r++) {
                    var tempArr = [];
                    for (var c = 0; c < tetresse.get("s.boardWidth", args.mode); c++)
                        tempArr.push("");
                    board.push(tempArr);
                }
                var game = {
                    board: board,
                    div: null,
                    mode: null,
                    cur: {
                        piece: null,
                        loc: {x: null, y: null},
                        rot: null,
                        layout: null,
                        next: [],
                        hold: null,
                    },
                    state: {
                        leftDown: {down: false, loop: null},
                        rightDown: {down: false, loop: null},
                        downDown: {loop: null},
                        holdUsed: false,
                        gravity: {loop: null, count: -1, events: ["nextPiece", "movePiece", "sdControl", "rotatePiece"]},
                        pausedKeybinds: false,
                        cleanup: false,
                        spectating: false,
                    },
                    keyBinds: {
                        left: [37],
                        right: [39],
                        cw: [38],
                        ccw: [90],
                        sd: [40],
                        hd: [32],
                        hold: [67]
                    },
                    modules: {},
                    listeners: {},
                };

                for (var v in args) { // add all args to game
                    var arr = v.split(".");
                    var lastPointer = arr[arr.length - 1];
                    tetresse.get(v, null, game, true, true)[lastPointer] = args[v];
                }

                var specificMode = tetresse.get("generateGame", game);
                if (specificMode !== undefined) specificMode(args, true);
                return game;
            },
            cleanup(game, alreadyCleaned = false) {
                if (alreadyCleaned) return;
                // remove keybinds
                tetresse.get("disableKeybinds", game)(game);
                // remove listeners
                for (var v in game.listeners)
                    game.listeners[v].arr.forEach(function(ele) {
                        tetresse.utils.removeListener(ele.id, v, game.listeners);
                    });
                // stop gravity
                tetresse.get("gravity", game)(game, {stop: true});
                // cleanup modules
                tetresse.get("s.modules", game).forEach(function(ele) {
                    if (tetresse.modules[ele].game != null && tetresse.modules[ele].game.cleanup != null)
                        tetresse.modules[ele].game.cleanup(game);
                });

                tetresse.get("cleanup", game)(game, true);
                game.state.cleanup = true;
            },
            enableKeybinds(game, args) {
                for (var label in game.keyBinds) {
                    game.keyBinds[label].forEach(function(num) {
                        if (tetresse.settings.keyBinds[num] == null) tetresse.settings.keyBinds[num] = {};
                        tetresse.settings.keyBinds[num][game.div.id] = {
                            down: { func: function(args) {
                                    tetresse.get(args.label + "Control", args.game)(args.game, {down: true, delay: true}, args.game.state.pausedKeybinds);
                                }, args: {game: game, label: label}
                            },
                            up: { func: function(args) {
                                    tetresse.get(args.label + "Control", args.game)(args.game, {down: false}, args.game.state.pausedKeybinds);
                                }, args: {game: game, label: label}
                            },
                        }
                    });
                }
            },
            disableKeybinds(game) {
                for (var label in game.keyBinds) {
                    game.keyBinds[label].forEach(function(num) {
                        if (tetresse.settings.keyBinds[num] == null) return;
                        delete tetresse.settings.keyBinds[num][game.div.id];
                    });
                }
            }
        },
    },
    utils: {
        error(msg, trace = true) {
            var s = tetresse.settings;
            if (s.showErrorMessages) console.log(msg);
            if (s.showErrorTrace && trace) console.trace();
        },
        getLocToInsert(arr, sortKey, element) { // binary search for location to insert at. arr: [{sortKey: 1}], ele: {sortKey: 2}, inserts before same value
            if (element[sortKey] == null) return arr.length;
            var target = element[sortKey];
            var start = 0;
            var end = arr.length;
            var middle = Math.floor((start + end) / 2);
            while (middle != arr.length && middle != 0 && arr[middle][sortKey] != target && start < end) {
                if (target < arr[middle][sortKey]) end = middle - 1;
                else start = middle + 1;
                middle = Math.floor((start + end) / 2);
            }
            for (var i = middle; i != arr.length && arr[i][sortKey] < target; i++)
                middle++;
            return middle;
        },
        removeListener(id, event, listeners = tetresse.listeners) { // returns array of elements removed (only removes one)
            if (id == null || event == null) { tetresse.utils.error("id and or element cannot be null"); return; }
            for (var i = 0; i < listeners[event].arr.length; i++)
                if (listeners[event].arr[i].id == id) return listeners[event].arr.splice(i, 1);
            return [];
        },
        grid: {
            create(arr) {
                var grid = {
                    rowLabels: {}, // {board: 12}, board ele is in 12th index of rows array
                    colLabels: {},
                    rows: [], // {label, weight, n} sorted array of components
                    cols: [],
                    rowsChange: false,
                    colsChange: false,
                    rowsTotal: 0,
                    colsTotal: 0,
                };
                if (arr != null)
                    arr.forEach(function(ele) {
                        this.add(ele);
                    });
                this.generateLocs(grid);
                return grid;
            },
            /**
             * ele: {row: {label: "hi", weight: 50, n: 10}, col: "hi"} creates new row / puts in column labeled hi
             */
            add(grid, ele) { 
                if (ele == null) { tetresse.utils.error("ele cannot be null (grid.add)"); return; }
                ["row", "col"].forEach(function(rc) {
                    if (typeof ele[rc] != "string") { // trying to add to row / col
                        if (grid[rc + "Labels"][ele[rc].label] != null) { tetresse.utils.error("label [" + ele[rc].label + "] already exists in " + rc + "s"); return; }
                        if (ele[rc].label != null && (ele[rc].weight == null || ele[rc].n == null)) return;
                        if (ele[rc].weight == null || ele[rc].n == null || ele[rc].label == null) {tetresse.utils.error("element needs valid weight (" + ele[rc].weight + "), label (" + ele[rc].label + "), and n (" + ele[rc].n + ") in " + rc); return; }
                        var loc = tetresse.utils.getLocToInsert(grid[rc + "s"], "weight", ele[rc]);
                        grid[rc + "s"].splice(loc, 0, ele[rc]);
                        grid[rc + "sChange"] = true;
                    }
                });
            },
            generateLocs(grid) {
                ["row", "col"].forEach(function(rc) {
                    if (!grid[rc + "sChange"]) return;
                    var amount = 0;
                    var i = 0;
                    grid[rc + "s"].forEach(function(ele) {
                        grid[rc + "Labels"][ele.label] = i;
                        ele.nOffset = amount;
                        amount += ele.n;
                        i++;
                    });
                    grid[rc + "sTotal"] = amount;
                });
            },
            edit(grid, ele, newEle) {
                
            },
            get(grid, ele) { // returns x and y offset as well as w and h
                if (grid == null) { tetresse.utils.error("grid cannot be null"); return; }
                this.generateLocs(grid);
                var row = typeof ele.row == "string" ? ele.row : ele.row.label;
                var col = typeof ele.col == "string" ? ele.col : ele.col.label;
                col = grid.cols[grid.colLabels[col]];
                row = grid.rows[grid.rowLabels[row]];
                return {x: col.nOffset, y: row.nOffset, w: col.n, h: row.n};
            },
            getTotals(grid) { // returns {w, h} of totals
                if (grid == null) { tetresse.utils.error("grid cannot be null"); return; }
                this.generateLocs(grid);
                return {w: grid.colsTotal, h: grid.rowsTotal};
            }
        },
        pieces: {
            layouts: {
                i: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
                j: [[1,0,0],[1,1,1],[0,0,0]],
                l: [[0,0,1],[1,1,1],[0,0,0]],
                o: [[1,1],[1,1]],
                s: [[0,1,1],[1,1,0],[0,0,0]],
                t: [[0,1,0],[1,1,1],[0,0,0]],
                z: [[1,1,0],[0,1,1],[0,0,0]]
            },
            rotationChart: {
                default: [
                    [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]], // 0>>1
                    [[0,0], [1,0], [1,-1], [0,2], [1,2]], // 1>>2
                    [[0,0], [1,0], [1,1], [0,-2], [1,-2]], // 2>>3
                    [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]] // 3>>0
                ],
                i: [
                    [[0,0], [-2,0], [1,0], [-2,-1], [1,2]], // 0>>1
                    [[0,0], [-1,0], [2,0], [-1,2], [2,-1]], // 1>>2
                    [[0,0], [2,0], [-1,0], [2,1], [-1,-2]], // 2>>3
                    [[0,0], [1,0], [-2,0], [1,-2], [-2,1]] // 3>>0
                ]
            },
            rotate(arr, amount = 0) { // rotates cw, returns a copy
                if (arr.length != arr[0].length) { tetresse.utils.error("tried to rotate non-square matrix (" + arr.length + "x" + arr[0].length + ")"); return; }
                if (amount == null)
                amount = (amount + 40) % 4;

                var newArr = [];
                for (var i = 0; i < arr.length; i++)
                    newArr[i] = arr[i].slice();

                var rotateCW = function(arr) { // reverse the rows then swap symmetric elements
                    for (var i = 0; i < arr.length / 2; i++) {
                        var temp = [];
                        for (var j = 0; j < arr[i].length; j++)
                            temp.push(arr[i][j]);
                        arr[i] = arr[arr.length - 1 - i];
                        arr[arr.length - 1 - i] = temp;
                    }
                    for (var i = 0; i < arr.length; i++) {
                        for (var j = 0; j < i; j++) {
                            var temp = arr[i][j];
                            arr[i][j] = arr[j][i];
                            arr[j][i] = temp;
                        }
                    }
                    return arr;
                };

                while (amount != 0) {
                    rotateCW(newArr);
                    amount--;
                }
                return newArr;
            },
            shuffle(arr) { // Fisher-Yates shuffle
                var m = arr.length, t, i;
                while (m) {
                    i = Math.floor(Math.random() * m--);
                    t = arr[m];
                    arr[m] = arr[i];
                    arr[i] = t;
                }
                return arr;
            }
        },
        getColor(str) { // converts color string (#ffffff) to object {r, g, b, t, getString}
            var ret = { r: 255, g: 255, b: 255, t: 1 };
            if (str.substring(0, 1) == "#") {
                ret = {
                    r: parseInt(str.substring(1, 3), 16), g: parseInt(str.substring(3, 5), 16), 
                    b: parseInt(str.substring(5, 7), 16)
                };
                if (str.length >= 9) ret.t = parseInt(str.substring(7, 9), 16) / 255;
            } else if (str.substring(0, 5) == "rgba(") {
                var arr = str.split("(")[1].split(",");
                ret = {r: parseInt(arr[0]), g: parseInt(arr[1]), b: parseInt(arr[2])}
                if (arr.length >= 4) ret.t = parseInt(arr[3].split(")")[0]);
            } else {
                tetresse.utils.error("unsupported string format: " + str);
            }
            ret.getString = function() { return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.t + ")"; };
            return ret;
        }
    },
    modules: {},
    settings: {
        showErrorMessages: true,
        showErrorTrace: true,
        keyBinds: {}, // keyNumber: {gameid: {func, args}, gameid: ...}
    }
}