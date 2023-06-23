import ICreateRequest from '../types/createRequest';
import IDeleteRequest from '../types/deleteRequest';
import IFilter from '../types/filter';
import IUpdateRequest from '../types/updateRequest';
import Document from './Document';

export = Collection;
declare class Collection {
	constructor(
		redi: any,
		{
			database: string,
			collection,
			options,
		}: {
			database: string;
			collection: string;
			options: {
				retryAfter: number;
				maxRetries: number;
			};
		}
	);

	private redi: ClassDecorator;
	private data: {
		database: string;
		collection: string;
	};

	/**
	 * Creates new documents in the collection
	 * @param {...object} objects - Objects representing the new documents.
	 * @returns {Promise<ICreateRequest[]>} - A promise that resolves after creating the documents.
	 */
	create<T extends object>(...objects: Omit<T, '$save' | '$delete'>[]): Promise<ICreateRequest[]>;

	/**
	 * Searches for documents in the collection based on the provided filters.
	 * @param {IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the search.
	 * @returns {Promise<T[]>} - A promise that resolves with a list of found documents.
	 */
	search<T extends Document>(filter?: IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>): Promise<T[]>;

	/**
	 * Searches for a single document in the collection based on the provided filters.
	 * @param {Omit<IFilter<T>, '$max'> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the search.
	 * @returns {Promise<T | null>} - A promise that resolves with the found document or null if the document is not found.
	 */
	searchOne<T extends Document>(filter?: Omit<IFilter<T>, '$max'> & Partial<Omit<T, '$save' | '$delete'>>): Promise<T | null>;

	/**
	 * Updates documents in the collection that match the given filters.
	 * @param {IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the update.
	 * @param {Partial<Omit<T, '$save' | '$delete'>>} update - Updated fields of the documents.
	 * @returns {Promise<IUpdateRequest[]>} - A promise that resolves after updating the documents.
	 */
	update<T extends Document>(filter: IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>, update: Partial<Omit<T, '$save' | '$delete'>>): Promise<IUpdateRequest[]>;

	/**
	 * Performs instant updates on documents in the collection that match the given filters.
	 * Unlike the regular update method, this method instantly updates the documents without queuing the update requests.
	 * @param {IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the update.
	 * @param {Partial<Omit<T, '$save' | '$delete'>>} update - Updated fields of the documents.
	 * @returns {Promise<IUpdateRequest[]>} - A promise that resolves after updating the documents.
	 */
	instantUpdate<T extends Document>(filter: IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>, update: Partial<Omit<T, '$save' | '$delete'>>): Promise<IUpdateRequest[]>;

	/**
	 * Searches for a document in the collection based on the provided filters, and creates the document if it doesn't exist.
	 * @param {IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the search.
	 * @param {Partial<Omit<T, '$save' | '$delete'>>} create - Data for creating the document (if it doesn't exist).
	 * @returns {Promise<{ created: boolean; data: T }>} - A promise that resolves with an object containing the information about whether the document was created and the data of the document.
	 */
	searchOrCreate<T extends Document>(
		filter?: IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>,
		create?: Partial<Omit<T, '$save' | '$delete'>>
	): Promise<{
		created: boolean;
		data: T;
	}>;

	/**
	 * Deletes documents in the collection based on the provided filters.
	 * @param {IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the delete operation.
	 * @returns {Promise<IDeleteRequest[]>} - A promise that resolves after deleting the documents.
	 */
	delete<T extends Document>(filter?: IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>): Promise<IDeleteRequest[]>;

	/**
	 * Counts the number of documents in the collection based on the provided filters.
	 * @param {IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>} filter - Filters for the count operation.
	 * @returns {Promise<number>} - A promise that resolves with the count of documents in collection.
	 */
	count<T extends Document>(filter?: IFilter<T> & Partial<Omit<T, '$save' | '$delete'>>): Promise<number>;
}
