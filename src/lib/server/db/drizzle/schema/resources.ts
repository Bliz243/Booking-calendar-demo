import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const resourceTypes = sqliteTable('resource_types', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	color: text('color').default('#6366f1')
});

export const resources = sqliteTable('resources', {
	id: text('id').primaryKey(),
	resourceTypeId: text('resource_type_id')
		.notNull()
		.references(() => resourceTypes.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	capacity: integer('capacity'),
	location: text('location'),
	attributes: text('attributes'),
	isActive: integer('is_active', { mode: 'boolean' }).default(true)
});

export const resourceAvailability = sqliteTable('resource_availability', {
	id: text('id').primaryKey(),
	resourceId: text('resource_id')
		.notNull()
		.references(() => resources.id, { onDelete: 'cascade' }),
	dayOfWeek: integer('day_of_week').notNull(),
	startTime: text('start_time').notNull(),
	endTime: text('end_time').notNull()
});

export const qualifications = sqliteTable('qualifications', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description')
});

export const resourceQualifications = sqliteTable(
	'resource_qualifications',
	{
		id: text('id').primaryKey(),
		resourceId: text('resource_id')
			.notNull()
			.references(() => resources.id, { onDelete: 'cascade' }),
		qualificationId: text('qualification_id')
			.notNull()
			.references(() => qualifications.id, { onDelete: 'cascade' })
	},
	(table) => [unique().on(table.resourceId, table.qualificationId)]
);

export type ResourceType = typeof resourceTypes.$inferSelect;
export type NewResourceType = typeof resourceTypes.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type ResourceAvailability = typeof resourceAvailability.$inferSelect;
export type NewResourceAvailability = typeof resourceAvailability.$inferInsert;
export type Qualification = typeof qualifications.$inferSelect;
export type NewQualification = typeof qualifications.$inferInsert;
