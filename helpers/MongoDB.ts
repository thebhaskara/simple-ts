import { MongoClient, Db, Collection, ObjectId } from "mongodb"

const url = "mongodb://localhost:27017"
const dbName = "mydatabase"

let db: Db | undefined
let client: MongoClient | undefined

export class MyMongoDB {
	private db: Db | undefined
	private client: MongoClient | undefined
	private url: string = "mongodb://localhost:27017"
	private dbName: string = "mydatabase"
	private eventsMap = new Map<string, Function[]>()

	constructor(url: string, dbName: string) {
		this.url = url
		this.dbName = dbName
	}

	public async connect(): Promise<Db> {
		if (this.db) {
			return this.db
		}

		this.client = new MongoClient(this.url, {})
		await this.client.connect()
		this.db = this.client.db(this.dbName)
		console.log(`Connected to database: ${this.dbName}`)
		this.client.on("close", () => {
			console.log(`Disconnected from database: ${this.dbName}`)
			this.clear()
		})
		return this.db
	}

	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.close()
		}
		this.clear()
	}

	private clear() {
		this.db = undefined
		this.client = undefined
	}

	public on(event: string, callback: Function): void {
		const callbacks = this.eventsMap.get(event) || []
		callbacks.push(callback)
		this.eventsMap.set(event, callbacks)
	}
}

export class MyMongoDBCollection<T> {
	private collection: Collection | undefined
	private cache: Map<string, MyMongoDBDocument<T>> = new Map()

	constructor(private collectionName: string, private db: MyMongoDB) {
		this.collectionName = collectionName
		db.on("clear", () => (this.collection = undefined))
	}

	async getCollection(): Promise<Collection> {
		if (!this.collection) {
			const db = await this.db.connect()
			this.collection = db.collection(this.collectionName)
		}
		return this.collection
	}

	async get(_id: string): Promise<MyMongoDBDocument<T> | null>
	async get(_id: ObjectId): Promise<MyMongoDBDocument<T> | null>
	async get(query: any): Promise<MyMongoDBDocument<T>[]>
	async get(query: unknown): Promise<MyMongoDBDocument<T> | MyMongoDBDocument<T>[] | null> {
		const collection = await this.getCollection()
		if (typeof query == "string") {
			let doc = (await collection.findOne({ _id: new ObjectId(query) })) as T | null
			return doc ? new MyMongoDBDocument(doc, this) : null
		} else if (query instanceof ObjectId) {
			let doc = (await collection.findOne({ _id: query })) as T | null
			return doc ? new MyMongoDBDocument(doc, this) : null
		}
		let docs = (await collection.find(query as any).toArray()) as T[]
		return docs.map((doc) => new MyMongoDBDocument(doc, this))
	}

	private getFromCache(doc: any) {
		let id = doc._id.toString()
		let cached = this.cache.get(id)
		if (!cached) {
			cached = new MyMongoDBDocument(doc, this)
			this.cache.set(id, cached)
		}
		setTimeout(() => this.cache.delete(id), 1000 * 5)
		return cached
	}

	async add(doc: Partial<T> | Partial<T>[]): Promise<void> {
		const collection = await this.getCollection()
		if (Array.isArray(doc)) {
			await collection.insertMany(doc as any)
		} else {
			await collection.insertOne(doc as any)
		}
	}

	async set(query: unknown, update: any): Promise<void> {
		const collection = await this.getCollection()
		if (typeof query == "string") {
			await collection.updateOne({ _id: new ObjectId(query) }, { $set: update })
		} else if (query instanceof ObjectId) {
			await collection.updateOne({ _id: query }, { $set: update })
		} else {
			await collection.updateMany(query as any, { $set: update })
		}
	}
}

export class MyMongoDBDocument<T> {
	private _id: ObjectId | string | undefined
	public current: T
	private update: Partial<T> = {}
	private timeout: NodeJS.Timeout | undefined
	private saveCbs: Function[] = []

	constructor(private obj: any, private collection: MyMongoDBCollection<T>) {
		this._id = this.obj._id
		this.current = { ...obj }
	}

	set(update: Partial<T>): void {
		Object.assign(this.current as any, update)
		this.update = { ...this.update, ...update }
		this.saveDebounced()
	}

	private saveDebounced() {
		if (this.timeout) {
			clearTimeout(this.timeout)
		}
		this.timeout = setTimeout(() => {
			try {
				this.collection.set(this._id, this.update)
				this.update = {}
				this.timeout = undefined
				this.saveCbs.forEach((cb) => cb())
				this.saveCbs = []
			} catch (e) {
				console.error(e)
			}
		}, 100)
	}

	save() {
		return new Promise<void>((resolve, reject) => {
			this.saveCbs.push(resolve)
		})
	}
}
