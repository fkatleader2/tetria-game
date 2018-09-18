tetresse.modules.tetriasocket = {
    socket: null,
    setup() {
        try {
            this.socket = io('https://tetria.tetresse.com:8000');
        } catch(e) {
            console.log("offline mode");
        }
    }
}