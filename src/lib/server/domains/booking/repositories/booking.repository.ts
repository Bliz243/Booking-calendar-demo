import { queryOne, queryAll, execute, generateId } from '$lib/server/db/client';
import type { ServiceBookingRow, BookingResourceAssignmentRow } from '$lib/types/service';

export interface BookingWithServiceRow extends ServiceBookingRow {
	service_name: string;
	service_color: string;
}

export interface AssignmentWithDetailsRow extends BookingResourceAssignmentRow {
	resource_name: string;
	type_name: string;
	type_color: string;
}

export interface CreateBookingData {
	serviceId: string;
	customerName: string;
	customerEmail: string;
	customerPhone?: string | null;
	customerNotes?: string | null;
	startTime: Date;
	endTime: Date;
	status: string;
	approvalStatus?: string | null;
	createdBy?: string | null;
}

export interface BookingFilters {
	serviceId?: string;
	status?: string;
	approvalStatus?: string;
	startDate?: Date;
	endDate?: Date;
	customerEmail?: string;
}

export const bookingRepository = {
	findById(id: string): ServiceBookingRow | null {
		return queryOne<ServiceBookingRow>(`SELECT * FROM service_bookings WHERE id = ?`, [id]) ?? null;
	},

	/**
	 * Find a booking by its linked calendar event ID
	 */
	findByEventId(eventId: string): ServiceBookingRow | null {
		return (
			queryOne<ServiceBookingRow>(`SELECT * FROM service_bookings WHERE event_id = ?`, [eventId]) ??
			null
		);
	},

	/**
	 * Find a booking by event ID with service details
	 */
	findByEventIdWithService(eventId: string): BookingWithServiceRow | null {
		return (
			queryOne<BookingWithServiceRow>(
				`SELECT sb.*, s.name as service_name, s.color as service_color
			 FROM service_bookings sb
			 JOIN services s ON s.id = sb.service_id
			 WHERE sb.event_id = ?`,
				[eventId]
			) ?? null
		);
	},

	findByIdWithService(id: string): BookingWithServiceRow | null {
		return (
			queryOne<BookingWithServiceRow>(
				`SELECT sb.*, s.name as service_name, s.color as service_color
			 FROM service_bookings sb
			 JOIN services s ON s.id = sb.service_id
			 WHERE sb.id = ?`,
				[id]
			) ?? null
		);
	},

	findByFilters(filters: BookingFilters): BookingWithServiceRow[] {
		let query = `
			SELECT sb.*, s.name as service_name, s.color as service_color
			FROM service_bookings sb
			JOIN services s ON s.id = sb.service_id
			WHERE 1=1
		`;
		const params: unknown[] = [];

		if (filters.serviceId) {
			query += ` AND sb.service_id = ?`;
			params.push(filters.serviceId);
		}
		if (filters.status) {
			query += ` AND sb.status = ?`;
			params.push(filters.status);
		}
		if (filters.approvalStatus) {
			query += ` AND sb.approval_status = ?`;
			params.push(filters.approvalStatus);
		}
		if (filters.startDate) {
			query += ` AND sb.start_time >= ?`;
			params.push(filters.startDate.toISOString());
		}
		if (filters.endDate) {
			query += ` AND sb.end_time <= ?`;
			params.push(filters.endDate.toISOString());
		}
		if (filters.customerEmail) {
			query += ` AND sb.customer_email = ?`;
			params.push(filters.customerEmail);
		}

		query += ` ORDER BY sb.start_time ASC`;

		return queryAll<BookingWithServiceRow>(query, params);
	},

	create(data: CreateBookingData): ServiceBookingRow {
		const id = generateId();
		execute(
			`INSERT INTO service_bookings (
				id, service_id, customer_name, customer_email, customer_phone,
				customer_notes, start_time, end_time, status, approval_status,
				created_by, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
			[
				id,
				data.serviceId,
				data.customerName,
				data.customerEmail,
				data.customerPhone ?? null,
				data.customerNotes ?? null,
				data.startTime.toISOString(),
				data.endTime.toISOString(),
				data.status,
				data.approvalStatus ?? null,
				data.createdBy ?? null
			]
		);
		return this.findById(id)!;
	},

	updateStatus(
		id: string,
		status: string,
		additionalData?: {
			approvalStatus?: string;
			approvedBy?: string;
			cancelledAt?: boolean;
			cancellationReason?: string;
		}
	): ServiceBookingRow | null {
		const updates: string[] = ['status = ?'];
		const params: unknown[] = [status];

		if (additionalData?.approvalStatus !== undefined) {
			updates.push('approval_status = ?');
			params.push(additionalData.approvalStatus);
		}
		if (additionalData?.approvedBy !== undefined) {
			updates.push('approved_by = ?');
			updates.push("approved_at = datetime('now')");
			params.push(additionalData.approvedBy);
		}
		if (additionalData?.cancelledAt) {
			updates.push("cancelled_at = datetime('now')");
		}
		if (additionalData?.cancellationReason !== undefined) {
			updates.push('cancellation_reason = ?');
			params.push(additionalData.cancellationReason);
		}

		params.push(id);
		execute(`UPDATE service_bookings SET ${updates.join(', ')} WHERE id = ?`, params);

		return this.findById(id);
	},

	updateEventId(id: string, eventId: string): void {
		execute(`UPDATE service_bookings SET event_id = ? WHERE id = ?`, [eventId, id]);
	},

	/**
	 * Update booking times (used when rescheduling)
	 */
	updateTimes(id: string, startTime: Date, endTime: Date): ServiceBookingRow | null {
		execute(`UPDATE service_bookings SET start_time = ?, end_time = ? WHERE id = ?`, [
			startTime.toISOString(),
			endTime.toISOString(),
			id
		]);
		return this.findById(id);
	},

	delete(id: string): void {
		execute(`DELETE FROM service_bookings WHERE id = ?`, [id]);
	},

	// Resource assignments
	findAssignments(bookingId: string): AssignmentWithDetailsRow[] {
		return queryAll<AssignmentWithDetailsRow>(
			`SELECT bra.*, r.name as resource_name, rt.name as type_name, rt.color as type_color
			 FROM booking_resource_assignments bra
			 JOIN resources r ON r.id = bra.resource_id
			 JOIN resource_types rt ON rt.id = r.resource_type_id
			 WHERE bra.booking_id = ?`,
			[bookingId]
		);
	},

	findAssignmentsByBookingIds(bookingIds: string[]): AssignmentWithDetailsRow[] {
		if (bookingIds.length === 0) return [];

		const placeholders = bookingIds.map(() => '?').join(',');
		return queryAll<AssignmentWithDetailsRow>(
			`SELECT bra.*, r.name as resource_name, rt.name as type_name, rt.color as type_color
			 FROM booking_resource_assignments bra
			 JOIN resources r ON r.id = bra.resource_id
			 JOIN resource_types rt ON rt.id = r.resource_type_id
			 WHERE bra.booking_id IN (${placeholders})`,
			bookingIds
		);
	},

	createAssignment(bookingId: string, resourceId: string): BookingResourceAssignmentRow {
		const id = generateId();
		execute(
			`INSERT INTO booking_resource_assignments (id, booking_id, resource_id) VALUES (?, ?, ?)`,
			[id, bookingId, resourceId]
		);
		return queryOne<BookingResourceAssignmentRow>(
			`SELECT * FROM booking_resource_assignments WHERE id = ?`,
			[id]
		)!;
	},

	deleteAssignments(bookingId: string): void {
		execute(`DELETE FROM booking_resource_assignments WHERE booking_id = ?`, [bookingId]);
	},

	setAssignments(bookingId: string, resourceIds: string[]): void {
		this.deleteAssignments(bookingId);
		for (const resourceId of resourceIds) {
			this.createAssignment(bookingId, resourceId);
		}
	},

	/**
	 * Get just the resource IDs assigned to a booking (lightweight query)
	 */
	findAssignedResourceIds(bookingId: string): string[] {
		const rows = queryAll<{ resource_id: string }>(
			`SELECT resource_id FROM booking_resource_assignments WHERE booking_id = ?`,
			[bookingId]
		);
		return rows.map((r) => r.resource_id);
	},

	/**
	 * Get booking info for multiple events (for client-side conflict detection).
	 * Returns booking ID and assigned resource IDs for each event that has a linked booking.
	 */
	findBookingInfoByEventIds(
		eventIds: string[]
	): Map<string, { bookingId: string; resourceIds: string[] }> {
		if (eventIds.length === 0) {
			return new Map();
		}

		const placeholders = eventIds.map(() => '?').join(',');
		const rows = queryAll<{ event_id: string; booking_id: string; resource_ids: string | null }>(
			`SELECT
				sb.event_id,
				sb.id as booking_id,
				GROUP_CONCAT(bra.resource_id) as resource_ids
			 FROM service_bookings sb
			 LEFT JOIN booking_resource_assignments bra ON bra.booking_id = sb.id
			 WHERE sb.event_id IN (${placeholders})
			 AND sb.status NOT IN ('cancelled', 'completed', 'no_show')
			 GROUP BY sb.id`,
			eventIds
		);

		const result = new Map<string, { bookingId: string; resourceIds: string[] }>();
		for (const row of rows) {
			result.set(row.event_id, {
				bookingId: row.booking_id,
				resourceIds: row.resource_ids ? row.resource_ids.split(',') : []
			});
		}
		return result;
	},

	/**
	 * Check if any of the given resources have booking conflicts at the specified time.
	 * This is a lightweight check for reschedule operations.
	 * Returns the name of the first conflicting resource, or null if no conflicts.
	 */
	findResourceConflict(
		resourceIds: string[],
		startTime: Date,
		endTime: Date,
		excludeBookingId: string,
		excludeEventId?: string | null
	): { resourceName: string; conflictType: 'booking' | 'event' } | null {
		if (resourceIds.length === 0) {
			return null;
		}

		const placeholders = resourceIds.map(() => '?').join(',');
		const startIso = startTime.toISOString();
		const endIso = endTime.toISOString();

		// Check for booking conflicts
		const bookingConflict = queryOne<{ resource_name: string }>(
			`SELECT r.name as resource_name
			 FROM service_bookings sb
			 JOIN booking_resource_assignments bra ON bra.booking_id = sb.id
			 JOIN resources r ON r.id = bra.resource_id
			 WHERE bra.resource_id IN (${placeholders})
			 AND sb.id != ?
			 AND sb.status NOT IN ('cancelled', 'completed', 'no_show')
			 AND sb.start_time < ?
			 AND sb.end_time > ?
			 LIMIT 1`,
			[...resourceIds, excludeBookingId, endIso, startIso]
		);

		if (bookingConflict) {
			return { resourceName: bookingConflict.resource_name, conflictType: 'booking' };
		}

		// Check for calendar event conflicts (excluding the booking's own event)
		let eventQuery = `
			SELECT r.name as resource_name
			FROM event_resources er
			JOIN events e ON e.id = er.event_id
			JOIN resources r ON r.id = er.resource_id
			WHERE er.resource_id IN (${placeholders})
			AND er.status != 'declined'
			AND e.status != 'cancelled'
			AND e.start_time < ?
			AND e.end_time > ?
		`;
		const eventParams: unknown[] = [...resourceIds, endIso, startIso];

		if (excludeEventId) {
			eventQuery += ` AND e.id != ?`;
			eventParams.push(excludeEventId);
		}

		eventQuery += ` LIMIT 1`;

		const eventConflict = queryOne<{ resource_name: string }>(eventQuery, eventParams);

		if (eventConflict) {
			return { resourceName: eventConflict.resource_name, conflictType: 'event' };
		}

		return null;
	}
};
