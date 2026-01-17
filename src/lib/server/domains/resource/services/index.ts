export { resourceTypeService } from './resource-type.service';
export type {
	CreateResourceTypeInput,
	UpdateResourceTypeInput,
	ResourceTypeResult,
	ResourceTypeDeleteResult
} from './resource-type.service';

export { resourceService } from './resource.service';
export type {
	CreateResourceInput,
	UpdateResourceInput,
	ResourceFilters,
	ResourceResult,
	ResourceDeleteResult
} from './resource.service';

export { qualificationService } from './qualification.service';
export type {
	CreateQualificationInput,
	UpdateQualificationInput,
	QualificationResult,
	QualificationDeleteResult
} from './qualification.service';

export { availabilityService } from './availability.service';
export type { ResourceWithAvailability } from './availability.service';
