import Protocol, { SYN } from "Protocol";
import Message from "./Message";
import EventEmitter from "crystal-event-emitter";
const extensions = Symbol();
export default class Client extends EventEmitter {
	ws = null;
	network = null;
	reconnecting = false;
	constructor(...args) {
		super({
			inferListeners: true
		});
		if (!args.length) {
			throw new Error("No arguments provided");
		}
		const [url] = args;
		this.url = url;
		if (args.length === 2) {
			/* User wants to specify options or protocols */
			const [, arg2] = args;
			if (typeof arg2 === "object") {
				/* He wants to specify options */
				this.options = arg2;
				this.protocols = null;
			}
			else {
				/* He wants to specify protocols */
				this.options = {};
				this.protocols = arg2;
			}
		}
		if (args.length === 3) {
			/* User wants to specify options and protocols */
			const [, protocols, options] = args;
			this.protocols = protocols;
			this.options = options;
		}
		if (!this.options.engine) {
			throw new Error("No WebSocket client implementation found. If your environment doesn't natively support WebSockets, please provide the client class to use with the `engine` option.");
		}
		const defaultOptions = new Map([
			["autoReconnect", true],
			["reconnectionMinimum", 200],
			["reconnectionFactor", 1.15]
		]);
		for (const [option, value] of defaultOptions) {
			if (!this.options.hasOwnProperty(option)) {
				this.options[option] = value;
			}
		}
		this.proxy = new Proxy(this, {
			get: (target, property) => {
				if (property === "inspect") {
					return () => {
						/* The proxy should at least be printable */
						return target;
					};
				}
				if (property === "then") {
					return this.proxy;
				}
				const lookUp = target[property];
				if (!lookUp) {
					return async (...args) => {
						const remoteLookup = new Message(new SYN(property, ...args));
						const [message, result] = await target.send(remoteLookup);
						message.reply();
						return result;
					};
				}
				else {
					if (lookUp instanceof Function) {
						return target::lookUp;
					}
					else {
						return lookUp;
					}
				}
			}
		});
		return this.proxy;
	}
	clear(e) {
		this.emit("close", e);
		this.ws = null;
		this.network = null;
	}
	open() {
		return new Promise(async (resolve, reject) => {
			if (this.ws) {
				await this.close();
			}
			this.ws = new this.options.engine(this.url, this.protocols, this.options.engineOptions);
			this.network = new Protocol(this.ws);
			this.ws.on("open", e => {
				this.emit("open", e);
				resolve(this.proxy);
			});
			this.ws.on("error", e => {
				this.emit("error", e);
				reject(e);
				// this.close();
			})
			/* Closed dirtily */
			this.ws.on("close", e => {
				this.clear(e);
				if (this.options.autoReconnect && !this.reconnecting) {
					this.reconnect();
				}
			});
			this.ws.on("message", string => this.network.read(string));
			this.network.on("*", (...args) => {
				this.emit(...args);
			});
		});
	}
	async reconnect(delay) {
		this.reconnecting = true;
		const timeout = delay || this.options.reconnectionMinimum;
		try {
			await this.open();
			this.reconnecting = false;
			this.emit("reconnect");
		}
		catch (e) {
			setTimeout(() => {
				this.reconnect(timeout * this.options.reconnectionFactor);
			}, timeout);
		}
	}
	close() {
		return new Promise((resolve, reject) => {
			if (this.ws) {
				/* Closed cleanly */
				this.ws.onclose = e => {
					this.clear(e);
					resolve(this.proxy);
				};
				this.ws.close();
			}
			else {
				reject(new Error("WebSocket hasn't been initialized"));
			}
		});
	}
	async send(message) {
		return this.network.send(message);
	}
}