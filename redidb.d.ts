import WebSocket from 'ws';
import Collection from './lib/Collection';
import argv from './types/argv';

export = RediDB;
declare class RediDB {
	constructor(argv: argv);
	on(event: string, listener: Function): this;

	on(event: 'connected', listener: () => void): this;
	on(event: 'disconnect', listener: () => void): this;

	on(event: 'error', listener: (err: string) => void): this;

	private link: string;
	private method: string;
	private ws: WebSocket;

	private authorization: {
		login: string;
		password: string;
	};
	create(database: string, collection: string): Collection;
}
