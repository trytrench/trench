type TrenchEvent = {
  type: string;
  timestamp: Date;
  data: any;
};

declare module fn {
  function testFunction(n: number): string;
}
