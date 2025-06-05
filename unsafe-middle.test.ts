import { unsafeMiddleValue } from './unsafe-middle';

describe('unsafeMiddleValue', () => {
  test('TC01: 最后一位是奇数且小于9', () => {
    expect(unsafeMiddleValue(1.0, 2.0)).toBe(1.6);
  });

  test('TC02: 调整后值等于b', () => {
    expect(unsafeMiddleValue(1.0, 1.2)).toBe(1.1); // 原始中间值是1.1，调整成1.2后等于b，所以返回1.1
  });

  test('TC03: 最后一位是偶数', () => {
    expect(unsafeMiddleValue(1.0, 1.4)).toBe(1.2); // 最后一位是2，保持不变
  });

  test('TC04: 没有小数部分', () => {
    expect(unsafeMiddleValue(1.9999, 2.0001)).toBe(2.0); // 中间值为2.0，没有小数部分
  });

  test('TC05: 最后一位是9，进位后等于输入值', () => {
    expect(unsafeMiddleValue(1.9999, 1.9999)).toBe(1.9999); // 进位后变成2.0000，等于输入值，返回原值
  });

  test('TC06: 进位影响整数部分，结果等于b', () => {
    expect(unsafeMiddleValue(2.9999, 3.0, 5)).toBe(2.99996);
  });

  test('TC07: 精度为0时取整', () => {
    expect(unsafeMiddleValue(1.0, 3.0, 0)).toBe(2); // 中间值为2.0，无小数部分
  });

  test('TC08: 精度更高时正确处理', () => {
    expect(unsafeMiddleValue(1.00001, 1.00003, 5)).toBe(1.00002); // 中间值为1.0002，最后一位是2（偶数）
  });

  test('TC09: 多次进位处理', () => {
    expect(unsafeMiddleValue(0.9999, 1.0001, 4)).toBe(1.0); // 中间值为1.0000，最后一位是0，返回1.0
  });
});
