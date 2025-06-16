
export class StoreByRef<T> {
	store: WeakMap<any, T> = new WeakMap();

	get(ref: any) {
		return this.store.get(ref);
	}

	set(ref: any, obj: T) {
		this.store.set(ref, obj);
	}
}
