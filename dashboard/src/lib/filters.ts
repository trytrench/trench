import { type z } from "zod";
import {
  type entityFiltersZod,
  type eventFiltersZod,
} from "../shared/validation";

// Assuming TypeName and jsonFilterZod are properly defined elsewhere

type EventFilters = z.infer<typeof eventFiltersZod>;
type EntityFilters = z.infer<typeof entityFiltersZod>;

export function encodeEventFilters(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.dateRange) {
    if (filters.dateRange.from)
      params.append("from", filters.dateRange.from.toISOString());
    if (filters.dateRange.to)
      params.append("to", filters.dateRange.to.toISOString());
  }
  if (filters.eventType) {
    params.append("eventType", filters.eventType);
  }
  if (filters.features) {
    params.append("features", JSON.stringify(filters.features));
  }
  if (filters.entities) {
    params.append("entities", JSON.stringify(filters.entities));
  }
  return params;
}

export function decodeEventFilters(search: URLSearchParams): EventFilters {
  const filters: Partial<EventFilters> = {};
  if (search.has("from")) {
    filters.dateRange = { from: new Date(search.get("from")!) };
  }
  if (search.has("to")) {
    filters.dateRange = {
      ...filters.dateRange,
      to: new Date(search.get("to")!),
    };
  }
  if (search.has("filterEventType")) {
    filters.eventType = search.get("filterEventType")!;
  }
  if (search.has("features")) {
    filters.features = JSON.parse(search.get("features")!);
  }
  if (search.has("entities")) {
    filters.entities = JSON.parse(search.get("entities")!);
  }
  return filters as EventFilters;
}

export function encodeEntityFilters(filters: EntityFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.firstSeen) {
    if (filters.firstSeen.from)
      params.append("firstSeenFrom", filters.firstSeen.from.toISOString());
    if (filters.firstSeen.to)
      params.append("firstSeenTo", filters.firstSeen.to.toISOString());
  }
  if (filters.lastSeen) {
    if (filters.lastSeen.from)
      params.append("lastSeenFrom", filters.lastSeen.from.toISOString());
    if (filters.lastSeen.to)
      params.append("lastSeenTo", filters.lastSeen.to.toISOString());
  }
  if (filters.entityType) {
    params.append("filterEntityType", filters.entityType);
  }
  if (filters.entityId) {
    params.append("filterEntityId", filters.entityId);
  }
  if (filters.features) {
    params.append("features", JSON.stringify(filters.features));
  }
  if (filters.eventId) {
    params.append("filterEventId", filters.eventId);
  }
  if (filters.seenWithEntity) {
    params.append("seenWithEntity", JSON.stringify(filters.seenWithEntity));
  }
  if (filters.seenInEventType) {
    params.append("seenInEventType", filters.seenInEventType);
  }
  // Additional properties can be added here in a similar manner
  return params;
}

export function decodeEntityFilters(search: URLSearchParams): EntityFilters {
  const filters: Partial<EntityFilters> = {};
  if (search.has("firstSeenFrom")) {
    filters.firstSeen = { from: new Date(search.get("firstSeenFrom")!) };
  }
  if (search.has("firstSeenTo")) {
    filters.firstSeen = {
      ...filters.firstSeen,
      to: new Date(search.get("firstSeenTo")!),
    };
  }
  if (search.has("lastSeenFrom")) {
    filters.lastSeen = { from: new Date(search.get("lastSeenFrom")!) };
  }
  if (search.has("lastSeenTo")) {
    filters.lastSeen = {
      ...filters.lastSeen,
      to: new Date(search.get("lastSeenTo")!),
    };
  }
  if (search.has("filterEntityType")) {
    filters.entityType = search.get("filterEntityType")!;
  }
  if (search.has("filterEntityId")) {
    filters.entityId = search.get("filterEntityId")!;
  }
  if (search.has("features")) {
    filters.features = JSON.parse(search.get("features")!);
  }
  if (search.has("filterEventId")) {
    filters.eventId = search.get("filterEventId")!;
  }
  if (search.has("seenWithEntity")) {
    filters.seenWithEntity = JSON.parse(search.get("seenWithEntity")!);
  }
  if (search.has("seenInEventType")) {
    filters.seenInEventType = search.get("seenInEventType")!;
  }
  // Additional properties can be similarly decoded here
  return filters as EntityFilters;
}
