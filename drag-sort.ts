import { unsafeMiddleValue } from './unsafe-middle';

const OrderOverflow = -1;
const UnlockedPosition = -1;

// Item in list
export interface SortableItem {
  id: string;
  order: number; // double
  latched: number; // default to -1, position latched if >= 0
  data?: unknown;
}

// Item with index, for API usage
export interface ItemWithIndex {
  index: number; // position start from 0
  item: SortableItem;
}

export interface DragSortOptions {
  step: number;
  precision: number;

  // When precison overflow, reset order
  onResetOrder?: (items: SortableItem[]) => void;
}

export class DragSortLibrary {
  private items: SortableItem[] = [];
  private option: DragSortOptions = {
    step: 1000,
    precision: 8,
  };

  constructor(items?: SortableItem[], option?: Partial<DragSortOptions>) {
    if (items) {
      this.items = items;
      this.sortItems();
      this.reorderLocked();
    }
    this.option = {
      ...this.option,
      ...option,
    };
  }

  // insert item to the position, order will be caclculated by its neighbor
  insert(
    id: string,
    position: number,
    lock: boolean = false,
    data: unknown = undefined
  ): ItemWithIndex {
    if (position < 0 || position > this.items.length) {
      throw new Error('Position out of range');
    }

    if (this.items.some((i) => i.id === id)) {
      throw new Error('Item with this id already exists');
    }

    const newPos = this.findFreePos(position, lock);

    const newItem: SortableItem = {
      id,
      order: this.calculateOrder(newPos),
      latched: lock ? newPos : UnlockedPosition,
      data,
    };

    this.items = [
      ...this.items.slice(0, newPos),
      newItem,
      ...this.items.slice(newPos),
    ];

    if (newItem.order === OrderOverflow) {
      this.resetOrder();
    }

    return {
      index: newPos,
      item: newItem,
    };
  }

  // append to the end
  append(
    id: string,
    lock: boolean = false,
    data: undefined = undefined
  ): ItemWithIndex {
    const position = this.items.length;
    return this.insert(id, position, lock, data);
  }

  // move to a new position
  move(id: string, position: number): ItemWithIndex {
    if (position < 0 || position > this.items.length - 1) {
      throw new Error('Position out of range');
    }

    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Item not found');
    }
    // ignore if position is same as index
    if (position === index) {
      return {
        index,
        item: this.items[index],
      };
    }

    const newPos = this.findFreePos(position, this.isLocked(this.items[index]));

    const item = this.moveIndex(index, newPos);
    return {
      index: newPos,
      item,
    };
  }

  // delete
  delete(id: string): ItemWithIndex | undefined {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return;
    }

    const items = this.items.splice(index, 1);
    if (items.length === 0) {
      return;
    }
    return {
      index,
      item: items[0],
    };
  }

  // lock
  lock(id: string, lock: boolean = true): ItemWithIndex | undefined {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return;
    }

    const item = this.items[index];
    if (lock && !this.isLocked(item)) {
      item.latched = index;
    } else if (!lock && this.isLocked(item)) {
      item.latched = UnlockedPosition;
    }
    return {
      item,
      index,
    };
  }

  // length
  get length(): number {
    return this.items.length;
  }

  // get all (shallow-copy)
  getAll(): ItemWithIndex[] {
    return this.items.map((item, index) => ({
      item: { ...item },
      index,
    }));
  }

  get(id: string): ItemWithIndex | undefined {
    const index = this.items.findIndex((i) => i.id === id);
    if (index >= 0) {
      return {
        index,
        item: { ...this.items[index] },
      };
    }
  }
  // reorder locked items when needed( insert / delele / move)
  public reorderLocked(): ItemWithIndex[] {
    const updated: ItemWithIndex[] = [];
    const movedIndices = new Set<number>();
    const itemsCopy = [...this.items];
    const totalLength = this.items.length;

    for (let i = 0; i < totalLength; i++) {
      const current = this.get(itemsCopy[i].id)!;
      const item = current.item;
      if (!item) {
        continue;
      }

      if (!this.isLocked(item) || item.latched >= totalLength) continue;

      if (item.latched === current.index) continue;
      if (this.items[item.latched].latched === item.latched) {
        continue; // ignore the same position
      }

      if (!movedIndices.has(i)) {
        try {
          const updatedItem = this.moveIndex(current.index, item.latched);
          updated.push({
            index: item.latched,
            item: { ...updatedItem },
          });
          movedIndices.add(item.latched);
        } catch (error) {
          console.error(`Failed to set position for item ${item.id}:`, error);
        }
      }
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (this.isLocked(item) && item.latched !== i) {
        // reset position if it's out of range or conflict
        item.latched = i;
        updated.push({
          index: i,
          item: { ...item },
        });
      }
    }

    return updated;
  }

  // for unit test
  public checkOrder(): boolean {
    let preOrder = -1;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (this.isLocked(item) && item.latched !== i) {
        return false;
      }
      if (preOrder >= item.order) {
        return false;
      }
      preOrder = item.order;
    }
    return true;
  }

  private isLocked(item: SortableItem): boolean {
    return item.latched != UnlockedPosition;
  }

  // calculate order by index
  private calculateOrder(position: number): number {
    if (this.items.length === 0) {
      return this.option.step;
    }

    if (position === 0) {
      const order = unsafeMiddleValue(
        0,
        this.items[0].order,
        this.option.precision
      );
      if (order <= 0 || order >= this.items[0].order) {
        return OrderOverflow;
      }
      return order;
    }

    if (position === this.items.length) {
      return (
        Math.round(
          (this.items[this.items.length - 1].order + this.option.step - 1) /
            this.option.step
        ) * this.option.step
      );
    }

    const prevItem = this.items[position - 1];
    const nextItem = this.items[position];
    const order = unsafeMiddleValue(
      prevItem.order,
      nextItem.order,
      this.option.precision
    );
    if (order <= prevItem.order || order >= nextItem.order) {
      return OrderOverflow;
    }
    return order;
  }

  // set position by index
  private moveIndex(index: number, position: number) {
    const item = this.items[index];

    this.items.splice(index, 1);
    item.order = this.calculateOrder(position);
    if (this.isLocked(item)) {
      item.latched = position;
    }

    this.items = [
      ...this.items.slice(0, position),
      item,
      ...this.items.slice(position),
    ];

    if (item.order === OrderOverflow) {
      this.resetOrder();
    }

    return item;
  }

  private findFreePos(wanted: number, lock: boolean): number {
    if (lock) {
      return wanted;
    }
    let i = wanted;
    for (; i < this.items.length; i++) {
      if (!this.isLocked(this.items[i])) {
        return i;
      }
    }
    return i;
  }

  // sort by order
  private sortItems(): void {
    this.items.sort((a, b) => a.order - b.order);
  }

  private resetOrder(): void {
    const resorded: SortableItem[] = [];
    this.items.map((item, index) => {
      const order = (index + 1) * this.option.step;
      if (item.order !== order) {
        item.order = order;
        resorded.push(item);
      }
    });

    if (resorded.length > 0 && this.option.onResetOrder) {
      try {
        this.option.onResetOrder(resorded);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
