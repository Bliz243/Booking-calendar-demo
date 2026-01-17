import { z } from 'zod';

// Calendar schemas
export const createCalendarSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
		.optional()
		.default('#3b82f6'),
	isDefault: z.boolean().optional().default(false)
});

export const updateCalendarSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	isDefault: z.boolean().optional(),
	isVisible: z.boolean().optional(),
	sortOrder: z.number().int().min(0).optional()
});

// Event schemas
export const createEventSchema = z
	.object({
		calendarId: z.string().uuid(),
		title: z.string().min(1, 'Title is required').max(200),
		description: z.string().max(2000).optional(),
		location: z.string().max(200).optional(),
		startTime: z.coerce.date(),
		endTime: z.coerce.date(),
		isAllDay: z.boolean().optional().default(false),
		timezone: z.string().optional().default('UTC'),
		rrule: z.string().optional()
	})
	.refine((data) => data.endTime > data.startTime, {
		message: 'End time must be after start time',
		path: ['endTime']
	});

export const updateEventSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		description: z.string().max(2000).nullable().optional(),
		location: z.string().max(200).nullable().optional(),
		startTime: z.coerce.date().optional(),
		endTime: z.coerce.date().optional(),
		isAllDay: z.boolean().optional(),
		timezone: z.string().optional(),
		rrule: z.string().nullable().optional(),
		status: z.enum(['confirmed', 'tentative', 'cancelled']).optional()
	})
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

export const recurringUpdateModeSchema = z.enum(['all', 'this', 'future']);

// Query params
export const getEventsQuerySchema = z.object({
	start: z.coerce.date(),
	end: z.coerce.date(),
	calendarIds: z
		.string()
		.nullable()
		.optional()
		.transform((val) => (val && val !== 'null' ? val.split(',') : undefined))
});

// Types from schemas
export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RecurringUpdateMode = z.infer<typeof recurringUpdateModeSchema>;
export type GetEventsQuery = z.infer<typeof getEventsQuerySchema>;
