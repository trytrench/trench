declare module "simhash-js" {
  export class SimHash {
    constructor(options?: SimhashOptions);

    hash(input: string): number;
  }
}
