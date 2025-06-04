import { SortableItem, DragSortLibrary } from './drag_sort';

// 测试用例
describe('DragSortLibrary', () => {
  it('insert', () => {
    const library = new DragSortLibrary(
      [
        { id: '0', position: -1, order: 1 },
        { id: '2', position: -1, order: 3 },
        { id: '1', position: -1, order: 2 },
      ],
      { step: 100000 }
    );
    expect(library.checkOrder()).toBe(true);

    let items = library.getAll();
    expect(items[0].id).toBe('0');
    expect(items[1].id).toBe('1');
    expect(items[2].id).toBe('2');

    expect(items[0].order).toBeLessThan(items[1].order);
    expect(items[1].order).toBeLessThan(items[2].order);

    library.insert('insert_2', 2);
    library.insert('insert_3', 3);
    items = library.getAll();
    expect(items[2].id).toBe('insert_2');
    expect(items[3].id).toBe('insert_3');

    const updated = library.reorderLocked();
    expect(updated.length).toEqual(0);
  });

  it('move', () => {
    const library = new DragSortLibrary();
    library.insert('00', 0);
    library.insert('10', 1);
    library.insert('move', 2);

    // move to header
    library.move('move', 0);
    let items = library.getAll();

    // assert tail is at the first position
    expect(items[0].id).toBe('move');

    // move to middle
    library.move('move', 1);
    items = library.getAll();
    expect(items[1].id).toBe('move');

    const updated = library.reorderLocked();
    expect(updated.length).toEqual(0);
  });

  it('delete', () => {
    const library = new DragSortLibrary();
    library.insert('0', 0);
    library.insert('1', 1);
    library.insert('header', 0, true);

    expect(library.length).toBe(3);

    const deleted = library.delete('0');
    expect(library.checkOrder()).toBe(true);
    expect(deleted?.id).toEqual('0');

    const items = library.getAll();
    expect(items.length).toBe(2);
    expect(items[0].id).toBe('header');
    expect(items[1].id).toBe('1');

    const updated = library.reorderLocked();
    expect(updated.length).toEqual(0);
  });

  it('order-locked', () => {
    const library = new DragSortLibrary();
    library.insert('0_lock', 0, true);
    library.insert('1_unlock', 1, false);
    library.insert('2_lock', 2, true);
    library.insert('3_unlock', 3, false);
    library.insert('4_lock', 4, true);
    library.insert('5_unlock', 5, false);

    // delete an unlocked item, which should not affect the order of locked items
    library.delete('1_unlock');
    library.reorderLocked();

    let items = library.getAll();
    let ids = items.map((i) => i.id);
    expect(ids).toEqual(['0_lock', '3_unlock', '2_lock', '5_unlock', '4_lock']);
    expect(library.checkOrder()).toBe(true);

    //  delete a locked item, which should not affect the order of unlocked items
    library.delete('2_lock');
    library.reorderLocked();
    items = library.getAll();

    ids = items.map((i) => i.id);
    expect(ids).toEqual(['0_lock', '3_unlock', '5_unlock', '4_lock']);
    expect(library.checkOrder()).toBe(true);

    /// position may shirink if not enough items exist
    expect(items[3].position === 3);
  });

  test('get', () => {
    const items: SortableItem[] = [
      { id: '0_lock', order: 0, position: 0 },
      { id: '1_lock', order: 1, position: 1 },
      { id: '2_lock', order: 2, position: 2 },
      { id: '3_unlock', order: 3, position: -1 },
      { id: '4_lock', order: 4, position: 4 },
    ];
    const library = new DragSortLibrary(items);
    library.insert('5_unlock', 5);

    for (let i = 0; i < items.length; i++) {
      const item = library.get(items[i].id);
      expect(item.index === i);

      expect(item.item?.id === items[i].id);
      expect(item.item?.position === items[i].position);
    }
  });

  test('precision-insert', () => {
    const resetAll: SortableItem[] = [];
    const onResetOrder = function (reseted: SortableItem[]) {
      resetAll.push(...reseted);
    };

    const items: SortableItem[] = [
      { id: 'head', order: 1, position: -1 },
      { id: 'tail', order: 1.02, position: -1 },
      { id: 'mid', order: 3, position: -1 },
    ];
    const step = 10;
    const library = new DragSortLibrary(items, {
      precision: 2,
      step,
      onResetOrder,
    });
    expect(library.checkOrder()).toBe(true);

    library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].id === 'mid');
    expect(library.getAll()[1].order === 1.01);

    /// move again in the same position
    library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].id === 'mid');
    expect(library.getAll()[1].order === 1.01);

    expect(resetAll.length).toBe(0);
    // precison overflow
    library.insert('new-node', 1); // insert but precison overflow
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[0].order === step); // reseted

    expect(resetAll.length).toBe(4);
  });

  test('precision-update', () => {
    const resetAll: SortableItem[] = [];
    const onResetOrder = function (reseted: SortableItem[]) {
      resetAll.push(...reseted);
    };

    const items: SortableItem[] = [
      { id: 'head', order: 1, position: -1 },
      { id: 'tail', order: 1.02, position: -1 },
      { id: 'mid', order: 3, position: -1 },
    ];
    const step = 10;
    const library = new DragSortLibrary(items, {
      precision: 2,
      step,
      onResetOrder,
    });
    expect(library.checkOrder()).toBe(true);

    library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].id === 'mid');
    expect(library.getAll()[1].order === 1.01);

    expect(resetAll.length).toBe(0);
    // precison overflow
    library.move('tail', 1); // set but precison overflow
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[0].order === step); // reseted
    expect(resetAll.length).toBe(3);
  });

  test('precision-overflow', () => {
    const resetAll: SortableItem[] = [];
    const onResetOrder = function (reseted: SortableItem[]) {
      resetAll.push(...reseted);
    };

    const step = 10;
    const library = new DragSortLibrary(undefined, {
      precision: 3,
      step,
      onResetOrder,
    });
    library.append('header');
    const middler = library.append('mid');
    const tailer = library.append('tail');

    expect(library.checkOrder()).toBe(true);

    let moveItem = tailer;
    for (let i = 0; i < 10; i++) {
      library.move(moveItem.id, 1);
      expect(library.checkOrder()).toBe(true);
      expect(resetAll.length).toBe(0);
      moveItem = moveItem.id === tailer.id ? middler : tailer;
    }
  });

  test('reset-order', () => {
    const resetAll: SortableItem[] = [];
    const onResetOrder = function (reseted: SortableItem[]) {
      resetAll.push(...reseted);
    };
    const step = 10;
    const items: SortableItem[] = [
      { id: 'head', order: step, position: -1 },
      { id: 'tail', order: step + 2, position: -1 },
      { id: 'mid', order: step + 3, position: -1 },
    ];
    const library = new DragSortLibrary(items, {
      precision: 0,
      step,
      onResetOrder,
    });
    expect(library.checkOrder()).toBe(true);

    library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].id === 'mid');
    expect(library.getAll()[1].order === 11);

    expect(resetAll.length).toBe(0);
    // precison overflow
    library.move('tail', 1); // set but precison overflow
    expect(library.checkOrder()).toBe(true);
    expect(resetAll.length).toBe(2); // header wouldn't be affected
    expect(resetAll[0].id === 'tail');
    expect(resetAll[1].id === 'mid');
  });

  test('reorder-locked-delete', () => {
    const library = new DragSortLibrary();
    library.insert('0_lock', 0, true);
    library.insert('1_unlock', 1, false);
    library.insert('2_lock', 2, true);
    library.insert('3_unlock', 3, false);
    library.insert('4_lock', 4, true);
    library.insert('5_unlock', 5, false);

    // delete an unlocked item
    library.delete('1_unlock');
    let updated = library.reorderLocked();
    expect(updated.length).toBe(2); // locked item will move head
    expect(updated[0].id).toBe('2_lock');
    expect(updated[1].id).toBe('4_lock');

    // delete locked item
    library.delete('2_lock');

    updated = library.reorderLocked();
    expect(updated.length).toBe(1);
    expect(updated[0].id).toEqual('4_lock');
    expect(updated[0].position).toEqual(3);
  });

  test('reorder-locked-insert', () => {
    const library = new DragSortLibrary();
    library.insert('0_lock', 0, true);
    library.insert('1_unlock', 1, false);
    library.insert('2_lock', 2, true);
    library.insert('3_unlock', 3, false);
    library.insert('4_lock', 4, true);
    library.insert('5_unlock', 5, false);

    library.insert('new_header_with_lock', 0, true);
    library.insert('middle_unlock', 4, false);

    const updated = library.reorderLocked();
    expect(updated.length).toBe(3);
    updated.sort((a, b) => a.order - b.order);

    expect(updated[0].id).toEqual('0_lock');
    expect(updated[1].id).toEqual('2_lock');
    expect(updated[2].id).toEqual('4_lock');
  });
});
