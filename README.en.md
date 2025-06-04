# DragSortLibrary Documentation

[DragSortLibrary](./drag_sort.ts) is a library designed to manage sortable elements that support drag-and-drop interactions. It offers functionalities such as adding, removing, moving, and locking specific elements' positions, making it easier to handle complex sorting logic.

## Key Features

- **Add Elements**: Insert new items at specified positions.
- **Move Elements**: Move items to new positions within the list.
- **Delete Elements**: Remove specified items from the list.
- **Lock Elements**: Certain elements can be marked as locked, meaning their order won't change due to other operations like add or delete.
- **Precision Control**: Offers control over sorting precision using step values and precision settings.
- **Order Reset**: When frequent operations make maintaining order impossible, the library supports resetting the order.

## Basic Usage

### Initialization

```typescript
import { SortableItem, DragSortLibrary } from './drag_sort';

// Create a library instance with initial items
const items: SortableItem[] = [
  { id: '0', position: -1, order: 1 },
  { id: '2', position: -1, order: 3 },
  { id: '1', position: -1, order: 2 },
];
const library = new DragSortLibrary(items, { step: 100000 });
```

### Adding Elements

```typescript
// Add new items at specific positions
library.add('add_2', 2);
library.add('add_3', 3);

// Retrieve all items and verify their positions
let items = library.getAll();
expect(items[2].id).toBe('add_2');
expect(items[3].id).toBe('add_3');
```

### Moving Elements

```typescript
// Move the element 'move' to index 0
library.move('move', 0);

// Verify that the item has moved correctly
let items = library.getAll();
expect(items[0].id).toBe('move');
```

### Deleting Elements

```typescript
// Delete an element by its ID
const deleted = library.delele('0');

// Verify the list after deletion
let items = library.getAll();
expect(items.length).toBe(2);
expect(items[0].id).toBe('header'); // Assuming this was added earlier
expect(items[1].id).toBe('1');      // Assuming this was another existing item
```

### Locking and Unlocking Elements

```typescript
// Add elements with lock status
library.add('0_lock', 0, true);
library.add('1_unlock', 1, false);

// After deleting an unlocked item, recalculate the positions of locked items
library.delele('1_unlock');
let updated = library.reorderLocked();
expect(updated.length).toEqual(0); // No locked items need adjustment
```

### Precision Control

```typescript
// Set precision and step values, and provide a callback for handling order resets
const resetAll: SortableItem[] = [];
const onResetOrder = function (reseted: SortableItem[]) {
  resetAll.push(...reseted);
};

const libraryWithPrecision = new DragSortLibrary(items, {
  precision: 2,
  step: 10,
  onResetOrder,
});

// Perform actions that may lead to precision overflow...
```

### Retrieving Specific Element Information

```typescript
// Get information about an item by its ID
const itemInfo = library.get('someItemId');
expect(itemInfo.index).toBe(someIndex);
expect(itemInfo.item?.id).toBe('someItemId');
```

These are the basic usage instructions for the `DragSortLibrary`. Depending on your requirements, you can combine these features to build more complex applications.