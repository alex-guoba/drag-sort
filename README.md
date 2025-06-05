# DragSortLibrary Documentation

[DragSortLibrary](./drag_sort.ts) is a utility library for managing drag-and-sort operations on a list of items. It supports inserting, moving, deleting, and locking elements while maintaining their relative order using floating-point values ([order](./drag_sort.ts#L7-L7)). This avoids the need to recompute all order values after every operation (e.g., insert, move, delete).

## Features

- **Insert Elements**: Add an item at a specified position.
- **Move Elements**: Move an existing item to a new index.
- **Delete Elements**: Remove an item by its ID.
- **Lock Elements**: Lock certain elements so that they remain in place during other sorting operations.
- **Precision Control**: Customize precision and step size to manage spacing between order values.
- **Order Reset**: Automatically reset the order when precision limits are exceeded.

## Basic Usage

### Initialization

To initialize the library with a set of sortable items:

```typescript
import { SortableItem, DragSortLibrary } from './drag-sort';

const items: SortableItem[] = [
  { id: '0', latched: -1, order: 1 },
  { id: '2', latched: -1, order: 3 },
  { id: '1', latched: -1, order: 2 },
];
const library = new DragSortLibrary(items, { step: 100000 });
```

### Inserting Items

You can insert or append items like this:

```typescript
library.insert('insert_2', 2);
library.append('insert_3');

let items = library.getAll();
expect(items[2].item.id).toBe('insert_2');
expect(items[3].item.id).toBe('insert_3');
```

### Moving Items

Move an item to a specific index:

```typescript
library.move('move', 0);

let items = library.getAll();
expect(items[0].item.id).toBe('move');
```

### Deleting Items

Remove an item by ID:

```typescript
const deleted = library.delete('0');

let items = library.getAll();
expect(items.length).toBe(2);
expect(items[0].item.id).toBe('header');
expect(items[1].item.id).toBe('1');
```

### Locking/Unlocking Elements

Add locked/unlocked items:

```typescript
library.insert('0_lock', 0, true);
library.insert('1_unlock', 1, false);

library.delete('1_unlock');
let updated = library.reorderLocked();
expect(updated.length).toEqual(0);
```

### Precision & Order Reset

Set precision and step size, and define a callback for handling order resets:

```typescript
const resetAll: SortableItem[] = [];
const onResetOrder = function (reseted: SortableItem[]) {
  resetAll.push(...reseted);
};

const libraryWithPrecision = new DragSortLibrary(items, {
  precision: 2,
  step: 10,
  onResetOrder,
});
```

### Get Specific Item Info

Retrieve an item and its current index:

```typescript
const itemInfo = library.get('someItemId');
expect(itemInfo.index).toBe(someIndex);
expect(itemInfo.item?.id).toBe('someItemId');
```

---

This covers the core features and usage patterns of the `DragSortLibrary`. You can extend and adapt it based on your application's needs.

Let me know if you'd like to add sections such as:

- Installation instructions
- API reference
- Contributing guidelines
- License information
- Unit testing guide

I can generate those too!
