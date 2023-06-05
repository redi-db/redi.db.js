const Collection = require('./lib/Collection');
const EventEmitter = require('events');
const WebSocket = require('ws');

module.exports = class redidb extends EventEmitter {
	constructor(argv) {
		super();
		this.setMaxListeners(25000);

		this.link = argv.websocket ? `${argv.useSSL ? 'wss' : 'ws'}://${argv.ip}${argv.port ? ':' + argv.port : ''}/ws?login=${argv.login}&password=${argv.password}` : `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${argv.port ? ':' + argv.port : ''}`;
		this.listLink = `${argv.useSSL ? 'https' : 'http'}://${argv.ip}${argv.port ? ':' + argv.port : ''}`;
		this.method = argv.websocket ? 'WS' : 'HTTP';

		this.authorization = {
			login: argv.login,
			password: argv.password,
		};

		if (this.method == 'WS') {
			this.ws = new WebSocket(this.link);
			this.ws.setMaxListeners(25000);

			this.ws.on('open', () => this.emit('connected'));
			this.ws.on('close', () => this.emit('disconnect'));
		}
	}

	create(database, collection) {
		return new Collection(this, {
			database,
			collection,
		});
	}
};
