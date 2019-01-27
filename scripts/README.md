## Tetria-game
This repo is the current main page of the tetria game. The game core used is tetresse v3, and all interactions use the server's API.

#### Quick Links:
- [Overview](#overview)
- [File Structure](#files)
- [Implementation Details](#details)
<a name="overview"></a>
## Overview:
All menus are in index.html and are shown / hidden when needed. Major menus are "views" (lobby, play screen, settings, results, etc), and smaller complex parts are "components" (chat, etc). Views are "setup" when the page loads, "built" when they are shown, and "clean" when they're hidden. To show a view, use the following function:
```javascript
tetresse.modules.tetriaMaster.goto(view);
```
<a name="files"></a>
## File Structure
<dl>
    <dt>tetresse.js</dt>
    <dd>Core game mechanics and module setup.</dd>
</dl>
<a name="details"></a>
## Implementation Details
function details