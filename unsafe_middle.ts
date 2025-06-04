export function unsafeMiddleValue(
  a: number,
  b: number,
  precison: number = 4
): number {
  const middle = parseFloat(((a + b) / 2).toFixed(precison));
  const middleStr = middle.toString();
  const decimalIndex = middleStr.indexOf('.');

  if (decimalIndex === -1) {
    return middle;
  }

  let decimalPart = middleStr.slice(decimalIndex + 1);
  let integerPart = middleStr.slice(0, decimalIndex);

  // find last digit
  let lastDigit = parseInt(decimalPart[decimalPart.length - 1], 10);

  if (lastDigit % 2 !== 0) {
    if (lastDigit < 9) {
      lastDigit++;
    } else {
      let newDecimalPart = '';
      let carry = 1;
      for (let i = decimalPart.length - 1; i >= 0; i--) {
        let digit = parseInt(decimalPart[i], 10) + carry;
        if (digit === 10) {
          digit = 0;
          carry = 1;
        } else {
          carry = 0;
        }
        newDecimalPart = digit.toString() + newDecimalPart;
      }
      if (carry === 1) {
        integerPart = (parseInt(integerPart, 10) + 1).toString();
      }
      decimalPart = newDecimalPart;
      lastDigit = parseInt(decimalPart[decimalPart.length - 1], 10);
    }
  }

  // construct new middle string
  const newMiddleStr = integerPart + '.' + decimalPart.slice(0, -1) + lastDigit;
  const f = parseFloat(newMiddleStr);
  if (f > a && f < b) return f;

  return parseFloat(middleStr);
}
