import { EventFilters, type EntityFilters } from "./validation";
export function printEventFilters(filters: EventFilters) {
  console.log("EventFilters:");
  if (filters.dateRange) {
    console.log("  - dateRange:", filters.dateRange);
  }
  if (filters.eventType) {
    console.log("  - eventType:", filters.eventType);
  }
  if (filters.entities) {
    console.log("  - entities:", filters.entities);
  }
  if (filters.features) {
    console.log(
      "  - features:",
      filters.features.map((f) => f.featureName)
    );
  }
}

export function printEntityFilters(filters: EntityFilters) {
  console.log();
  console.log("EntityFilters:");
  if (filters.entityType) {
    console.log("  - entityType:", filters.entityType);
  }
  if (filters.entityId) {
    console.log("  - entityId:", filters.entityId);
  }
  if (filters.features) {
    console.log(
      "  - features:",
      filters.features.map((f) => f.featureName)
    );
  }
  if (filters.eventId) {
    console.log("  - eventId:", filters.eventId);
  }
  if (filters.firstSeen) {
    console.log("  - firstSeen:", filters.firstSeen);
  }
  if (filters.lastSeen) {
    console.log("  - lastSeen:", filters.lastSeen);
  }
  if (filters.seenInEventType) {
    console.log("  - seenInEventType:", filters.seenInEventType);
  }
  if (filters.seenWithEntity) {
    console.log("  - seenWithEntity:", filters.seenWithEntity);
  }
  console.log();
}
