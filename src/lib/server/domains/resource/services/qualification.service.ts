import { qualificationRepository } from '../repositories/qualification.repository';
import { rowToQualification, type Qualification } from '$lib/types/service';

export interface CreateQualificationInput {
	name: string;
	description?: string;
}

export interface UpdateQualificationInput {
	name?: string;
	description?: string;
}

export type QualificationResult = { qualification: Qualification } | { error: string };
export type QualificationDeleteResult = { success: true } | { error: string };

export const qualificationService = {
	/**
	 * Get all qualifications for a user
	 */
	getAllForUser(userId: string): Qualification[] {
		const rows = qualificationRepository.findAllByUserId(userId);
		return rows.map(rowToQualification);
	},

	/**
	 * Get a qualification by ID for a user
	 */
	getByIdForUser(id: string, userId: string): Qualification | null {
		const row = qualificationRepository.findByIdAndUserId(id, userId);
		return row ? rowToQualification(row) : null;
	},

	/**
	 * Create a new qualification
	 */
	create(userId: string, input: CreateQualificationInput): QualificationResult {
		// Check for duplicate name
		const existing = qualificationRepository.findByName(userId, input.name);
		if (existing) {
			return { error: 'Qualification with this name already exists' };
		}

		const row = qualificationRepository.create(userId, input.name, input.description ?? null);
		return { qualification: rowToQualification(row) };
	},

	/**
	 * Update a qualification
	 */
	update(id: string, userId: string, input: UpdateQualificationInput): QualificationResult {
		const existing = qualificationRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Qualification not found' };
		}

		// Check for duplicate name if name is being changed
		if (input.name !== undefined) {
			const duplicate = qualificationRepository.findByNameExcluding(userId, input.name, id);
			if (duplicate) {
				return { error: 'Qualification with this name already exists' };
			}
		}

		const row = qualificationRepository.update(id, {
			name: input.name,
			description: input.description ?? undefined
		});

		if (!row) {
			return { error: 'Failed to update qualification' };
		}

		return { qualification: rowToQualification(row) };
	},

	/**
	 * Delete a qualification
	 */
	delete(id: string, userId: string): QualificationDeleteResult {
		const existing = qualificationRepository.findByIdAndUserId(id, userId);
		if (!existing) {
			return { error: 'Qualification not found' };
		}

		qualificationRepository.delete(id);
		return { success: true };
	}
};
