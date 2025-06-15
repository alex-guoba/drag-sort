import { SortableItem, DragSortLibrary } from './drag-sort';

// 测试用例
describe('DragSortLibrary', () => {
  it('insert', async () => {
    const library = new DragSortLibrary(
      [
        { id: '0', latched: -1, order: 1 },
        { id: '2', latched: -1, order: 3 },
        { id: '1', latched: -1, order: 2 },
      ],
      { step: 100000 }
    );
    expect(library.checkOrder()).toBe(true);

    let items = library.getAll();
    expect(items[0].item.id).toBe('0');
    expect(items[1].item.id).toBe('1');
    expect(items[2].item.id).toBe('2');

    expect(items[0].item.order).toBeLessThan(items[1].item.order);
    expect(items[1].item.order).toBeLessThan(items[2].item.order);

    await library.insert('insert_2', 2);
    await library.insert('insert_3', 3);
    items = library.getAll();
    expect(items[2].item.id).toBe('insert_2');
    expect(items[3].item.id).toBe('insert_3');

    const updated = await library.reorderLocked();
    expect(updated.length).toEqual(0);
  });

  it('insert-unlock-before-locked', async () => {
    const library = new DragSortLibrary();
    library.append('0_lock', true);
    library.append('1_unlock', false);
    library.append('2_lock', true);
    library.append('3_lock', true);
    library.append('4_unlock', false);

    expect(library.checkOrder()).toBe(true);

    // insert unlocked item before locked item, it will be pushed to the end of locked items
    await library.insert('new_unlock', 2);
    expect(library.getAll().map((item) => item.item.id)).toEqual([
      '0_lock',
      '1_unlock',
      '2_lock',
      '3_lock',
      'new_unlock',
      '4_unlock',
    ]);

    const beupdated = await library.reorderLocked();
    expect(beupdated.length).toBe(0);
  });

  it('insert-before-locked', async () => {
    const library = new DragSortLibrary();
    library.append('0_lock', true);
    library.append('1_unlock', false);
    library.append('2_lock', true);
    library.append('3_lock', true);
    library.append('4_unlock', false);

    expect(library.checkOrder()).toBe(true);

    // insert locked item before locked item, it will replace its positon
    await library.insert('new_lock', 2, true);
    expect(library.getAll().map((item) => item.item.id)).toEqual([
      '0_lock', // 0
      '1_unlock',
      'new_lock', // 2
      '2_lock', // 2
      '3_lock', // 3
      '4_unlock',
    ]);

    // locked itemd will be reordered
    expect((await library.reorderLocked()).length).toBe(2);
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll().map((item) => item.item.id)).toEqual([
      '0_lock', // 0
      '1_unlock',
      'new_lock', // 2
      '3_lock', // 3
      '2_lock', // conflict item will be reset
      '4_unlock',
    ]);
  });

  it('move', async () => {
    const library = new DragSortLibrary();
    library.insert('00', 0);
    library.insert('10', 1);
    library.insert('move', 2);

    // move to header
    await library.move('move', 0);
    let items = library.getAll();

    // assert tail is at the first position
    expect(items[0].item.id).toBe('move');

    // move to middle
    await library.move('move', 1);
    items = library.getAll();
    expect(items[1].item.id).toBe('move');

    const updated = await library.reorderLocked();
    expect(updated.length).toEqual(0);
  });

  it('move-before-locked', async () => {
    const library = new DragSortLibrary();
    await library.append('0_lock', true);
    await library.append('1_unlock', false);
    await library.append('2_lock', true);
    await library.append('3_lock', true);
    await library.append('4_unlock', false);

    expect(library.checkOrder()).toBe(true);

    // move unlocked item before locked item, it will be pushed to the end of locked items
    library.append('moveable', false);
    const moved = await library.move('moveable', 2);
    expect(library.getAll().map((item) => item.item.id)).toEqual([
      '0_lock',
      '1_unlock',
      '2_lock',
      '3_lock',
      'moveable',
      '4_unlock',
    ]);

    expect((await library.reorderLocked()).length).toBe(0);

    // insert locked item before locked item, it will replace its positon
    library.delete(moved.item.id);
    await library.append('moveable', true);
    await library.move('moveable', 2);
    expect(library.getAll().map((item) => item.item.id)).toEqual([
      '0_lock', // 0
      '1_unlock',
      'moveable', // 2
      '2_lock', // 2
      '3_lock', // 3
      '4_unlock',
    ]);

    // locked itemd will be reordered
    expect((await library.reorderLocked()).length).toBe(2);
    expect(library.getAll().map((item) => item.item.id)).toEqual([
      '0_lock', // 0
      '1_unlock',
      'moveable', // 2
      '3_lock', // 3
      '2_lock', // conflict item will be reset
      '4_unlock',
    ]);
  });

  it('delete', async () => {
    const library = new DragSortLibrary();
    await library.insert('0', 0);
    await library.insert('1', 1);
    await library.insert('header', 0, true);

    expect(library.length).toBe(3);

    const deleted = library.delete('0')!;
    expect(library.checkOrder()).toBe(true);
    expect(deleted.item.id).toEqual('0');

    const items = library.getAll();
    expect(items.length).toBe(2);
    expect(items[0].item.id).toBe('header');
    expect(items[1].item.id).toBe('1');

    const updated = await library.reorderLocked();
    expect(updated.length).toEqual(0);
  });

  it('order-locked', async () => {
    const library = new DragSortLibrary();
    await library.insert('0_lock', 0, true);
    await library.insert('1_unlock', 1, false);
    await library.insert('2_lock', 2, true);
    await library.insert('3_unlock', 3, false);
    await library.insert('4_lock', 4, true);
    await library.insert('5_unlock', 5, false);

    // delete an unlocked item, which should not affect the order of locked items
    library.delete('1_unlock');
    await library.reorderLocked();

    let items = library.getAll();
    let ids = items.map((i) => i.item.id);
    expect(ids).toEqual(['0_lock', '3_unlock', '2_lock', '5_unlock', '4_lock']);
    expect(library.checkOrder()).toBe(true);

    //  delete a locked item, which should not affect the order of unlocked items
    library.delete('2_lock');
    await library.reorderLocked();
    items = library.getAll();

    ids = items.map((i) => i.item.id);
    expect(ids).toEqual(['0_lock', '3_unlock', '5_unlock', '4_lock']);
    expect(library.checkOrder()).toBe(true);

    /// position may shirink if not enough items exist
    expect(items[3].item.latched === 3);
  });

  test('get', async () => {
    const items: SortableItem[] = [
      { id: '0_lock', order: 0, latched: 0 },
      { id: '1_lock', order: 1, latched: 1 },
      { id: '2_lock', order: 2, latched: 2 },
      { id: '3_unlock', order: 3, latched: -1 },
      { id: '4_lock', order: 4, latched: 4 },
    ];
    const library = new DragSortLibrary(items);
    await library.insert('5_unlock', 5);

    for (let i = 0; i < items.length; i++) {
      const item = library.get(items[i].id)!;
      expect(item.index === i);

      expect(item.item.id === items[i].id);
      expect(item.item.latched === items[i].latched);
    }
  });

  test('precision-insert', () => {
    const resetAll: SortableItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onResetOrder = function (reseted: SortableItem[], _cfg: unknown) {
      resetAll.push(...reseted);
      return Promise.resolve();
    };

    const items: SortableItem[] = [
      { id: 'head', order: 1, latched: -1 },
      { id: 'tail', order: 1.02, latched: -1 },
      { id: 'mid', order: 3, latched: -1 },
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
    expect(library.getAll()[1].item.id === 'mid');
    expect(library.getAll()[1].item.order === 1.01);

    /// move again in the same position
    library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].item.id === 'mid');
    expect(library.getAll()[1].item.order === 1.01);

    expect(resetAll.length).toBe(0);
    // precison overflow
    library.insert('new-node', 1); // insert but precison overflow
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[0].item.order === step); // reseted

    expect(resetAll.length).toBe(4);
  });

  test('precision-update', async () => {
    const resetAll: SortableItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onResetOrder = function (reseted: SortableItem[], cbConfig: unknown) {
      resetAll.push(...reseted);
      return Promise.resolve();
    };

    const items: SortableItem[] = [
      { id: 'head', order: 1, latched: -1 },
      { id: 'tail', order: 1.02, latched: -1 },
      { id: 'mid', order: 3, latched: -1 },
    ];
    const step = 10;
    const library = new DragSortLibrary(items, {
      precision: 2,
      step,
      onResetOrder,
    });
    expect(library.checkOrder()).toBe(true);

    await library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].item.id === 'mid');
    expect(library.getAll()[1].item.order === 1.01);

    expect(resetAll.length).toBe(0);
    // precison overflow
    library.move('tail', 1); // set but precison overflow
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[0].item.order === step); // reseted
    expect(resetAll.length).toBe(3);
  });

  test('precision-overflow', async () => {
    const resetAll: SortableItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onResetOrder = function (reseted: SortableItem[], cbConfig: unknown) {
      resetAll.push(...reseted);
      return Promise.resolve();
    };

    const step = 10;
    const library = new DragSortLibrary(undefined, {
      precision: 3,
      step,
      onResetOrder,
    });
    await library.append('header');
    const middler = await library.append('mid');
    const tailer = await library.append('tail');

    expect(library.checkOrder()).toBe(true);

    let moveItem = tailer.item!;
    for (let i = 0; i < 10; i++) {
      await library.move(moveItem.id, 1);
      expect(library.checkOrder()).toBe(true);
      expect(resetAll.length).toBe(0);
      moveItem = moveItem.id === tailer.item.id ? middler.item : tailer.item;
    }
  });

  test('reset-order', async () => {
    const resetAll: SortableItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onResetOrder = function (reseted: SortableItem[], cbConfig: unknown) {
      resetAll.push(...reseted);
      return Promise.resolve();
    };
    const step = 10;
    const items: SortableItem[] = [
      { id: 'head', order: step, latched: -1 },
      { id: 'tail', order: step + 2, latched: -1 },
      { id: 'mid', order: step + 3, latched: -1 },
    ];
    const library = new DragSortLibrary(items, {
      precision: 0,
      step,
      onResetOrder,
    });
    expect(library.checkOrder()).toBe(true);

    await library.move('mid', 1); // move to middle
    expect(library.checkOrder()).toBe(true);
    expect(library.getAll()[1].item.id === 'mid');
    expect(library.getAll()[1].item.order === 11);

    expect(resetAll.length).toBe(0);
    // precison overflow
    await library.move('tail', 1); // set but precison overflow
    expect(library.checkOrder()).toBe(true);
    expect(resetAll.length).toBe(2); // header wouldn't be affected
    expect(resetAll[0].id === 'tail');
    expect(resetAll[1].id === 'mid');
  });

  test('reorder-locked-delete', async () => {
    const library = new DragSortLibrary();
    await library.insert('0_lock', 0, true);
    await library.insert('1_unlock', 1, false);
    await library.insert('2_lock', 2, true);
    await library.insert('3_unlock', 3, false);
    await library.insert('4_lock', 4, true);
    await library.insert('5_unlock', 5, false);

    // delete an unlocked item
    library.delete('1_unlock');
    let updated = await library.reorderLocked();
    expect(updated.length).toBe(2); // locked item will move head
    expect(updated[0].item.id).toBe('2_lock');
    expect(updated[1].item.id).toBe('4_lock');

    // delete locked item
    library.delete('2_lock');

    updated = await library.reorderLocked();
    expect(updated.length).toBe(1);
    expect(updated[0].item.id).toEqual('4_lock');
    expect(updated[0].item.latched).toEqual(3);
  });

  test('reorder-locked-insert', async () => {
    const library = new DragSortLibrary();
    await library.insert('0_lock', 0, true);
    await library.insert('1_unlock', 1, false);
    await library.insert('2_lock', 2, true);
    await library.insert('3_unlock', 3, false);
    await library.insert('4_lock', 4, true);
    await library.insert('5_unlock', 5, false);

    await library.insert('new_header_with_lock', 0, true);
    await library.insert('middle_unlock', 4, false);

    const updated = await library.reorderLocked();
    expect(updated.length).toBe(3);
    updated.sort((a, b) => a.item.order - b.item.order);

    expect(updated[0].item.id).toEqual('0_lock');
    expect(updated[1].item.id).toEqual('2_lock');
    expect(updated[2].item.id).toEqual('4_lock');
  });
});
