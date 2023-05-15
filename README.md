**🚪 Connecting to redi.db server**

```js
const redidb = require('redi.db.js');
const db = new redidb({
	login: 'root',
	password: 'root',

	ip: '0.0.0.0',
	port: 5000,

	websocket: true, // Recommended for faster processing
	useSSL: false, // Use "true" if your protocol uses https
});

db.on('connected', () => {
	console.log('Connected!');
});

db.on('disconnect', () => {
	console.log('Disconnected!');
});

db.on('error', err => {
	console.log(`Handled error: ${err}`);
});
```

<br>

**👨‍🦳 Create a separate base with the collection.**

```js
var exampleCollection = db.create('exampleDatabase', 'exampleCollection');
```

**👕 Create a user in the corresponding collection**

```js
await exampleCollection.create({ id: 1, money: 150 }, { id: 2, money: 150 }); // Returns first element
```

**👖 search the created user by ID**

```js
await exampleCollection.searchOne({ id: 1 }); // Returns an object with a data;

// { _id: ..., id: 1, money: 150 }
// If the data does not exist - returns null

// You can also get multiple datas at once.
await exampleCollection.search({ money: 150 }); // Returns all datas with money == 150

// [
//     { _id: ..., id: 1, money: 150 },
//     { _id: ..., id: 2, money: 150 },
//     ...
// ]
```

**🩰 searchOrCreate method**

```js
// If you don't know if you have a data with a certain ID, you can use this method.

await exampleCollection.searchOrCreate({ id: 3 }, { id: 3, burger: false });

// {
//   created: true, // If created - true, else false
//   data: { id: 3, burger: false }
// }
```

**💿 Updating the data model**

```js
await exampleCollection.update({ id: 3 }, { burger: true }); // Return [ { _id: ..., updated: true / false } ]
```

**🔟 Get count of data in collection**

```js
await exampleCollection.count({ burger: true }); // Returns number
```

**🗑 Deleting a user model**

```js
await exampleCollection.delete({ id: 3 }); // Returns [ { _id: ..., deleted: true / false } ]
//                      ^ If no argument is specified, all models in the collection will be deleted.
```

**🤞 You can use <Document>.$save() or $delete**

```js
let found = await exampleCollection.searchOne();
if (!found) return;

found.cool = true;

await found.$save(); // Return { _id: ..., updated: true / false }
await found.$delete(); // Return { _id: ..., deleted: true / false }
```

**⌨️ TypeScript support**

```ts
import redidb from 'redi.db.js';
import IDocument from 'redi.db.js/lib/Document';

const db = new redidb({
	ip: '0.0.0.0',
	port: 5000,

	login: 'root',
	password: 'root',

	websocket: true,
});

interface IUser extends IDocument {
	id: number;
	block: Partial<{
		status: boolean;
		reason: string;
	}>;
}

db.on('connected', async () => {
	console.log('Connected to redidb and can work!');

	const Users = db.create('GetClient', 'Users');
	await Users.create<IUser>({ id: 1 }).then(console.log);

	const user = await Users.searchOne<IUser>({ id: 1, block: { status: false } });
	if (!user) return console.log('User with id 1 not found or has been blocked!');

	user.id = 2;
	await user.$save();

	console.log(user);
});

db.on('disconnect', () => {
	console.log('Connection to redidb is closed');
});

db.on('error', err => {
	console.log(`Handled error: ${err}`);
});
```
