export const zip = <T, U>(firstArray: T[], secondArray: U[]): [T, U][] => {
  const len = firstArray.length;
  const toReturn: [T, U][] = new Array(len);
  for (let i = 0; i < len; i++) {
    const firstItem = firstArray[i];
    const secondItem = secondArray[i];
    if (firstItem === undefined || secondItem === undefined) {
      throw new Error("Arrays must be of equal length");
    }
    toReturn[i] = [firstItem, secondItem];
  }
  return toReturn;
};
