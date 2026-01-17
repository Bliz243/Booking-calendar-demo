// Re-export types from the types directory
export type {
	ResourceType,
	Resource,
	ResourceWithType,
	ResourceAvailability,
	ResourceTypeRow,
	ResourceRow,
	ResourceAvailabilityRow
} from '$lib/types/resource';

export type { Qualification, QualificationRow } from '$lib/types/service';

// Re-export service types
export type {
	CreateResourceTypeInput,
	UpdateResourceTypeInput,
	ResourceTypeResult,
	ResourceTypeDeleteResult
} from './services/resource-type.service';

export type {
	CreateResourceInput,
	UpdateResourceInput,
	ResourceFilters,
	ResourceResult,
	ResourceDeleteResult
} from './services/resource.service';

export type {
	CreateQualificationInput,
	UpdateQualificationInput,
	QualificationResult,
	QualificationDeleteResult
} from './services/qualification.service';

export type { ResourceWithAvailability } from './services/availability.service';
