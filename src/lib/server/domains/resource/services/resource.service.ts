import { resourceRepository, type ResourceWithTypeRow } from '../repositories/resource.repository';
import { resourceTypeRepository } from '../repositories/resource-type.repository';
import {
	rowToResource,
	type Resource,
	type ResourceWithType,
	type ResourceAvailability,
	rowToResourceAvailability
} from '$lib/types/resource';

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

export interface ResourceFilters {
	resourceTypeId?: string;
	isActive?: boolean;
}

export type ResourceResult = { resource: ResourceWithType } | { error: string };
export type ResourceDeleteResult = { success: true } | { error: string };

function rowToResourceWithType(row: ResourceWithTypeRow): ResourceWithType {
	return {
		...rowToResource(row),
		typeName: row.type_name,
		typeColor: row.type_color
	};
}

export const resourceService = {
	/**
	 * Get all resources for a user
	 */
	getAllForUser(userId: string, filters?: ResourceFilters): ResourceWithType[] {
		const rows = resourceRepository.findByFilters(userId, filters || {});
		return rows.map(rowToResourceWithType);
	},

	/**
	 * Get a resource by ID
	 */
	getById(id: string): ResourceWithType | null {
		const row = resourceRepository.findByIdWithType(id);
		return row ? rowToResourceWithType(row) : null;
	},

	/**
	 * Get a resource by ID for a specific user (verifies ownership via resource type)
	 */
	getByIdForUser(id: string, userId: string): ResourceWithType | null {
		const row = resourceRepository.findByIdWithType(id);
		if (!row) return null;

		// Verify the resource type belongs to this user
		const resourceType = resourceTypeRepository.findByIdAndUserId(row.resource_type_id, userId);
		if (!resourceType) return null;

		return rowToResourceWithType(row);
	},

	/**
	 * Create a new resource
	 */
	create(userId: string, input: CreateResourceInput): ResourceResult {
		// Verify resource type exists and belongs to user
		const resourceType = resourceTypeRepository.findByIdAndUserId(input.resourceTypeId, userId);
		if (!resourceType) {
			return { error: 'Resource type not found' };
		}

		const row = resourceRepository.create(input);
		const withType = resourceRepository.findByIdWithType(row.id);

		if (!withType) {
			return { error: 'Failed to create resource' };
		}

		return { resource: rowToResourceWithType(withType) };
	},

	/**
	 * Update a resource
	 */
	update(id: string, userId: string, input: UpdateResourceInput): ResourceResult {
		const existing = this.getByIdForUser(id, userId);
		if (!existing) {
			return { error: 'Resource not found' };
		}

		resourceRepository.update(id, input);
		const updated = resourceRepository.findByIdWithType(id);

		if (!updated) {
			return { error: 'Failed to update resource' };
		}

		return { resource: rowToResourceWithType(updated) };
	},

	/**
	 * Delete a resource
	 */
	delete(id: string, userId: string): ResourceDeleteResult {
		const existing = this.getByIdForUser(id, userId);
		if (!existing) {
			return { error: 'Resource not found' };
		}

		// Delete availability first
		resourceRepository.deleteAllAvailability(id);

		// Delete the resource
		resourceRepository.delete(id);

		return { success: true };
	},

	/**
	 * Get availability windows for a resource
	 */
	getAvailability(resourceId: string): ResourceAvailability[] {
		const rows = resourceRepository.findAvailability(resourceId);
		return rows.map(rowToResourceAvailability);
	},

	/**
	 * Set availability windows for a resource (replaces existing)
	 */
	setAvailability(
		resourceId: string,
		userId: string,
		windows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
	): ResourceAvailability[] {
		// Verify ownership
		const resource = this.getByIdForUser(resourceId, userId);
		if (!resource) {
			return [];
		}

		// Clear existing availability
		resourceRepository.deleteAllAvailability(resourceId);

		// Add new windows
		for (const window of windows) {
			resourceRepository.createAvailability(
				resourceId,
				window.dayOfWeek,
				window.startTime,
				window.endTime
			);
		}

		return this.getAvailability(resourceId);
	},

	/**
	 * Get qualifications for a resource
	 */
	getQualifications(resourceId: string): string[] {
		return resourceRepository.findQualifications(resourceId);
	},

	/**
	 * Set qualifications for a resource
	 */
	setQualifications(resourceId: string, userId: string, qualificationIds: string[]): void {
		// Verify ownership
		const resource = this.getByIdForUser(resourceId, userId);
		if (!resource) return;

		resourceRepository.setQualifications(resourceId, qualificationIds);
	}
};
