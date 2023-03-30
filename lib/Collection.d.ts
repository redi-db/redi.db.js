import ICreateRequest from '../types/createRequest';
import IDeleteRequest from '../types/deleteRequest';
import IUpdateRequest from '../types/updateRequest';
import Document from './Document';

export = Collection;
declare class Collection {
	constructor(
		redi: any,
		{
			database: string,
			collection,
		}: {
			database: string;
			collection: string;
		}
	);
	private redi: ClassDecorator;
	private data: {
		database: string;
		collection: string;
	};
	create<T extends object>(...objects: T[]): Promise<ICreateRequest[]>;
	search<T extends Document>(filter?: {}): Promise<T[]>;
	searchOne<T extends Document>(filter?: {}): Promise<T | null>;
	update(filter?: {}, update?: {}): Promise<IUpdateRequest[]>;
	instantUpdate(filter?: {}, update?: {}): Promise<IUpdateRequest[]>;
	searchOrCreate<T extends Document>(
		filter?: {},
		create?: {}
	): Promise<{
		created: boolean;
		data: T;
	}>;
	delete(filter?: {}): Promise<IDeleteRequest[]>;
	count(filter?: {}): Promise<number>;
}
