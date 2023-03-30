import Collection from "./lib/Collection";
import argv from "./types/argv";

export = RediDB;
declare class RediDB {
    constructor(argv: argv);
    private link: string;
    private authorization: {
        login: string;
        password: string;
    };
    create(database: string, collection: string): Collection;
}