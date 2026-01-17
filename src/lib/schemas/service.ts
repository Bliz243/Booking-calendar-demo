import { z } from 'zod';

// Time format regex (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Color format regex (#RRGGBB)
const colorRegex = /^#[0-9A-Fa-f]{6}$/;

// Qualification schemas
export const createQualificationSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	description: z.string().max(500).optional()
});

export const updateQualificationSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).nullable().optional()
});

// Resource qualification schemas
export const addResourceQualificationSchema = z.object({
	resourceId: z.string().uuid(),
	qualificationId: z.string().uuid()
});

// Service resource requirement schema (nested)
export const serviceResourceRequirementSchema = z.object({
	resourceTypeId: z.string().uuid(),
	quantity: z.number().int().min(1).default(1),
	isOptional: z.boolean().default(false),
	requiredQualifications: z.array(z.string().uuid()).default([])
});

// Service schemas
export const createServiceSchema = z
	.object({
		name: z.string().min(1, 'Name is required').max(100),
		description: z.string().max(500).optional(),
		color: z.string().regex(colorRegex, 'Invalid color format').optional().default('#3b82f6'),
		priceCents: z.number().int().min(0).optional(),

		// Duration
		durationMinutes: z.number().int().min(5, 'Minimum duration is 5 minutes').max(480),
		minDurationMinutes: z.number().int().min(5).optional(),
		maxDurationMinutes: z.number().int().max(480).optional(),

		// Time constraints
		operatingDays: z
			.array(z.number().int().min(0).max(6))
			.min(1, 'At least one operating day required')
			.default([1, 2, 3, 4, 5]),
		operatingStartTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)').default('09:00'),
		operatingEndTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)').default('17:00'),
		minNoticeHours: z.number().int().min(0).max(720).default(24),
		maxAdvanceDays: z.number().int().min(1).max(365).default(30),

		// Booking rules
		bufferMinutes: z.number().int().min(0).max(120).default(0),
		maxConcurrentPerCustomer: z.number().int().min(0).default(0), // 0 = unlimited
		cancellationHours: z.number().int().min(0).default(4),
		requiresApproval: z.boolean().default(false),
		capacity: z.number().int().min(1).default(1),

		// Resource requirements
		resourceRequirements: z.array(serviceResourceRequirementSchema).optional()
	})
	.refine((data) => data.operatingEndTime > data.operatingStartTime, {
		message: 'End time must be after start time',
		path: ['operatingEndTime']
	})
	.refine(
		(data) => {
			if (data.minDurationMinutes && data.maxDurationMinutes) {
				return data.maxDurationMinutes >= data.minDurationMinutes;
			}
			return true;
		},
		{
			message: 'Max duration must be greater than or equal to min duration',
			path: ['maxDurationMinutes']
		}
	)
	.refine(
		(data) => {
			if (data.minDurationMinutes) {
				return data.durationMinutes >= data.minDurationMinutes;
			}
			return true;
		},
		{
			message: 'Default duration must be greater than or equal to min duration',
			path: ['durationMinutes']
		}
	)
	.refine(
		(data) => {
			if (data.maxDurationMinutes) {
				return data.durationMinutes <= data.maxDurationMinutes;
			}
			return true;
		},
		{
			message: 'Default duration must be less than or equal to max duration',
			path: ['durationMinutes']
		}
	);

export const updateServiceSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		description: z.string().max(500).nullable().optional(),
		color: z.string().regex(colorRegex).optional(),
		priceCents: z.number().int().min(0).nullable().optional(),

		durationMinutes: z.number().int().min(5).max(480).optional(),
		minDurationMinutes: z.number().int().min(5).nullable().optional(),
		maxDurationMinutes: z.number().int().max(480).nullable().optional(),

		operatingDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
		operatingStartTime: z.string().regex(timeRegex).optional(),
		operatingEndTime: z.string().regex(timeRegex).optional(),
		minNoticeHours: z.number().int().min(0).max(720).optional(),
		maxAdvanceDays: z.number().int().min(1).max(365).optional(),

		bufferMinutes: z.number().int().min(0).max(120).optional(),
		maxConcurrentPerCustomer: z.number().int().min(0).optional(),
		cancellationHours: z.number().int().min(0).optional(),
		requiresApproval: z.boolean().optional(),
		capacity: z.number().int().min(1).optional(),

		isActive: z.boolean().optional(),
		sortOrder: z.number().int().min(0).optional()
	})
	.refine(
		(data) => {
			if (data.operatingStartTime && data.operatingEndTime) {
				return data.operatingEndTime > data.operatingStartTime;
			}
			return true;
		},
		{
			message: 'End time must be after start time',
			path: ['operatingEndTime']
		}
	);

// Service resource requirement CRUD schemas
export const createServiceResourceRequirementSchema = z.object({
	serviceId: z.string().uuid(),
	resourceTypeId: z.string().uuid(),
	quantity: z.number().int().min(1).default(1),
	isOptional: z.boolean().default(false),
	requiredQualifications: z.array(z.string().uuid()).default([])
});

export const updateServiceResourceRequirementSchema = z.object({
	quantity: z.number().int().min(1).optional(),
	isOptional: z.boolean().optional(),
	requiredQualifications: z.array(z.string().uuid()).optional()
});

// Service booking schemas
export const createServiceBookingSchema = z.object({
	serviceId: z.string().uuid(),
	startTime: z.string().datetime({ message: 'Invalid datetime format' }),
	endTime: z.string().datetime().optional(),
	customerName: z.string().min(1, 'Name is required').max(100),
	customerEmail: z.string().email('Invalid email address'),
	customerPhone: z.string().max(20).optional(),
	customerNotes: z.string().max(500).optional(),
	resourceSelections: z
		.array(
			z.object({
				resourceTypeId: z.string().uuid(),
				resourceId: z.string().uuid()
			})
		)
		.optional()
});

export const updateServiceBookingSchema = z.object({
	status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
	customerName: z.string().min(1).max(100).optional(),
	customerEmail: z.string().email().optional(),
	customerPhone: z.string().max(20).nullable().optional(),
	customerNotes: z.string().max(500).nullable().optional()
});

// Staff booking schema (allows overrides)
export const createStaffBookingSchema = createServiceBookingSchema.extend({
	overrideMinNotice: z.boolean().default(false),
	overrideOperatingHours: z.boolean().default(false),
	assignedResourceIds: z.array(z.string().uuid()).optional()
});

// Booking action schemas
export const approveBookingSchema = z.object({
	bookingId: z.string().uuid()
});

export const rejectBookingSchema = z.object({
	bookingId: z.string().uuid(),
	reason: z.string().max(500).optional()
});

export const cancelBookingSchema = z.object({
	bookingId: z.string().uuid(),
	reason: z.string().max(500).optional()
});

// Query schemas
export const getServicesQuerySchema = z.object({
	isActive: z.coerce.boolean().optional()
});

export const getAvailableSlotsQuerySchema = z
	.object({
		serviceId: z.string().uuid(),
		start: z.coerce.date(),
		end: z.coerce.date()
	})
	.refine((data) => data.end > data.start, {
		message: 'End date must be after start date',
		path: ['end']
	});

export const getServiceBookingsQuerySchema = z.object({
	serviceId: z.string().uuid().optional(),
	status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
	approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	customerEmail: z.string().email().optional()
});

// Types from schemas
export type CreateQualificationInput = z.infer<typeof createQualificationSchema>;
export type UpdateQualificationInput = z.infer<typeof updateQualificationSchema>;
export type AddResourceQualificationInput = z.infer<typeof addResourceQualificationSchema>;
export type ServiceResourceRequirementInput = z.infer<typeof serviceResourceRequirementSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateServiceResourceRequirementInput = z.infer<
	typeof createServiceResourceRequirementSchema
>;
export type UpdateServiceResourceRequirementInput = z.infer<
	typeof updateServiceResourceRequirementSchema
>;
export type CreateServiceBookingInput = z.infer<typeof createServiceBookingSchema>;
export type UpdateServiceBookingInput = z.infer<typeof updateServiceBookingSchema>;
export type CreateStaffBookingInput = z.infer<typeof createStaffBookingSchema>;
export type ApproveBookingInput = z.infer<typeof approveBookingSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type GetServicesQuery = z.infer<typeof getServicesQuerySchema>;
export type GetAvailableSlotsQuery = z.infer<typeof getAvailableSlotsQuerySchema>;
export type GetServiceBookingsQuery = z.infer<typeof getServiceBookingsQuerySchema>;
