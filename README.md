
## Details
Further documentation


## Game <a name="game"></a>
Uses tetresse 3.0 for actual game mechanics as well as the custom tetria module. Requires players to be logged in (have auth keys) and in an active game on the game server.

**index.html** provides a grid for the 6 player's boards to display and lays out the sidebar which includes current players, messages area, and settings / exit.

**tetria.js** manages the separate games and uses the game server's api to stream with other players.

[**characters.json**](#characters-details) provides character interaction data to clients and servers

**characters.json**<a name="characters-details"></a> below is the format a character object takes in characters.json
```javascript
{
    "name": "warrior",
    "data": {
        "linesClear": {
            // combo array, index 0 is when lines are first cleared, longer combos repeat last element
            "combo": [0, 1, 1, 2, 2, 3, 3, 4, 4],
            // which pieces are counted as spins
            "spins": ["t"],
            // which events are counted as b2b, numbers are reserved for number cleared
            "b2b": ["spins", 4],
            // amount of garbage per lines cleared
            "cleared": {
                // default applies to lines cleared not otherwise overridden, index 0 is 0 lines cleared
                "default": [0, 0, 1, 2, 4],
                "spin": { "multiplier": 2, "mana": 1 },
                "b2b": { "add": 2, "mana": .5, "garbage": .5 }
                /** applies to t-spins only, multiplies by 1.5 then adds 2, only applies if "pre" array allows it
                 * pre array specifies criteria for what must come before. Following example explained:
                 * b2b s-spin required, then within 10 pieces being placed, b2b required, then within 0 lines being cleared, 
                 *     z-spin required, then within 10 seconds, t-spin required
                 * "t-spin": { "add": 2, "multiplier": 1.5, 
                 *     "pre": [
                 *         {conditions: ["s-spin", "b2b"], within: "10-places"}, 
                 *         {conditions: ["b2b"], within: "0-cleared"},
                 *         {conditions: ["z-spin", within: "10-seconds"]}]},
                 */
            }
        }
    }
}
```
