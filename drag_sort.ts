import { unsafeMiddleValue } from './unsafe_middle';

const OrderOverflow = -1;

export interface SortableItem {
  id: string;
  order: number; // double
  position: number; // default to -1, position locked if >= 0
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

  // Add item to the list
  insert(id: string, position: number, lock: boolean = false): SortableItem {
    if (position < 0 || position > this.items.length) {
      throw new Error('Position out of range');
    }

    if (this.items.some((i) => i.id === id)) {
      throw new Error('Item with this id already exists');
    }

    const newItem: SortableItem = {
      id,
      order: this.calculateOrder(position),
      position: lock ? position : -1,
    };

    this.items = [
      ...this.items.slice(0, position),
      newItem,
      ...this.items.slice(position),
    ];

    if (newItem.order === OrderOverflow) {
      this.resetOrder();
    }

    return newItem;
  }

  append(id: string, lock: boolean = false): SortableItem {
    const position = this.items.length;
    return this.insert(id, position, lock);
  }

  // set position
  move(id: string, position: number): SortableItem {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Item not found');
    }

    if (position < 0 || position > this.items.length - 1) {
      throw new Error('Position out of range');
    }

    // ignore if position is same as index
    if (position === index) {
      return this.items[index];
    }

    const item = this.moveIndex(index, position);
    return item;
  }

  // Delete
  delele(id: string): SortableItem | undefined {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return;
    }

    const items = this.items.splice(index, 1);
    if (items.length === 0) {
      return;
    }
    return items[0];
  }

  // length
  get length(): number {
    return this.items.length;
  }

  // get all
  getAll(): SortableItem[] {
    return [...this.items];
  }

  clone(): SortableItem[] {
    return this.items.map((item) => ({ ...item }));
  }

  get(id: string) {
    // return this.items.find((i) => i.id === id);
    const index = this.items.findIndex((i) => i.id === id);
    return {
      index,
      item: index !== -1 ? this.items[index] : null,
    };
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
    if (item.position >= 0) {
      item.position = position;
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

  // sort by order
  private sortItems(): void {
    this.items.sort((a, b) => a.order - b.order);
  }

  // reorder locked items when needed( insert / delele / move)
  public reorderLocked(): SortableItem[] {
    const updated: SortableItem[] = [];
    const movedIndices = new Set<number>();
    const itemsCopy = [...this.items];
    const totalLength = this.items.length;

    for (let i = 0; i < totalLength; i++) {
      const current = this.get(itemsCopy[i].id);
      const item = current.item;
      if (!item) {
        continue;
      }

      if (item.position < 0 || item.position >= totalLength) continue;
      if (item.position === current.index) continue;
      if (this.items[item.position].position === item.position) {
        continue; // ignore the same position
      }

      if (!movedIndices.has(i)) {
        try {
          const updatedItem = this.moveIndex(current.index, item.position);
          updated.push({ ...updatedItem });
          movedIndices.add(item.position);
        } catch (error) {
          console.error(`Failed to set position for item ${item.id}:`, error);
        }
      }
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.position >= 0 && item.position !== i) {
        // reset position if it's out of range or repeated
        item.position = i;
        updated.push({ ...item });
      }
    }

    return updated;
  }

  // for unit test
  public checkOrder(): boolean {
    let preOrder = -1;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.position >= 0 && item.position !== i) {
        return false;
      }
      if (preOrder >= item.order) {
        return false;
      }
      preOrder = item.order;
    }
    return true;
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

    if (resorded.length > 0) {
      if (this.option.onResetOrder) {
        this.option.onResetOrder(resorded);
      }
    }
  }
}
