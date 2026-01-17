import { eq, and, inArray, or } from 'drizzle-orm';
import { db, generateId } from '../db/drizzle';
import { calendars, type Calendar, type NewCalendar } from '../db/drizzle/schema/calendars';

export const calendarRepository = {
	/**
	 * Find all calendars for a user (including system calendars)
	 */
	findByUserId(userId: string): Calendar[] {
		return db
			.select()
			.from(calendars)
			.where(or(eq(calendars.userId, userId), eq(calendars.isSystem, true)))
			.all();
	},

	/**
	 * Find only personal calendars for a user (excluding system)
	 */
	findPersonalByUserId(userId: string): Calendar[] {
		return db
			.select()
			.from(calendars)
			.where(and(eq(calendars.userId, userId), eq(calendars.isSystem, false)))
			.all();
	},

	/**
	 * Find all system calendars
	 */
	findSystemCalendars(): Calendar[] {
		return db.select().from(calendars).where(eq(calendars.isSystem, true)).all();
	},

	/**
	 * Find calendars by IDs for a specific user
	 */
	findByIdsAndUserId(ids: string[], userId: string): Calendar[] {
		if (ids.length === 0) return [];
		return db
			.select()
			.from(calendars)
			.where(and(inArray(calendars.id, ids), eq(calendars.userId, userId)))
			.all();
	},

	/**
	 * Find a single calendar by ID and user
	 */
	findByIdAndUserId(id: string, userId: string): Calendar | undefined {
		return db
			.select()
			.from(calendars)
			.where(and(eq(calendars.id, id), eq(calendars.userId, userId)))
			.get();
	},

	/**
	 * Find the default calendar for a user
	 */
	findDefaultByUserId(userId: string): Calendar | undefined {
		return db
			.select()
			.from(calendars)
			.where(and(eq(calendars.userId, userId), eq(calendars.isDefault, true)))
			.get();
	},

	/**
	 * Create a new calendar
	 */
	create(data: Omit<NewCalendar, 'id'>): Calendar {
		const id = generateId();
		const calendar: NewCalendar = { id, ...data };
		db.insert(calendars).values(calendar).run();
		return db.select().from(calendars).where(eq(calendars.id, id)).get()!;
	},

	/**
	 * Update a calendar
	 */
	update(
		id: string,
		userId: string,
		data: Partial<Omit<NewCalendar, 'id' | 'userId'>>
	): Calendar | undefined {
		const existing = this.findByIdAndUserId(id, userId);
		if (!existing) return undefined;

		if (Object.keys(data).length > 0) {
			db.update(calendars).set(data).where(eq(calendars.id, id)).run();
		}

		return this.findByIdAndUserId(id, userId);
	},

	/**
	 * Unset default for all user calendars
	 */
	unsetDefaultForUser(userId: string): void {
		db.update(calendars).set({ isDefault: false }).where(eq(calendars.userId, userId)).run();
	},

	/**
	 * Delete a calendar
	 */
	delete(id: string, userId: string): boolean {
		const existing = this.findByIdAndUserId(id, userId);
		if (!existing) return false;

		db.delete(calendars).where(eq(calendars.id, id)).run();
		return true;
	},

	/**
	 * Find a calendar by ID (without user check - for system calendars)
	 */
	findById(id: string): Calendar | undefined {
		return db.select().from(calendars).where(eq(calendars.id, id)).get();
	},

	/**
	 * Get or create the system bookings calendar
	 * This calendar is visible to all staff/admin users
	 */
	ensureSystemBookingsCalendar(): Calendar {
		const BOOKINGS_CALENDAR_ID = 'system-bookings-calendar';

		let calendar = this.findById(BOOKINGS_CALENDAR_ID);

		if (!calendar) {
			const newCalendar: NewCalendar = {
				id: BOOKINGS_CALENDAR_ID,
				userId: 'system',
				name: 'Bookings',
				color: '#10b981',
				isDefault: false,
				isVisible: true,
				isSystem: true,
				sortOrder: 0
			};
			db.insert(calendars).values(newCalendar).run();
			calendar = this.findById(BOOKINGS_CALENDAR_ID)!;
		}

		return calendar;
	}
};
