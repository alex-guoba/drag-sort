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
  onResetOrder?: (items: SortableItem[], cbConfig: unknown) => Promise<void>;
}

export class DragSortLibrary {
  private items: SortableItem[] = [];
  private option: DragSortOptions = {
    step: 1024,
    precision: 8,
  };
  private cbConfig: unknown;

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

  public setOptions(options: DragSortOptions) {
    this.option = {
      ...this.option,
      ...options,
    };
  }

  get step() {
    return this.option.step;
  }

  get precision() {
    return this.option.precision;
  }

  // clean all history data
  clean() {
    this.items = [];
    this.cbConfig = null;
  }

  // insert item to the position, order will be caclculated by its neighbor
  async insert(
    id: string,
    position: number,
    lock: boolean = false,
    data: unknown = undefined
  ): Promise<ItemWithIndex> {
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
  async append(
    id: string,
    lock: boolean = false,
    data: undefined = undefined
  ): Promise<ItemWithIndex> {
    const position = this.items.length;
    return this.insert(id, position, lock, data);
  }

  // move to a new position
  async move(id: string, position: number): Promise<ItemWithIndex> {
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

    const item = await this.moveIndex(index, newPos);
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
  public async reorderLocked(): Promise<ItemWithIndex[]> {
    const updated: ItemWithIndex[] = [];
    const movedIndices = new Set<number>();

    const itemsCopy = [...this.items]; // avoid mutating the original array during iteration
    const totalLength = itemsCopy.length;

    for (let i = 0; i < totalLength; i++) {
      const current = this.get(itemsCopy[i].id)!;

      if (!this.isLocked(current.item) || current.item.latched >= totalLength) continue;

      // no need to move
      if (current.item.latched === current.index) {
        movedIndices.add(current.item.latched);
        continue;
      };

      // if destination is locked, ignore
      if (this.isLocked(this.items[current.item.latched])) continue;

      if (!movedIndices.has(current.item.latched)) {
        try {
          const updatedItem = await this.moveIndex(current.index, current.item.latched);
          updated.push({
            index: current.item.latched,
            item: { ...updatedItem },
          });
          movedIndices.add(current.item.latched);
        } catch (error) {
          console.error(`Failed to set position for item ${current.item.id}:`, error);
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

  private nextOrderValue(order: number): number {
     
    const next =
       
      Math.round((order + this.option.step - 1) / this.option.step) *
      this.option.step;
    if (next < 0) {
      return Math.round(order) + this.option.step;
    }
    return next;
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

    if (position >= this.items.length) {
      return this.nextOrderValue(this.items[this.items.length - 1].order);
    }

    const prevItem = this.items[position - 1];
    const nextItem = this.items[position];
    const order = unsafeMiddleValue(
      prevItem.order,
      nextItem.order,
      this.option.precision,
    );
    if (order <= prevItem.order || order >= nextItem.order) {
      return OrderOverflow;
    }
    return order;
  }

  // set position by index
  private async moveIndex(index: number, position: number) {
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
      await this.resetOrder();
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

  private async resetOrder() {
    const reorded: SortableItem[] = [];
    this.items.forEach((item, index) => {
      const order = (index + 1) * this.option.step;
      if (item.order !== order) {
        item.order = order;
        reorded.push(item);
      }
    });

    if (reorded.length > 0 && this.option.onResetOrder) {
      try {
        await this.option.onResetOrder(reorded, this.cbConfig);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
