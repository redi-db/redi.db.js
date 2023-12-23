import type argv from './types/argv';
import type ICreateRequest from './types/createRequest';
import type IDeleteRequest from './types/deleteRequest';
import type IFilter from './types/filter';
import type RecursivePartial from './types/recursivePartial';
import type IUpdateRequest from './types/updateRequest';

type ReturnModelType = ArrayConstructor | BooleanConstructor | NumberConstructor | StringConstructor | null;
type ModelType = ReturnModelType | Array<ReturnModelType>;

export type DatabaseDocument<T> = {
	[key in keyof T]: T[key];
} & {
	_id: string;

	$save(instant = false): Promise<IUpdateRequest>;
	$delete(): Promise<IDeleteRequest>;
};

export type Model<T> = {
	[key in keyof T]: T[key] extends Array ? Array : T[key] extends Record<string, any> ? Model<T[key]> : ModelType;
};

export { Document, RediClient };

declare class RediClient {
	constructor(argv: argv);

	/**
	 * Bind to the event when it was possible to connect to the server
	 * @return {void}
	 *
	 * @example
	 * db.on('connected', () => {
	 * 	console.log('Connected to server!')
	 * })
	 */
	on(event: 'reconnected', listener: () => void): this;

	/**
	 * Bind to the event when it was reconnected to the server
	 * @return {void}
	 *
	 * @example
	 * db.on('reconnected', () => {
	 * 	console.log('Reconnected to server!')
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
	on(event: 'error', listener: ({ inputData, error }: { inputData: any; error: TypeError }) => void): this;

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

declare class Document<T> {
	constructor(client: RediClient, database: string, collection: string, model: Model<T>, disableValidator: boolean = false);
	/**
	 * Creates new documents in the collection
	 * @param {...T} objects - Objects representing the new documents.
	 * @returns {Promise<ICreateRequest[]>} - A promise that resolves after creating the documents.
	 */
	create(...objects: T[]): Promise<ICreateRequest[]>;

	/**
	 * Searches for documents in the collection based on the provided filters.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the search.
	 * @returns {Promise<DatabaseDocument<T>[]>} - A promise that resolves with a list of found documents.
	 */
	search(filter?: IFilter<T> & RecursivePartial<T & { _id?: string }>): Promise<DatabaseDocument<T>[]>;

	/**
	 * Searches for a single document in the collection based on the provided filters.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the search.
	 * @returns {Promise<DatabaseDocument<T> | null>} - A promise that resolves with the found document or null if the document is not found.
	 */
	searchOne(filter?: IFilter<T> & RecursivePartial<T & { _id?: string }>): Promise<DatabaseDocument<T> | null>;

	/**
	 * Updates documents in the collection that match the given filters.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the update.
	 * @param {RecursivePartial<T>} update - Updated fields of the documents.
	 * @returns {Promise<IUpdateRequest[]>} - A promise that resolves after updating the documents.
	 */
	update(filter: IFilter<T> & RecursivePartial<T & { _id?: string }>, update: RecursivePartial<T>): Promise<IUpdateRequest[]>;

	/**
	 * Performs instant updates on documents in the collection that match the given filters.
	 * Unlike the regular update method, this method instantly updates the documents without queuing the update requests.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the update.
	 * @param {RecursivePartial<T>} update - Updated fields of the documents.
	 * @returns {Promise<IUpdateRequest[]>} - A promise that resolves after updating the documents.
	 */
	instantUpdate(filter: IFilter<T> & RecursivePartial<T & { _id?: string }>, update: RecursivePartial<T>): Promise<IUpdateRequest[]>;

	/**
	 * Searches for a document in the collection based on the provided filters, and creates the document if it doesn't exist.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the search.
	 * @param {T} create - Data for creating the document (if it doesn't exist).
	 * @returns {Promise<{ created: boolean; data: DatabaseDocument<T> }>} - A promise that resolves with an object containing the information about whether the document was created and the data of the document.
	 */
	searchOrCreate(filter?: IFilter<T> & RecursivePartial<T & { _id?: string }>, create: T): Promise<{ created: boolean; data: DatabaseDocument<T> }>;

	/**
	 * Deletes documents in the collection based on the provided filters.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the delete operation.
	 * @returns {Promise<IDeleteRequest[]>} - A promise that resolves after deleting the documents.
	 */
	delete(filter?: IFilter<T> & RecursivePartial<T & { _id?: string }>): Promise<IDeleteRequest[]>;

	/**
	 * Counts the number of documents in the collection based on the provided filters.
	 * @param {IFilter<T> & RecursivePartial<T>} filter - Filters for the count operation.
	 * @returns {Promise<number>} - A promise that resolves with the count of documents in collection.
	 */
	count(filter?: IFilter<T> & RecursivePartial<T & { _id?: string }>): Promise<number>;
}
