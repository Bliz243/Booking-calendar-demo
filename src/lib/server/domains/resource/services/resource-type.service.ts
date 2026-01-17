import { resourceTypeRepository } from '../repositories/resource-type.repository';
import { rowToResourceType, type ResourceType } from '$lib/types/resource';

export interface CreateResourceTypeInput {
	name: string;
	color?: string;
}

export interface UpdateResourceTypeInput {
	name?: string;
	color?: string;
}

export type ResourceTypeResult = { resourceType: ResourceType } | { error: string };
export type ResourceTypeDeleteResult = { success: true } | { error: string };

export const resourceTypeService = {
	/**
	 * Get all resource types for a user
	 */
	getAllForUser(userId: string): ResourceType[] {
		const rows = resourceTypeRepository.findAllByUserId(userId);
		return rows.map(rowToResourceType);
	},

	/**
	 * Get a resource type by ID for a user
	 */
	getByIdForUser(id: string, userId: string): ResourceType | null {
		const row = resourceTypeRepository.findByIdAndUserId(id, userId);
		return row ? rowToResourceType(row) : null;
	},

	/**
	 * Create a new resource type
	 */
	create(userId: string, input: CreateResourceTypeInput): ResourceTypeResult {
		const color = input.color || '#6366f1';
		const row = resourceTypeRepository.create(userId, input.name, color);
		return { resourceType: rowToResourceType(row) };
	},

	/**
	 * Update a resource type
	 */
	update(id: string, userId: string, input: UpdateResourceTypeInput): ResourceTypeResult {
		const existing = resourceTypeRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Resource type not found' };
		}

		const row = resourceTypeRepository.update(id, input);
		if (!row) {
			return { error: 'Failed to update resource type' };
		}

		return { resourceType: rowToResourceType(row) };
	},

	/**
	 * Delete a resource type
	 */
	delete(id: string, userId: string): ResourceTypeDeleteResult {
		const existing = resourceTypeRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Resource type not found' };
		}

		// Check if there are resources using this type
		const resourceCount = resourceTypeRepository.countResources(id);
		if (resourceCount > 0) {
			return { error: 'Cannot delete resource type that has resources. Delete resources first.' };
		}

		resourceTypeRepository.delete(id);
		return { success: true };
	}
};
