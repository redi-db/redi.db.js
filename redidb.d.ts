import PWS from 'pws';
import Collection from './lib/Collection';
import argv from './types/argv';

export = RediDB;
declare class RediDB {
	constructor(argv: argv);

	/**
	 * Bind to the event when it was possible to connect to the server
	 * @return {void}
	 *
	 * @example
	 * let reconnect = false;
	 * db.on('connected', () => {
	 * 	if(reconnect) return console.log('Reconnected to server')
	 * 	reconnect = true
	 *
	 * 	console.log('Connected to server!')
	 * })
	 */
	on(event: 'connected', listener: () => void): this;

	/**
	 * Bind to the event when the connection to the server is disconnected
	 * @return {void}
	 *
	 * @example
	 * db.on('disconnect', () => {
	 *     console.log('Disconnected from server!');
	 * });
	 */
	on(event: 'disconnect', listener: () => void): this;

	/**
	 * Handle error on processing with server
	 *
	 * @example
	 * db.on('error', ({inputData, error}) => {
	 *     console.log(`New error from db: ${error.message}`);
	 * });
	 */
	on(event: 'error', listener: ({ inputData: any, error: unknown }) => void): this;

	private link: string;
	private method: string;
	private ws: PWS;

	private authorization: {
		login: string;
		password: string;
	};

	/**
	 * Create a collection for the database
	 * @param {string} database - Name of database{}
	 * @param {string} collection - Name of collection
	 * @param {object} {retryAfter: number, maxRetries: number} - Parameters for requests manager
	 * @return {Collection} - Collection manager
	 */

	create(
		database: string,
		collection: string,
		options: {
			retryAfter: number;
			maxRetries: number;
		} = { retryAfter: 30, maxRetries: 3 }
	): Collection;

	/**
	 * Connect to the server if the connection is broken or not initialized
	 */
	public async connect?(): Promise<void>;
	/**
	 * Disconnect from server and abort next connections
	 */
	public disconnect?(): void;

	/**
	 * Actual value of the connection to the server if the protocol uses websockets
	 * @return {boolean} - status
	 */
	public readonly connected?: boolean;
}

export interface IDocument {
	readonly _id?: string;

	$save(instant: boolean = false): Promise<any>;
	$delete(): Promise<any>;
}
