/**
 * Minimal in-memory stand-in for the slice of the firebase-admin Firestore API
 * the Flow webhook uses: doc/collection refs, and a transaction with
 * get/set/update (dotted field paths). Writes apply immediately — the handler
 * always reads before writing, so buffering isn't needed for these tests.
 */

type DocData = Record<string, unknown>;

export class FakeDocRef {
  constructor(
    private db: FakeFirestore,
    readonly path: string
  ) {}

  collection(name: string) {
    return new FakeCollectionRef(this.db, `${this.path}/${name}`);
  }
}

export class FakeCollectionRef {
  constructor(
    private db: FakeFirestore,
    readonly path: string
  ) {}

  doc(id?: string) {
    return new FakeDocRef(this.db, `${this.path}/${id ?? `auto-${this.db.nextAutoId()}`}`);
  }
}

class FakeTransaction {
  constructor(private db: FakeFirestore) {}

  async get(ref: FakeDocRef) {
    const data = this.db.docs.get(ref.path);
    return {
      exists: data !== undefined,
      data: () => data,
    };
  }

  set(ref: FakeDocRef, data: DocData, options?: { merge?: boolean }) {
    const existing = this.db.docs.get(ref.path);
    this.db.docs.set(
      ref.path,
      options?.merge && existing ? { ...existing, ...data } : { ...data }
    );
  }

  update(ref: FakeDocRef, data: DocData) {
    const existing = this.db.docs.get(ref.path);
    if (!existing) throw new Error(`update on missing doc ${ref.path}`);
    for (const [key, value] of Object.entries(data)) {
      setDottedPath(existing, key, value);
    }
  }
}

function setDottedPath(target: DocData, dottedKey: string, value: unknown) {
  const segments = dottedKey.split(".");
  let node = target;
  for (const segment of segments.slice(0, -1)) {
    const next = node[segment];
    if (typeof next !== "object" || next === null) {
      node[segment] = {};
    }
    node = node[segment] as DocData;
  }
  node[segments[segments.length - 1]] = value;
}

export class FakeFirestore {
  readonly docs = new Map<string, DocData>();
  private autoId = 0;

  nextAutoId() {
    return ++this.autoId;
  }

  doc(path: string) {
    return new FakeDocRef(this, path);
  }

  collection(path: string) {
    return new FakeCollectionRef(this, path);
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    return fn(new FakeTransaction(this));
  }

  /** Direct children of a collection path (no nested subcollections). */
  docsUnder(collectionPath: string): DocData[] {
    const prefix = `${collectionPath}/`;
    return [...this.docs.entries()]
      .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
      .map(([, data]) => data);
  }
}
