
## Tetria-game
This directory contains the custom modules for Tetria-game page's mechanics. The modules are loaded in using the tetresse v3 core and uses a system of **views** and **components**.

#### Quick Links:
- [Overview](#overview)
- [Files](#files)
	- [index.html](#file-index)
	- [tetriaGame.css](#file-style)
	- [tetriaMaster.js](#file-master)
	- [tetriaSocket.js](#file-socket)
<a name="overview"></a>
## Overview:
The core DOM is all included under [index.html](#test). CSS dictates the layout and how it's displayed (see [tetriaGame.css](#file-style)). What's actually shown, menu navigation, and the mechanics of the UI are controlled in [tetriaMaster.js](#file-master).

The two "types" of the parts that make up the UI are **views** and **components**. **Views** can be considered entire pages such as the rooms, play, settings, and results. A view is "setup" when the page is loaded, "build" when the view is shown, and "clean"ed when it is hidden. Views are *stateful* ie, they can store information which may change at runtime. This is used for keeping track of tetresse games created, rooms shown, chat history, etc. **Components** are parts of views such as chat, rooms list, creating a room, tabs menu (in settings and results), etc. Components have functions "create", "build" and "clean". However, components are constructed by views so while there is only one version of every view, there may be multiple instances of components. When a component is setup, a deep copy is made of its DOM structure and added the view. Components themselves don't store any information, and instead store relevant data in the view they are constructed in (chat is a component, but the chat history is stored in the view state).

When the page loads the actions for the page to display are: 

*tetresse v3 setup -> tetriaMaster setup -> views setup -> components create -> goto*

To change menu (view), change "lobby" to whatever the view's label is (:

    tetresse.modules.tetriaMaster.goto("lobby");

<a name="files"></a>
## Files
Below are all client files for tetria-game
<a name="file-index"></a>

**index.html**

Body contains header and a series of divs corresponding to different views. At the bottom is a div containing the template for the different components used by the views. Note that div containing the views are hidden by default (visibility is controlled by tetriaMaster.js)
```html
<head><!-- standard files included --></head>
<body>
	<div id="header"></div>
	<div id="view-settings"></div>
	<div id="view-results"></div>
	<div id="view-rooms"></div>
	<div id="view-play"></div>
	<!-- etc, note: view divs order may change (see tetriaMaster goto) -->
	<div id="components">
		<div id="comp-chat"></div>
		<div id="comp-tabsMenu"></div>
		<!-- etc -->
	</div>
</body>
```
<a name="file-style"></a>
**tetriaGame.css**
Note: This file may be split up in the future, but currently it stores all styling for all resolutions.

To discriminate between "default", "widescreen", and "mobile" resolutions, use the body class selector:

    body.res-mobile {}
For views, use id:

    #view-rooms {}
For components, use class:

    .comp-chat {}
<a name="file-master"></a>
**tetriaMaster.js**
 - [Overview](#tm-overview)
 - [Views](#tm-views)
 - [Components](#tm-components)


<a name="tm-overview"></a>
Overview:
```javascript
// Stores history of views; last is current view. Views are not repeated.
currentView: ["rooms", "play", "settings"],
/** appends view to currentView
 * If view is already present in currentView, cleans / removes last views
 * until view is at the end.
 * Cleans previous views (if built and if view is not an overlay).
 */
goto(String view) {},
// Page loading graphic
loading() {},
// Sets up all views (which set up their required components)
setup() {},
// Used by some views?
create(...) {},
// All view functions and states stored here (see documentation below).
views: {...},
// All component functions stored here (see documentation below).
components: {...}
```
<a name="tm-views"></a>
View Structure:
```javascript
built: false, // used and generated by goto()
state: { // generated at setup and used by components
	components: { // stores object with component ids:componentState
		3: {...},
		17: {...}
	}
},
setup() {}, // generate components / layout DOM for this view
build() {}, // show this view
clean() {}, // hide this view
```
Views:
```javascript
rooms: {...},
play: {...},
settings: {...},
results: {...}
```

<a name="tm-components"></a>
Component Structure: *do not call specific component methods, use general passthrough methods instead*
```javascript
id: 4, // number of this component created (used for labeling id)
create(view, args) {},
build(componentState, args) {},
clean(componentState, args) {}
```
Components:
```javascript
// passthrough functions to be used in views
create(view, componentLabel, args) {}, // creates component, adds to view state, returns div created
build(view, args) {}, // builds all components in view
clean(view, args) {}, // cleans all components in view
numComponents: 7, // id of the next created component
chat: {...}

```
<a name="file-socket"></a>
**tetriaSocket.js**

```javascript
send(term, data) {}, // sends data in form {tc: curTime, c: 14, d: data}
// func(term, data, args)
recieve(term, label, func, args) {}, // label, args are optional
stopRecieve(term, view) {}, // term is optional
```
