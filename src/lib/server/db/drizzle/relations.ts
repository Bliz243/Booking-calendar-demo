import { relations } from 'drizzle-orm';
import { users, sessions, accounts } from './schema/users';
import { calendars } from './schema/calendars';
import { events, eventExceptions } from './schema/events';
import { services } from './schema/services';
import {
	resourceTypes,
	resources,
	resourceAvailability,
	qualifications,
	resourceQualifications
} from './schema/resources';
import {
	availabilityTemplates,
	availabilityWindows,
	availabilityOverrides,
	bookings,
	serviceBookings,
	serviceResourceRequirements,
	bookingResourceAssignments,
	eventResources
} from './schema/bookings';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
	calendars: many(calendars),
	sessions: many(sessions),
	accounts: many(accounts),
	services: many(services),
	resourceTypes: many(resourceTypes),
	qualifications: many(qualifications),
	availabilityTemplates: many(availabilityTemplates)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	})
}));

// Calendar relations
export const calendarsRelations = relations(calendars, ({ one, many }) => ({
	user: one(users, {
		fields: [calendars.userId],
		references: [users.id]
	}),
	events: many(events)
}));

// Event relations
export const eventsRelations = relations(events, ({ one, many }) => ({
	calendar: one(calendars, {
		fields: [events.calendarId],
		references: [calendars.id]
	}),
	exceptions: many(eventExceptions),
	resources: many(eventResources),
	bookings: many(bookings),
	serviceBookings: many(serviceBookings)
}));

export const eventExceptionsRelations = relations(eventExceptions, ({ one }) => ({
	event: one(events, {
		fields: [eventExceptions.eventId],
		references: [events.id]
	})
}));

// Service relations
export const servicesRelations = relations(services, ({ one, many }) => ({
	user: one(users, {
		fields: [services.userId],
		references: [users.id]
	}),
	resourceRequirements: many(serviceResourceRequirements),
	bookings: many(serviceBookings)
}));

// Resource relations
export const resourceTypesRelations = relations(resourceTypes, ({ one, many }) => ({
	user: one(users, {
		fields: [resourceTypes.userId],
		references: [users.id]
	}),
	resources: many(resources),
	serviceRequirements: many(serviceResourceRequirements)
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
	resourceType: one(resourceTypes, {
		fields: [resources.resourceTypeId],
		references: [resourceTypes.id]
	}),
	availability: many(resourceAvailability),
	qualifications: many(resourceQualifications),
	eventResources: many(eventResources),
	bookingAssignments: many(bookingResourceAssignments)
}));

export const resourceAvailabilityRelations = relations(resourceAvailability, ({ one }) => ({
	resource: one(resources, {
		fields: [resourceAvailability.resourceId],
		references: [resources.id]
	})
}));

export const qualificationsRelations = relations(qualifications, ({ one, many }) => ({
	user: one(users, {
		fields: [qualifications.userId],
		references: [users.id]
	}),
	resourceQualifications: many(resourceQualifications)
}));

export const resourceQualificationsRelations = relations(resourceQualifications, ({ one }) => ({
	resource: one(resources, {
		fields: [resourceQualifications.resourceId],
		references: [resources.id]
	}),
	qualification: one(qualifications, {
		fields: [resourceQualifications.qualificationId],
		references: [qualifications.id]
	})
}));

// Availability template relations
export const availabilityTemplatesRelations = relations(availabilityTemplates, ({ one, many }) => ({
	user: one(users, {
		fields: [availabilityTemplates.userId],
		references: [users.id]
	}),
	windows: many(availabilityWindows),
	overrides: many(availabilityOverrides),
	bookings: many(bookings)
}));

export const availabilityWindowsRelations = relations(availabilityWindows, ({ one }) => ({
	template: one(availabilityTemplates, {
		fields: [availabilityWindows.templateId],
		references: [availabilityTemplates.id]
	})
}));

export const availabilityOverridesRelations = relations(availabilityOverrides, ({ one }) => ({
	template: one(availabilityTemplates, {
		fields: [availabilityOverrides.templateId],
		references: [availabilityTemplates.id]
	})
}));

// Booking relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
	template: one(availabilityTemplates, {
		fields: [bookings.templateId],
		references: [availabilityTemplates.id]
	}),
	event: one(events, {
		fields: [bookings.eventId],
		references: [events.id]
	})
}));

export const serviceBookingsRelations = relations(serviceBookings, ({ one, many }) => ({
	service: one(services, {
		fields: [serviceBookings.serviceId],
		references: [services.id]
	}),
	event: one(events, {
		fields: [serviceBookings.eventId],
		references: [events.id]
	}),
	resourceAssignments: many(bookingResourceAssignments)
}));

export const serviceResourceRequirementsRelations = relations(
	serviceResourceRequirements,
	({ one }) => ({
		service: one(services, {
			fields: [serviceResourceRequirements.serviceId],
			references: [services.id]
		}),
		resourceType: one(resourceTypes, {
			fields: [serviceResourceRequirements.resourceTypeId],
			references: [resourceTypes.id]
		})
	})
);

export const bookingResourceAssignmentsRelations = relations(
	bookingResourceAssignments,
	({ one }) => ({
		booking: one(serviceBookings, {
			fields: [bookingResourceAssignments.bookingId],
			references: [serviceBookings.id]
		}),
		resource: one(resources, {
			fields: [bookingResourceAssignments.resourceId],
			references: [resources.id]
		})
	})
);

export const eventResourcesRelations = relations(eventResources, ({ one }) => ({
	event: one(events, {
		fields: [eventResources.eventId],
		references: [events.id]
	}),
	resource: one(resources, {
		fields: [eventResources.resourceId],
		references: [resources.id]
	})
}));
