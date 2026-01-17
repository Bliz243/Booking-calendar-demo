import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { events } from './events';
import { services } from './services';
import { resources, resourceTypes } from './resources';

// Availability Templates
export const availabilityTemplates = sqliteTable('availability_templates', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	timezone: text('timezone').notNull(),
	slotDuration: integer('slot_duration').notNull(),
	bufferBefore: integer('buffer_before').default(0),
	bufferAfter: integer('buffer_after').default(0),
	minNotice: integer('min_notice').default(60),
	maxAdvanceDays: integer('max_advance_days').default(60),
	isActive: integer('is_active', { mode: 'boolean' }).default(true)
});

export const availabilityWindows = sqliteTable('availability_windows', {
	id: text('id').primaryKey(),
	templateId: text('template_id')
		.notNull()
		.references(() => availabilityTemplates.id, { onDelete: 'cascade' }),
	dayOfWeek: integer('day_of_week').notNull(),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).default(true)
});

export const availabilityOverrides = sqliteTable('availability_overrides', {
	id: text('id').primaryKey(),
	templateId: text('template_id')
		.notNull()
		.references(() => availabilityTemplates.id, { onDelete: 'cascade' }),
	date: text('date').notNull(),
	isAvailable: integer('is_available', { mode: 'boolean' }).notNull(),
	startTime: text('start_time'),
	endTime: text('end_time'),
	reason: text('reason')
});

// Legacy bookings (from availability templates)
export const bookings = sqliteTable('bookings', {
	id: text('id').primaryKey(),
	templateId: text('template_id')
		.notNull()
		.references(() => availabilityTemplates.id, { onDelete: 'cascade' }),
	eventId: text('event_id').references(() => events.id, { onDelete: 'set null' }),
	bookerName: text('booker_name').notNull(),
	bookerEmail: text('booker_email').notNull(),
	bookerPhone: text('booker_phone'),
	bookerNotes: text('booker_notes'),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),
	status: text('status', { enum: ['confirmed', 'cancelled', 'pending'] }).default('confirmed'),
	confirmationToken: text('confirmation_token').unique(),
	createdAt: text('created_at').default('CURRENT_TIMESTAMP')
});

// Service Bookings (enhanced booking system)
export const serviceBookings = sqliteTable('service_bookings', {
	id: text('id').primaryKey(),
	serviceId: text('service_id')
		.notNull()
		.references(() => services.id, { onDelete: 'cascade' }),
	eventId: text('event_id').references(() => events.id, { onDelete: 'set null' }),

	// Customer info
	customerName: text('customer_name').notNull(),
	customerEmail: text('customer_email').notNull(),
	customerPhone: text('customer_phone'),
	customerNotes: text('customer_notes'),

	// Timing
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull(),

	// Status & workflow
	status: text('status', {
		enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
	}).default('pending'),
	approvalStatus: text('approval_status', { enum: ['pending', 'approved', 'rejected'] }),
	approvedBy: text('approved_by'),
	approvedAt: text('approved_at'),

	// Tracking
	createdBy: text('created_by'),
	createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
	cancelledAt: text('cancelled_at'),
	cancellationReason: text('cancellation_reason')
});

// Service Resource Requirements
export const serviceResourceRequirements = sqliteTable('service_resource_requirements', {
	id: text('id').primaryKey(),
	serviceId: text('service_id')
		.notNull()
		.references(() => services.id, { onDelete: 'cascade' }),
	resourceTypeId: text('resource_type_id')
		.notNull()
		.references(() => resourceTypes.id, { onDelete: 'cascade' }),
	quantity: integer('quantity').notNull().default(1),
	isOptional: integer('is_optional', { mode: 'boolean' }).default(false),
	requiredQualifications: text('required_qualifications') // JSON array
});

// Booking Resource Assignments
export const bookingResourceAssignments = sqliteTable(
	'booking_resource_assignments',
	{
		id: text('id').primaryKey(),
		bookingId: text('booking_id')
			.notNull()
			.references(() => serviceBookings.id, { onDelete: 'cascade' }),
		resourceId: text('resource_id')
			.notNull()
			.references(() => resources.id, { onDelete: 'cascade' })
	},
	(table) => [unique().on(table.bookingId, table.resourceId)]
);

// Event Resources
export const eventResources = sqliteTable(
	'event_resources',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		resourceId: text('resource_id')
			.notNull()
			.references(() => resources.id, { onDelete: 'cascade' }),
		status: text('status', { enum: ['confirmed', 'tentative', 'declined'] }).default('confirmed')
	},
	(table) => [unique().on(table.eventId, table.resourceId)]
);

export type AvailabilityTemplate = typeof availabilityTemplates.$inferSelect;
export type NewAvailabilityTemplate = typeof availabilityTemplates.$inferInsert;
export type AvailabilityWindow = typeof availabilityWindows.$inferSelect;
export type NewAvailabilityWindow = typeof availabilityWindows.$inferInsert;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type NewAvailabilityOverride = typeof availabilityOverrides.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type ServiceBooking = typeof serviceBookings.$inferSelect;
export type NewServiceBooking = typeof serviceBookings.$inferInsert;
export type ServiceResourceRequirement = typeof serviceResourceRequirements.$inferSelect;
export type NewServiceResourceRequirement = typeof serviceResourceRequirements.$inferInsert;
export type BookingResourceAssignment = typeof bookingResourceAssignments.$inferSelect;
export type NewBookingResourceAssignment = typeof bookingResourceAssignments.$inferInsert;
export type EventResource = typeof eventResources.$inferSelect;
export type NewEventResource = typeof eventResources.$inferInsert;
