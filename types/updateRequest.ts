export default interface IUpdateRequest {
	readonly _id: string;

	reason?: string;
	updated: boolean;
}
