export default interface IDeleteRequest {
	readonly _id: string;

	reason?: string;
	deleted: boolean;
}
