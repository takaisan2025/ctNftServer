const services = require("./services");
const {EventEmitter} = require("events");

class API extends EventEmitter {
    MAKER_CONNECTIONS = {};
    VALID_CHAINS = process.env.VALID_CHAINS
        ? JSON.parse(process.env.VALID_CHAINS)
        : [1, 583, 1002, 1001, 42161, 421613];
    started = false;
    wss;
    http;

    constructor(wss, http) {
        super();
        this.http = http;
        this.wss = wss;
        this.http.api = this;
        this.wss.api = this;
    }

    serviceHandler = (msg, ws) => {
        if (msg.op === "ping") {
            return false;
        }
        if (!Object.prototype.hasOwnProperty.call(services, msg.op)) {
            console.error(`Operation failed: ${msg.op}`);
            return false;
        }
        try {
            return services[msg.op].apply(this, [
                this,
                ws,
                Array.isArray(msg.args) ? msg.args : [],
            ]);
        } catch (e) {
            console.error(`Operation failed: ${msg.op} because ${e.message}`);
            return false;
        }
    };

    start = async (port) => {
        if (this.started) return;
        this.started = true;

        this.http.listen(port, () => {
            console.log(`Server listening on port ${port}.`);
        });
    };

    stop = async () => {
        if (!this.started) return;
        this.started = false;
    };

}

module.exports = API;
