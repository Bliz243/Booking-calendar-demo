import { z } from 'zod';

// Time format regex (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Availability template schemas
export const createAvailabilityTemplateSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	timezone: z.string().min(1, 'Timezone is required'),
	slotDuration: z.number().int().min(5).max(480), // 5 min to 8 hours
	bufferBefore: z.number().int().min(0).max(120).optional().default(0),
	bufferAfter: z.number().int().min(0).max(120).optional().default(0),
	minNotice: z.number().int().min(0).max(10080).optional().default(60), // up to 1 week
	maxAdvanceDays: z.number().int().min(1).max(365).optional().default(60)
});

export const updateAvailabilityTemplateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	timezone: z.string().optional(),
	slotDuration: z.number().int().min(5).max(480).optional(),
	bufferBefore: z.number().int().min(0).max(120).optional(),
	bufferAfter: z.number().int().min(0).max(120).optional(),
	minNotice: z.number().int().min(0).max(10080).optional(),
	maxAdvanceDays: z.number().int().min(1).max(365).optional(),
	isActive: z.boolean().optional()
});

// Availability window schemas
export const createAvailabilityWindowSchema = z
	.object({
		templateId: z.string().uuid(),
		dayOfWeek: z.number().int().min(0).max(6),
		startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
		endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)')
	})
	.refine((data) => data.endTime > data.startTime, {
		message: 'End time must be after start time',
		path: ['endTime']
	});

export const updateAvailabilityWindowSchema = z.object({
	startTime: z.string().regex(timeRegex).optional(),
	endTime: z.string().regex(timeRegex).optional(),
	isActive: z.boolean().optional()
});

// Availability override schemas
export const createAvailabilityOverrideSchema = z
	.object({
		templateId: z.string().uuid(),
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
		isAvailable: z.boolean(),
		startTime: z.string().regex(timeRegex).optional(),
		endTime: z.string().regex(timeRegex).optional(),
		reason: z.string().max(200).optional()
	})
	.refine(
		(data) => {
			if (data.isAvailable && (!data.startTime || !data.endTime)) {
				return false;
			}
			return true;
		},
		{
			message: 'Start and end time required when marking as available',
			path: ['startTime']
		}
	)
	.refine(
		(data) => {
			if (data.startTime && data.endTime) {
				return data.endTime > data.startTime;
			}
			return true;
		},
		{
			message: 'End time must be after start time',
			path: ['endTime']
		}
	);

// Booking schemas
export const createBookingSchema = z.object({
	templateId: z.string().uuid(),
	bookerName: z.string().min(1, 'Name is required').max(100),
	bookerEmail: z.string().email('Invalid email'),
	bookerPhone: z
		.string()
		.max(20)
		.optional()
		.transform((val) => val || null),
	bookerNotes: z
		.string()
		.max(500)
		.optional()
		.transform((val) => val || null),
	startTime: z.coerce.date(),
	endTime: z.coerce.date()
});

export const updateBookingSchema = z.object({
	status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional()
});

// Query schemas
export const getAvailabilityQuerySchema = z.object({
	templateId: z.string().uuid(),
	start: z.coerce.date(),
	end: z.coerce.date()
});

export const getBookingsQuerySchema = z.object({
	templateId: z.string().uuid().optional(),
	status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
	start: z.coerce.date().optional(),
	end: z.coerce.date().optional()
});

// Types from schemas
export type CreateAvailabilityTemplateInput = z.infer<typeof createAvailabilityTemplateSchema>;
export type UpdateAvailabilityTemplateInput = z.infer<typeof updateAvailabilityTemplateSchema>;
export type CreateAvailabilityWindowInput = z.infer<typeof createAvailabilityWindowSchema>;
export type UpdateAvailabilityWindowInput = z.infer<typeof updateAvailabilityWindowSchema>;
export type CreateAvailabilityOverrideInput = z.infer<typeof createAvailabilityOverrideSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type GetAvailabilityQuery = z.infer<typeof getAvailabilityQuerySchema>;
export type GetBookingsQuery = z.infer<typeof getBookingsQuerySchema>;
