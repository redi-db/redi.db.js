**🚪 Connecting to redi.db server**

```js
const redidb = require('redi.db.js');

const db = new redidb({
	login: 'root',
	password: 'root',

	ip: '0.0.0.0',
	useSSL: false, // Use "true" if your protocol uses https

	port: 5000,
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

**👖 Find the created user by ID**

```js
await exampleCollection.findOne({ id: 1 }); // Returns an object with a data;

// { _id: ..., id: 1, money: 150 }
// If the data does not exist - returns null

// You can also get multiple datas at once.
await exampleCollection.find({ money: 150 }); // Returns all datas with money == 150

// [
//     { _id: ..., id: 1, money: 150 },
//     { _id: ..., id: 2, money: 150 },
//     ...
// ]
```

**🩰 FindOrCreate method**

```js
// If you don't know if you have a data with a certain ID, you can use this method.

await exampleCollection.findOrCreate({ id: 3 }, { id: 3, burger: false });

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
await exampleCollection.count(); // Returns number
```

**🗑 Deleting a user model**

```js
await exampleCollection.delete({ id: 3 }); // Returns [ { _id: ..., deleted: true / false } ]
//                      ^ If no argument is specified, all models in the collection will be deleted.
```

**🤞 You can use <Document>.$save() or $delete**

```js
let found = await exampleCollection.findOne();
if (!found) return;

found.cool = true;

await found.$save(); // Return { _id: ..., updated: true / false }
await found.$delete(); // Return { _id: ..., deleted: true / false }
```
