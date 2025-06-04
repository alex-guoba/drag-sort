# DragSortLibrary 使用文档

[DragSortLibrary](./drag_sort.ts) 是一个用于管理可拖动排序元素的库。它提供了添加、删除、移动以及锁定某些元素位置的功能，使得在处理复杂的排序逻辑时更加便捷。其内部使用浮点数记录元素相对排序值（order），从而避免每次变更（insert、move，delete）时对元素的排序值进行重新计算。

## 功能特性

- **添加元素**：将新元素添加到指定位置。
- **移动元素**：将某个元素移动到新的位置。
- **删除元素**：从列表中删除指定元素。
- **锁定元素**：某些元素可以被标记为锁定状态，锁定的元素不会因为其他操作（如添加或删除）而改变其顺序。
- **精度控制**：支持通过设置精度和步长来控制排序的细节。
- **重置顺序**：当由于频繁的操作导致顺序无法继续维护时（超出指定的精度精度范围时），支持重置顺序。

## 基本用法

### 初始化

```typescript
import { SortableItem, DragSortLibrary } from './drag_sort';

// 创建一个包含初始项的库实例
const items: SortableItem[] = [
  { id: '0', position: -1, order: 1 },
  { id: '2', position: -1, order: 3 },
  { id: '1', position: -1, order: 2 },
];
const library = new DragSortLibrary(items, { step: 100000 });
```

### 添加元素

```typescript
// 添加两个新元素到指定位置
library.insert('insert_2', 2);
library.insert('insert_3', 3);

// 获取所有元素并验证它们的位置
let items = library.getAll();
expect(items[2].id).toBe('insert_2');
expect(items[3].id).toBe('insert_3');
```

### 移动元素

```typescript
// 将元素'move'移动到索引0处
library.move('move', 0);

// 验证元素是否已经移动到位
let items = library.getAll();
expect(items[0].id).toBe('move');
```

### 删除元素

```typescript
// 删除ID为'0'的元素
const deleted = library.delele('0');

// 验证删除后的列表
let items = library.getAll();
expect(items.length).toBe(2);
expect(items[0].id).toBe('header'); // 假设这是之前添加的一个元素
expect(items[1].id).toBe('1');     // 假设这是另一个已存在的元素
```

### 锁定与解锁元素

```typescript
// 添加带有锁定状态的元素
library.insert('0_lock', 0, true);
library.insert('1_unlock', 1, false);

// 当有解锁元素被删除后，重新计算锁定元素的位置
library.delele('1_unlock');
let updated = library.reorderLocked();
expect(updated.length).toEqual(0); // 没有锁定元素需要调整
```

### 精度控制

```typescript
// 设置精度和步长，并提供回调函数以处理重置订单的情况
const resetAll: SortableItem[] = [];
const onResetOrder = function (reseted: SortableItem[]) {
  resetAll.push(...reseted);
};

const libraryWithPrecision = new DragSortLibrary(items, {
  precision: 2,
  step: 10,
  onResetOrder,
});

// 进行一些可能导致精度溢出的操作...
```

### 获取特定元素信息

```typescript
// 获取特定ID的元素及其索引
const itemInfo = library.get('someItemId');
expect(itemInfo.index).toBe(someIndex);
expect(itemInfo.item?.id).toBe('someItemId');
```

以上就是 `DragSortLibrary` 的基本使用方法。根据实际需求，你可以灵活运用这些功能来构建更复杂的应用场景。