export type ResourceAssignmentStatus = 'pending' | 'confirmed' | 'declined';

export interface ResourceType {
	id: string;
	userId: string;
	name: string;
	color: string;
}

export interface Resource {
	id: string;
	resourceTypeId: string;
	name: string;
	description: string | null;
	capacity: number | null;
	location: string | null;
	attributes: Record<string, unknown>;
	isActive: boolean;
}

export interface ResourceAvailability {
	id: string;
	resourceId: string;
	dayOfWeek: number; // 0 = Sunday, 6 = Saturday
	startTime: string; // HH:mm format
	endTime: string; // HH:mm format
}

export interface EventResource {
	id: string;
	eventId: string;
	resourceId: string;
	status: ResourceAssignmentStatus;
}

// Extended resource with type info
export interface ResourceWithType extends Resource {
	typeName: string;
	typeColor: string;
}

// Database row types
export interface ResourceTypeRow {
	id: string;
	user_id: string;
	name: string;
	color: string;
}

export interface ResourceRow {
	id: string;
	resource_type_id: string;
	name: string;
	description: string | null;
	capacity: number | null;
	location: string | null;
	attributes: string | null;
	is_active: number;
}

export interface ResourceAvailabilityRow {
	id: string;
	resource_id: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
}

export interface EventResourceRow {
	id: string;
	event_id: string;
	resource_id: string;
	status: string;
}

// Conversion helpers
export function rowToResourceType(row: ResourceTypeRow): ResourceType {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		color: row.color
	};
}

export function rowToResource(row: ResourceRow): Resource {
	let attributes: Record<string, unknown> = {};
	if (row.attributes) {
		try {
			attributes = JSON.parse(row.attributes);
		} catch {
			attributes = {};
		}
	}

	return {
		id: row.id,
		resourceTypeId: row.resource_type_id,
		name: row.name,
		description: row.description,
		capacity: row.capacity,
		location: row.location,
		attributes,
		isActive: row.is_active === 1
	};
}

export function rowToResourceAvailability(row: ResourceAvailabilityRow): ResourceAvailability {
	return {
		id: row.id,
		resourceId: row.resource_id,
		dayOfWeek: row.day_of_week,
		startTime: row.start_time,
		endTime: row.end_time
	};
}

export function rowToEventResource(row: EventResourceRow): EventResource {
	return {
		id: row.id,
		eventId: row.event_id,
		resourceId: row.resource_id,
		status: row.status as ResourceAssignmentStatus
	};
}

// Input types
export interface CreateResourceTypeInput {
	name: string;
	color?: string;
}

export interface UpdateResourceTypeInput {
	name?: string;
	color?: string;
}

export interface CreateResourceInput {
	resourceTypeId: string;
	name: string;
	description?: string;
	capacity?: number;
	location?: string;
	attributes?: Record<string, unknown>;
}

export interface UpdateResourceInput {
	name?: string;
	description?: string;
	capacity?: number;
	location?: string;
	attributes?: Record<string, unknown>;
	isActive?: boolean;
}

export interface CreateResourceAvailabilityInput {
	resourceId: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
}

export interface AssignResourceInput {
	eventId: string;
	resourceId: string;
}

// Conflict detection
export interface ResourceConflict {
	resourceId: string;
	resourceName: string;
	conflictingEventId: string;
	conflictingEventTitle: string;
	startTime: Date;
	endTime: Date;
}
