**🚪 Connecting to redi.db server**

```js
const { Document, RediClient } = require('redi.db.js');

const client = new RediClient({
	ip: '0.0.0.0',
	port: 5000,

	login: 'root',
	password: 'root',

	websocket: true, // Recommended for faster processing
	useSSL: false, // Use "true" if your protocol uses https
});

client.on('connected', () => {
	console.log('Connected!');
});

client.on('reconnected', () => {
	console.log('Reconnected!');
});

client.on('disconnect', () => {
	console.log('Disconnected!');
});

client.on('error', ({ error }) => {
	console.log(`Handled error: ${error.message}`);
});
```

<br>

**👨‍🦳 Create a separate base with the collection.**

```js
const MyDocuments = new (class MyDocuments extends Document {
	constructor() {
		super(client, 'MyDatabase', 'MyCollection', MyDocuments.getDefaultModel(), false);
	}

	static getDefaultModel() {
		return {
			id: [Number, String],
			data: {
				status: Boolean,
			},
		};
	}

	async searchWithStatus() {
		return this.search({ data: { status: true } });
	}
})();

// By using your class, you are not violating the DRY principle by using "searchWithStatus" in different parts of the code. However, you can do without such deep nesting:
const MyDocuments = new Document(client, 'MyDatabase', 'MyCollection', { id: [Number, String], data: { status: Boolean } }, false);
```

**👕 Create a user in the corresponding collection**

```js
await MyDocuments.create({ id: 1, data: { status: false } }, { id: 2, data: { status: true } });
```

**👖 search the created user by ID**

```js
await MyDocuments.searchOne({ id: 1 });

// { _id: ..., id: 1, data: {...} }
// If the data does not exist - returns null

// You can also get multiple datas at once.
await MyDocuments.search({ data: { status: true } });
// or use custom methods from MyDocuments:
await MyDocuments.searchWithStatus();
```

**🩰 searchOrCreate method**

```js
// If you don't know if you have a data with a certain ID, you can use this method.

await MyDocuments.searchOrCreate({ id: 3 }, { id: 3, data: { status: true } });

// {
//   created: true, // If created - true, else false
//   data: { id: 3, data: { status: true } }
// }
```

**💿 Updating the data model**

```js
await MyDocuments.update({ id: 3 }, { data: { status: false } }); // Return [ { _id: ..., updated: true / false } ]
```

**🔟 Get count of data in collection**

```js
await MyDocuments.count({ data: { status: false } }); // Returns number
```

**🗑 Deleting a user model**

```js
await MyDocuments.delete({ id: 3 }); // Returns [ { _id: ..., deleted: true / false } ]
//                          ^ If no argument is specified, all models in the collection will be deleted.
```

**🤞 You can use <Document>.$save() or <Document>.$delete**

```js
let found = await MyDocuments.searchOne();
if (!found) return;

found.data.status = true;

await found.$save(); // Return { _id: ..., updated: true / false }
await found.$delete(); // Return { _id: ..., deleted: true / false }
```

**⌨️ TypeScript support**

```ts
import { Document, RediClient, type DatabaseDocument, type Model } from 'redi.db.js';

const client = new RediClient({
	ip: '0.0.0.0',
	port: 5000,

	login: 'root',
	password: 'root',

	websocket: false,
	useSSL: false,
});

type UserModel = {
	id: string | number;
	data: {
		messages: string[];
		status: boolean;
	};
};

const UserDocuments = new (class UserDocuments extends Document<UserModel> {
	constructor() {
		super(client, 'MyProject', 'Users', UserDocuments.getDefaultModel(), false);
	}

	static getDefaultModel(): Model<UserModel> {
		return {
			id: [Number, String],
			data: {
				messages: Array,
				status: Boolean,
			},
		};
	}

	// Type your function with returning documents
	async getByStatus(): Promise<DatabaseDocument<UserModel>[]> {
		return await this.search({ data: { status: true } });
	}
})();

client.on('connected', async () => {
	console.log('Connected to redidb!');

	const user = await UserDocuments.searchOne({ id: 1 });
	if (!user) return console.log('User not found');

	user.data.status = true;
	await user.$save();

	console.log('User saved.');
});

client.on('reconnected', () => {
	console.log('Reconnected to redidb!');
});

client.on('disconnect', () => {
	console.log('Connection to redidb is closed');
});

client.on('error', ({ error }) => {
	console.log(`Handled error: ${error.message}`);
});
```
