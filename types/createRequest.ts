export default interface ICreateRequest {
	readonly _id: string;
	reason: string;

	created: boolean;
	skipped: boolean;
}
