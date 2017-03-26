# ws-promise
This project allows you to use WebSockets with Promises and RPC. In short, this makes you able to write code like this:
```js
/* First, make a Server class with an `onAdd` method */
class MyServer extends Server {
	constructor() {
		/* Start a WebSocket engine on a port */
		super({
			engineOptions: {
				port: 8000
			}
		});
	}
	onAdd(message, ...args) {
		/* Clients can sum up numbers on the server */
		message.reply(args.reduce((a, b) => a + b));
	}
}
/* Create a new server/client */
const server = new MyServer();
const client = new Client("ws://localhost:8000");
/* Make them connect to each other */
await server.open();
await client.open();
/* The client can now call server (!) methods */
const six = await client.add(1, 2, 3);
console.log(six);
```
Note that `client.add` will actually contact the `server` and call its `onAdd` method with the arguments `[1, 2, 3]` as `args`. The result of this call is a promise that we can `await` to retrieve the resulting number from the server. You don't have to register any methods manually anywhere; non-existing `client` methods will automatically be looked up on the server.
## Getting started
### Client (browser)
On a browser, there already is a native `WebSocket` client that you can use. Therefore, you can simply write:
```js
const client = new Client(url);
```
### Client (node)
As `WebSocket` is a web standard, it is not part of the `node.js` runtime. Therefore, if you would like to instantiate a client in a non-browser environment, you have to pass a standards-compliant `WebSocket` client class implementation for it to use. Good examples for such implementations would be `ws` or `uws`.
```js
import ws from "ws";
const client = new Client(url, subprotocols, {
	engine: ws
});
```
### Server
As servers, too, have no default `WebSocket` implementation, the same rules apply. You can pass in any server implementation that you like:

```js
import { wsServer } from "uws";
import { uwsServer } from "uws";
const wsServer = new Server({
	engine: wsServer,
	engineOptions: {
		port: 8000
	}
});
const uwsServer = new Server({
	engine: uwsServer,
	engineOptions: {
		port: 8001
	}
});
```
If you don't provide any engine, the `node.js` version comes pre-bundled with the engine `ws`.

## Caveats
Please note that `uws` support is not quite ready yet. `uws` is missing some events that `ws-promise` needs, and as long as `uws` doesn't implement them, this project can't offer full support. For now, using `ws` is *strongly recommended*.

## FAQ

### Which engines can I use?
This project has been tested against the client and server engines from `ws` and `uws`. Please also refer to the **Caveats** section for now.

### Can servers also call client methods?
Yes, they both communicate with the same RPC protocol.

### Do I *have* to use `extends`?
No, you can also use regular events like so:
```js
server.on("multiply", (message, ...args) => { /* … */ });
```
### Is there a "wildcard" event?
Yes. The event itself is called `message`, so the corresponding method to implement is called `onMessage`. It takes one additional parameter so that you can check the event name, i.e.:
```js
server.on("message", (event, message, ...args) => { /* … */ });
```
### How do I use this?
There isn't much documentation yet; for now, please refer to the `examples` and `test` directory.