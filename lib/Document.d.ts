export = Document;
declare class Document {
	constructor(data: object, collection: any);
	readonly _id?: string;
	$save(): Promise<any>;
	$delete(): Promise<any>;
}
