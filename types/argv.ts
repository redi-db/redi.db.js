export default interface Params {
	ip: string;
	port: number;

	login: string;
	password: string;

	websocket: boolean;

	useSSL?: false;
}
