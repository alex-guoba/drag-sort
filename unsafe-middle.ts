

/**
 * Calculates the midpoint between two numbers, ensuring the last decimal digit is even
 * @param a The first number
 * @param b The second number
 * @param precision The number of decimal places to retain, default is 4
 * @returns The midpoint value, ensuring the last decimal digit is even (if possible)
 */
export function unsafeMiddleValue(
  a: number,
  b: number,
  precision: number = 4,
): number {
  if (a > b) {
    [a, b] = [b, a];
  }
  // Calculate the midpoint and keep the specified precision
  const middle = parseFloat(((a + b) / 2).toFixed(precision));

  // Check if the last digit of the decimal part is odd
  const middleStr = middle.toString();
  const parts = middleStr.split(".");

  // If there's no decimal part or precision is 0, return directly
  if (parts.length === 1 || precision === 0) {
    return middle;
  }

  const decimalPart = parts[1];
  const lastDigit = parseInt(decimalPart[decimalPart.length - 1], 10); // Get the last digit

  // If the length of the decimal part is less than the precision
  if (decimalPart.length < precision) {
    // If the last digit is odd, attempt to adjust it to an even digit
    if (lastDigit % 2 !== 0) {
      const adjusted = parseFloat(
        (middle + 10 ** -decimalPart.length).toFixed(decimalPart.length)
      );
      if (adjusted > a && adjusted < b) {
        return adjusted;
      }
    }
    return middle;
  }

  // If the last decimal digit is already even, return directly
  if (lastDigit % 2 === 0) {
    return middle;
  }

  // Calculate the adjusted value (round up to even)
  const adjusted = parseFloat((middle + 10 ** -precision).toFixed(precision));

  // Ensure the adjusted value stays within the range of a and b
  if (adjusted > a && adjusted < b) {
    return adjusted;
  }

  // may be out of range, return the original middle value
  return middle;
}

