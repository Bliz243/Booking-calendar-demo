import { z } from 'zod';

// Time format regex (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Resource type schemas
export const createResourceTypeSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
		.optional()
		.default('#6366f1')
});

export const updateResourceTypeSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional()
});

// Resource schemas
export const createResourceSchema = z.object({
	resourceTypeId: z.string().uuid(),
	name: z.string().min(1, 'Name is required').max(100),
	description: z.string().max(500).optional(),
	capacity: z.number().int().min(1).optional(),
	location: z.string().max(200).optional(),
	attributes: z.record(z.string(), z.unknown()).optional().default({})
});

export const updateResourceSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).nullable().optional(),
	capacity: z.number().int().min(1).nullable().optional(),
	location: z.string().max(200).nullable().optional(),
	attributes: z.record(z.string(), z.unknown()).optional(),
	isActive: z.boolean().optional()
});

// Resource availability schemas
export const createResourceAvailabilitySchema = z
	.object({
		resourceId: z.string().uuid(),
		dayOfWeek: z.number().int().min(0).max(6),
		startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
		endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)')
	})
	.refine((data) => data.endTime > data.startTime, {
		message: 'End time must be after start time',
		path: ['endTime']
	});

// Event resource assignment schemas
export const assignResourceSchema = z.object({
	eventId: z.string().uuid(),
	resourceId: z.string().uuid()
});

export const updateEventResourceSchema = z.object({
	status: z.enum(['pending', 'confirmed', 'declined'])
});

// Query schemas
export const getResourceAvailabilityQuerySchema = z.object({
	resourceId: z.string().uuid(),
	start: z.coerce.date(),
	end: z.coerce.date()
});

export const getResourcesQuerySchema = z.object({
	resourceTypeId: z.string().uuid().optional(),
	isActive: z.coerce.boolean().optional()
});

// Types from schemas
export type CreateResourceTypeInput = z.infer<typeof createResourceTypeSchema>;
export type UpdateResourceTypeInput = z.infer<typeof updateResourceTypeSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateResourceAvailabilityInput = z.infer<typeof createResourceAvailabilitySchema>;
export type AssignResourceInput = z.infer<typeof assignResourceSchema>;
export type UpdateEventResourceInput = z.infer<typeof updateEventResourceSchema>;
export type GetResourceAvailabilityQuery = z.infer<typeof getResourceAvailabilityQuerySchema>;
export type GetResourcesQuery = z.infer<typeof getResourcesQuerySchema>;
