// Resource Domain
// Handles resource types, resources, qualifications, and availability

export {
	resourceTypeService,
	resourceService,
	qualificationService,
	availabilityService
} from './services';

export {
	resourceTypeRepository,
	resourceRepository,
	qualificationRepository
} from './repositories';

// Types
export type {
	ResourceType,
	Resource,
	ResourceWithType,
	ResourceAvailability,
	ResourceTypeRow,
	ResourceRow,
	ResourceAvailabilityRow,
	Qualification,
	QualificationRow,
	CreateResourceTypeInput,
	UpdateResourceTypeInput,
	ResourceTypeResult,
	ResourceTypeDeleteResult,
	CreateResourceInput,
	UpdateResourceInput,
	ResourceFilters,
	ResourceResult,
	ResourceDeleteResult,
	CreateQualificationInput,
	UpdateQualificationInput,
	QualificationResult,
	QualificationDeleteResult,
	ResourceWithAvailability
} from './types';
