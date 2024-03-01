import { type EventFilter, type EntityFilter } from "./validation";
export function printEventFilters(filters: EventFilter[]) {
  console.log("EventFilters:");
  for (const filter of filters) {
    console.log(`- ${filter.type}: ${JSON.stringify(filter.data)}`);
  }
  console.log();
}

export function printEntityFilters(filters: EntityFilter[]) {
  console.log();

  console.log("EntityFilters:");
  for (const filter of filters) {
    console.log(`- ${filter.type}: ${JSON.stringify(filter.data)}`);
  }
  console.log();
}
