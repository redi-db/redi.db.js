const Collection = require('./lib/Collection');
const EventEmitter = require('events');
const clients = require('./lib/clients');
const WebSocket = require('ws');
const PWS = require('pws');

module.exports = class RediDB extends EventEmitter {
	constructor(argv) {
		super();

		this.link = argv.websocket ? `${argv.useSSL ? 'wss' : 'ws'}://${argv.ip}${argv.port ? ':' + argv.port : ''}/ws?login=${argv.login}&password=${argv.password}` : `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${argv.port ? ':' + argv.port : ''}`;
		this.listLink = `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${argv.port ? ':' + argv.port : ''}`;
		this.method = argv.websocket ? 'WS' : 'HTTP';

		this.authorization = {
			login: argv.login,
			password: argv.password,
		};

		if (this.method == 'WS') {
			this.clientID = clients.add(new PWS(this.link, WebSocket));
			this.disconnect = clients.get(this.clientID).close;
			this.connect = clients.get(this.clientID).connect;
			this.connected = false;

			clients.get(this.clientID).firstConnect = false;
			clients.get(this.clientID).on('open', () => {
				clients.get(this.clientID).firstConnect = true;
				this.connected = true;

				this.emit('connected');
			});

			clients.get(this.clientID).on('close', () => {
				this.connected = false;
				if (clients.get(this.clientID).firstConnect) this.emit('disconnect');
			});
		}
	}

	create(database, collection, options = { retryAfter: 30, maxRetries: 3 }) {
		if (typeof options.retryAfter != 'number') options.retryAfter = 30;
		if (typeof options.maxRetries != 'number') options.maxRetries = 3;

		if (options.retryAfter < 0) throw new Error('<retryAfter> must be >= 0');
		if (options.maxRetries < 0) throw new Error('<maxRetries> must be >= 0');

		return new Collection(
			this,
			{
				database,
				collection,
			},
			options
		);
	}
};
