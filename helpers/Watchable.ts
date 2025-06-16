// export class Watchable<T> {
// 	private _value: T
// 	private _callbacks: Set<Function> = new Set()

// 	constructor(value: T) {
// 		this._value = value
// 	}

// 	get(): T {
// 		this.onSet(globalCallbacks[globalCallbacks.length - 1])
// 		return this._value
// 	}

// 	set(v: Partial<T>) {
// 		this._value = { ...this._value, ...v }
// 		addAndRunMicrotask(this._callbacks)
// 	}

// 	onSet(callback: Function): void {
// 		this._callbacks.add(callback)
// 	}
// }

// let globalCallbacks: Function[] = []
// // let globalClearCallbacks: Function[] = []

// export function watch(cb: Function) {
// 	let clearCbs = new Set<Function>()
// 	let clear = () => {
// 		pendingSet.forEach((cb) => clearCbs.add(cb))
// 		runningSet.forEach((cb) => clearCbs.add(cb))
// 		clearCbs.forEach((cb) => cb())
// 	}
// 	let wrappedCb = () => {
// 		clear()
// 		globalCallbacks.push(wrappedCb)
// 		// globalClearCallbacks.push(clear)
// 		cb(clearCbs)
// 		globalCallbacks.pop()
// 		// globalClearCallbacks.pop()
// 	}

// 	addAndRunMicrotask([wrappedCb])
// }

// let pendingSet = new Set<Function>()
// let runningSet = new Set<Function>()
// function addAndRunMicrotask(cbs?: Set<Function> | Function[]) {
// 	cbs?.forEach((cb) => pendingSet.add(cb))
// 	if (pendingSet.size === 0) return
// 	if (runningSet.size > 0) return
// 	runningSet = pendingSet
// 	pendingSet = new Set()
// 	queueMicrotask(() => {
// 		runningSet.forEach((cb) => cb())
// 		runningSet = new Set()
// 		addAndRunMicrotask()
// 	})
// }

const queuedSet = new Set<Function>()
const runningSet = new Set<Function>()
function runMicrotask() {
	if (runningSet.size > 0) return
	if (queuedSet.size === 0) return
	queuedSet.forEach((cb) => runningSet.add(cb))
	queuedSet.clear()
	queueMicrotask(() => {
		runningSet.forEach((cb) => cb())
		runningSet.clear()
		runMicrotask()
	})
}

function addMicrotask(cb: Function | Set<Function> | Function[]) {
	if (cb instanceof Function) {
		queuedSet.add(cb)
	} else {
		cb.forEach((cb) => queuedSet.add(cb))
	}
	runMicrotask()
}

let currentWatchStack: Function[] = []
function watch(cb: Function) {
	let clearCbs = new Set<Function>()
	let clear = () => {
		// queuedSet.forEach((cb) => clearCbs.add(cb))
		// runningSet.forEach((cb) => clearCbs.add(cb))
		clearCbs.forEach((cb) => cb())
	}
	let wrappedCb = () => {
		clear()
		currentWatchStack.push(wrappedCb)
		let clearCb = cb(clearCbs)
		if (clearCb instanceof Function) {
			clearCbs.add(clearCb)
		}
		currentWatchStack.pop()
	}

	addMicrotask(wrappedCb)

	return clear
}

export const makeProxy = <T extends object>(...sources: T[]): T => {
	let targets = [...sources]

	let watches = new WeakMap<T, Map<string | symbol, Set<Function>>>()

	function addWatch(target: T, propertyKey: string | symbol) {
		let cb = currentWatchStack.at(-1)
		if (!cb) return
		let watchMap = watches.get(target)
		if (!watchMap) {
			watchMap = new Map()
			watches.set(target, watchMap)
		}
		let watchSet = watchMap.get(propertyKey)
		if (!watchSet) {
			watchSet = new Set()
			watchMap.set(propertyKey, watchSet)
		}
		watchSet.add(cb)
	}

	function addMicrotaskForWatch(target: T, propertyKey: string | symbol) {
		let watchMap = watches.get(target)
		if (!watchMap) return
		let watchSet = watchMap.get(propertyKey)
		if (!watchSet) return
		addMicrotask(watchSet)
	}

	const handler: ProxyHandler<T> = {
		get(target, propertyKey, receiver) {
			let value
			let tgts = targets.filter((target) => {
				if (propertyKey in target) {
					value = Reflect.get(target, propertyKey, receiver)
					addWatch(target, propertyKey)
					return true
				}
			})

			return value
		},
		set(target, propertyKey, value, receiver) {
			let tgts = targets.filter((target) => {
				if (propertyKey in target) {
					Reflect.set(target, propertyKey, value, receiver)
					addMicrotaskForWatch(target, propertyKey)
					return true
				}
			})

			if (tgts.length === 0) {
				Reflect.set(targets[0], propertyKey, value, receiver)
				addMicrotaskForWatch(target, propertyKey)
			}
			return true
		},
	}
	return new Proxy(Object.assign({}, ...sources), handler)
}
