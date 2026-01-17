import { transaction } from '$lib/server/db/client';
import { serviceRepository } from '../repositories/service.repository';
import {
	rowToService,
	rowToServiceResourceRequirement,
	type Service,
	type ServiceWithRequirements,
	type ServiceResourceRequirementWithType
} from '$lib/types/service';

export interface CreateServiceInput {
	name: string;
	description?: string;
	color?: string;
	priceCents?: number;
	durationMinutes: number;
	minDurationMinutes?: number;
	maxDurationMinutes?: number;
	operatingDays?: number[];
	operatingStartTime?: string;
	operatingEndTime?: string;
	minNoticeHours?: number;
	maxAdvanceDays?: number;
	bufferMinutes?: number;
	maxConcurrentPerCustomer?: number;
	cancellationHours?: number;
	requiresApproval?: boolean;
	capacity?: number;
}

export interface UpdateServiceInput {
	name?: string;
	description?: string;
	color?: string;
	priceCents?: number;
	durationMinutes?: number;
	minDurationMinutes?: number;
	maxDurationMinutes?: number;
	operatingDays?: number[];
	operatingStartTime?: string;
	operatingEndTime?: string;
	minNoticeHours?: number;
	maxAdvanceDays?: number;
	bufferMinutes?: number;
	maxConcurrentPerCustomer?: number;
	cancellationHours?: number;
	requiresApproval?: boolean;
	capacity?: number;
	isActive?: boolean;
	sortOrder?: number;
}

export interface CreateRequirementInput {
	resourceTypeId: string;
	quantity?: number;
	isOptional?: boolean;
	requiredQualifications?: string[];
}

export type ServiceResult = { service: ServiceWithRequirements } | { error: string };
export type ServiceDeleteResult = { success: true } | { error: string };
export type RequirementResult =
	| { requirement: ServiceResourceRequirementWithType }
	| { error: string };

function loadServiceWithRequirements(serviceId: string): ServiceWithRequirements | null {
	const serviceRow = serviceRepository.findById(serviceId);
	if (!serviceRow) return null;

	const requirementRows = serviceRepository.findRequirements(serviceId);

	return {
		...rowToService(serviceRow),
		requirements: requirementRows.map((r) => ({
			...rowToServiceResourceRequirement(r),
			resourceTypeName: r.type_name,
			resourceTypeColor: r.type_color
		}))
	};
}

export const serviceService = {
	/**
	 * Get all services for a user
	 */
	getAllForUser(userId: string): ServiceWithRequirements[] {
		const rows = serviceRepository.findAllByUserId(userId);
		return rows.map((row) => {
			const requirements = serviceRepository.findRequirements(row.id);
			return {
				...rowToService(row),
				requirements: requirements.map((r) => ({
					...rowToServiceResourceRequirement(r),
					resourceTypeName: r.type_name,
					resourceTypeColor: r.type_color
				}))
			};
		});
	},

	/**
	 * Get a service by ID for a user
	 */
	getByIdForUser(id: string, userId: string): ServiceWithRequirements | null {
		const row = serviceRepository.findByIdAndUserId(id, userId);
		if (!row) return null;

		const requirements = serviceRepository.findRequirements(id);
		return {
			...rowToService(row),
			requirements: requirements.map((r) => ({
				...rowToServiceResourceRequirement(r),
				resourceTypeName: r.type_name,
				resourceTypeColor: r.type_color
			}))
		};
	},

	/**
	 * Get a service by ID (no user check - for public endpoints)
	 */
	getById(id: string): ServiceWithRequirements | null {
		return loadServiceWithRequirements(id);
	},

	/**
	 * Get active services for public display
	 */
	getActiveServices(ownerId?: string): Service[] {
		const rows = ownerId
			? serviceRepository.findActiveByOwner(ownerId)
			: serviceRepository.findAllActive();
		return rows.map(rowToService);
	},

	/**
	 * Create a new service
	 */
	create(userId: string, input: CreateServiceInput): ServiceResult {
		const row = serviceRepository.create({
			userId,
			name: input.name,
			description: input.description,
			color: input.color,
			priceCents: input.priceCents,
			durationMinutes: input.durationMinutes,
			minDurationMinutes: input.minDurationMinutes,
			maxDurationMinutes: input.maxDurationMinutes,
			operatingDays: input.operatingDays?.join(','),
			operatingStartTime: input.operatingStartTime,
			operatingEndTime: input.operatingEndTime,
			minNoticeHours: input.minNoticeHours,
			maxAdvanceDays: input.maxAdvanceDays,
			bufferMinutes: input.bufferMinutes,
			maxConcurrentPerCustomer: input.maxConcurrentPerCustomer,
			cancellationHours: input.cancellationHours,
			requiresApproval: input.requiresApproval,
			capacity: input.capacity
		});

		const service = loadServiceWithRequirements(row.id);
		if (!service) {
			return { error: 'Failed to create service' };
		}

		return { service };
	},

	/**
	 * Update a service
	 */
	update(id: string, userId: string, input: UpdateServiceInput): ServiceResult {
		const existing = serviceRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Service not found' };
		}

		serviceRepository.update(id, {
			name: input.name,
			description: input.description,
			color: input.color,
			priceCents: input.priceCents,
			durationMinutes: input.durationMinutes,
			minDurationMinutes: input.minDurationMinutes,
			maxDurationMinutes: input.maxDurationMinutes,
			operatingDays: input.operatingDays?.join(','),
			operatingStartTime: input.operatingStartTime,
			operatingEndTime: input.operatingEndTime,
			minNoticeHours: input.minNoticeHours,
			maxAdvanceDays: input.maxAdvanceDays,
			bufferMinutes: input.bufferMinutes,
			maxConcurrentPerCustomer: input.maxConcurrentPerCustomer,
			cancellationHours: input.cancellationHours,
			requiresApproval: input.requiresApproval,
			capacity: input.capacity,
			isActive: input.isActive,
			sortOrder: input.sortOrder
		});

		const service = loadServiceWithRequirements(id);
		if (!service) {
			return { error: 'Failed to update service' };
		}

		return { service };
	},

	/**
	 * Delete a service
	 */
	delete(id: string, userId: string): ServiceDeleteResult {
		const existing = serviceRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Service not found' };
		}

		// Check for active bookings
		const activeBookings = serviceRepository.countActiveBookings(id);
		if (activeBookings > 0) {
			return {
				error: 'Cannot delete service with active bookings. Cancel or complete them first.'
			};
		}

		transaction(() => {
			serviceRepository.deleteAllRequirements(id);
			serviceRepository.delete(id);
		});

		return { success: true };
	},

	// Requirements management
	/**
	 * Get requirements for a service
	 */
	getRequirements(serviceId: string, userId: string): ServiceResourceRequirementWithType[] {
		const service = serviceRepository.findByIdAndUserId(serviceId, userId);
		if (!service) return [];

		const rows = serviceRepository.findRequirements(serviceId);
		return rows.map((r) => ({
			...rowToServiceResourceRequirement(r),
			resourceTypeName: r.type_name,
			resourceTypeColor: r.type_color
		}));
	},

	/**
	 * Add a requirement to a service
	 */
	addRequirement(
		serviceId: string,
		userId: string,
		input: CreateRequirementInput,
		resourceTypeName: string,
		resourceTypeColor: string
	): RequirementResult {
		const service = serviceRepository.findByIdAndUserId(serviceId, userId);
		if (!service) {
			return { error: 'Service not found' };
		}

		// Check for duplicate
		const existing = serviceRepository.findRequirementByServiceAndType(
			serviceId,
			input.resourceTypeId
		);
		if (existing) {
			return { error: 'Resource type already added to this service' };
		}

		const row = serviceRepository.createRequirement(
			serviceId,
			input.resourceTypeId,
			input.quantity ?? 1,
			input.isOptional ?? false,
			input.requiredQualifications ?? []
		);

		return {
			requirement: {
				...rowToServiceResourceRequirement(row),
				resourceTypeName,
				resourceTypeColor
			}
		};
	},

	/**
	 * Update a requirement
	 */
	updateRequirement(
		requirementId: string,
		serviceId: string,
		userId: string,
		input: { quantity?: number; isOptional?: boolean; requiredQualifications?: string[] }
	): RequirementResult {
		const service = serviceRepository.findByIdAndUserId(serviceId, userId);
		if (!service) {
			return { error: 'Service not found' };
		}

		const row = serviceRepository.updateRequirement(requirementId, input);
		if (!row) {
			return { error: 'Requirement not found' };
		}

		// Get full details
		const requirements = serviceRepository.findRequirements(serviceId);
		const fullRow = requirements.find((r) => r.id === requirementId);
		if (!fullRow) {
			return { error: 'Requirement not found' };
		}

		return {
			requirement: {
				...rowToServiceResourceRequirement(fullRow),
				resourceTypeName: fullRow.type_name,
				resourceTypeColor: fullRow.type_color
			}
		};
	},

	/**
	 * Delete a requirement
	 */
	deleteRequirement(requirementId: string, serviceId: string, userId: string): ServiceDeleteResult {
		const service = serviceRepository.findByIdAndUserId(serviceId, userId);
		if (!service) {
			return { error: 'Service not found' };
		}

		serviceRepository.deleteRequirement(requirementId);
		return { success: true };
	},

	/**
	 * Delete all requirements for a service
	 */
	deleteAllRequirements(serviceId: string, userId: string): ServiceDeleteResult {
		const service = serviceRepository.findByIdAndUserId(serviceId, userId);
		if (!service) {
			return { error: 'Service not found' };
		}

		serviceRepository.deleteAllRequirements(serviceId);
		return { success: true };
	}
};
