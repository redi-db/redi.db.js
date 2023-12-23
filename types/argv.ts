export default interface IParams {
	ip: string;
	port: number;

	login: string;
	password: string;

	websocket: boolean;
	useSSL?: false;
}
