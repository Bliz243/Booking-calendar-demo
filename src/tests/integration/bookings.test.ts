import { describe, it, expect } from 'vitest';
import { getTestDb } from '../setup';
import {
	createUser,
	createService,
	createServiceBooking,
	createCalendar,
	createEvent,
	createResourceType,
	createResource
} from '../fixtures';

describe('Service Bookings', () => {
	describe('CRUD operations', () => {
		it('should create a booking', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });

			const booking = createServiceBooking({
				serviceId: service.id,
				customerEmail: 'customer@example.com',
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			expect(booking.id).toBeDefined();
			expect(booking.customerEmail).toBe('customer@example.com');
			expect(booking.status).toBe('pending');
		});

		it('should read a booking by id', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			const found = db.prepare('SELECT * FROM service_bookings WHERE id = ?').get(booking.id) as {
				id: string;
			};

			expect(found).toBeDefined();
			expect(found.id).toBe(booking.id);
		});

		it('should update booking status', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			db.prepare('UPDATE service_bookings SET status = ? WHERE id = ?').run(
				'confirmed',
				booking.id
			);

			const updated = db
				.prepare('SELECT status FROM service_bookings WHERE id = ?')
				.get(booking.id) as { status: string };
			expect(updated.status).toBe('confirmed');
		});

		it('should delete a booking', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			db.prepare('DELETE FROM service_bookings WHERE id = ?').run(booking.id);

			const deleted = db.prepare('SELECT * FROM service_bookings WHERE id = ?').get(booking.id);
			expect(deleted).toBeUndefined();
		});
	});

	describe('Booking workflow', () => {
		it('should support approval workflow', () => {
			const user = createUser({ role: 'admin' });
			const staffUser = createUser({ role: 'staff' });
			const service = createService({ userId: user.id, requiresApproval: true });

			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z',
				approvalStatus: 'pending'
			});

			const db = getTestDb();

			// Approve the booking
			db.prepare(
				`UPDATE service_bookings
				 SET approval_status = ?, approved_by = ?, approved_at = datetime('now'), status = ?
				 WHERE id = ?`
			).run('approved', staffUser.id, 'confirmed', booking.id);

			const approved = db
				.prepare('SELECT approval_status, approved_by, status FROM service_bookings WHERE id = ?')
				.get(booking.id) as {
				approval_status: string;
				approved_by: string;
				status: string;
			};

			expect(approved.approval_status).toBe('approved');
			expect(approved.approved_by).toBe(staffUser.id);
			expect(approved.status).toBe('confirmed');
		});

		it('should support rejection workflow', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id, requiresApproval: true });

			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z',
				approvalStatus: 'pending'
			});

			const db = getTestDb();
			db.prepare(`UPDATE service_bookings SET approval_status = ?, status = ? WHERE id = ?`).run(
				'rejected',
				'cancelled',
				booking.id
			);

			const rejected = db
				.prepare('SELECT approval_status, status FROM service_bookings WHERE id = ?')
				.get(booking.id) as { approval_status: string; status: string };

			expect(rejected.approval_status).toBe('rejected');
			expect(rejected.status).toBe('cancelled');
		});

		it('should support cancellation with reason', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });

			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z',
				status: 'confirmed'
			});

			const db = getTestDb();
			db.prepare(
				`UPDATE service_bookings
				 SET status = ?, cancelled_at = datetime('now'), cancellation_reason = ?
				 WHERE id = ?`
			).run('cancelled', 'Customer requested cancellation', booking.id);

			const cancelled = db
				.prepare('SELECT status, cancellation_reason FROM service_bookings WHERE id = ?')
				.get(booking.id) as { status: string; cancellation_reason: string };

			expect(cancelled.status).toBe('cancelled');
			expect(cancelled.cancellation_reason).toBe('Customer requested cancellation');
		});
	});

	describe('Booking with calendar event', () => {
		it('should link booking to calendar event', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const calendar = createCalendar({ userId: user.id });
			const event = createEvent({
				calendarId: calendar.id,
				title: 'Booking: Test',
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			const bookingId = crypto.randomUUID();

			db.prepare(
				`INSERT INTO service_bookings (id, service_id, event_id, customer_name, customer_email, start_time, end_time)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			).run(
				bookingId,
				service.id,
				event.id,
				'Test Customer',
				'test@example.com',
				'2024-01-15T10:00:00Z',
				'2024-01-15T11:00:00Z'
			);

			const booking = db
				.prepare('SELECT event_id FROM service_bookings WHERE id = ?')
				.get(bookingId) as { event_id: string };

			expect(booking.event_id).toBe(event.id);
		});

		it('should set event_id to null when event is deleted', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const calendar = createCalendar({ userId: user.id });
			const event = createEvent({
				calendarId: calendar.id,
				title: 'Booking Event',
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			const bookingId = crypto.randomUUID();

			db.prepare(
				`INSERT INTO service_bookings (id, service_id, event_id, customer_name, customer_email, start_time, end_time)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			).run(
				bookingId,
				service.id,
				event.id,
				'Test Customer',
				'test@example.com',
				'2024-01-15T10:00:00Z',
				'2024-01-15T11:00:00Z'
			);

			// Delete the event
			db.prepare('DELETE FROM events WHERE id = ?').run(event.id);

			const booking = db
				.prepare('SELECT event_id FROM service_bookings WHERE id = ?')
				.get(bookingId) as { event_id: string | null };

			expect(booking.event_id).toBeNull();
		});
	});

	describe('Resource assignments', () => {
		it('should assign resources to booking', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id, name: 'Room 1' });

			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			const assignmentId = crypto.randomUUID();

			db.prepare(
				'INSERT INTO booking_resource_assignments (id, booking_id, resource_id) VALUES (?, ?, ?)'
			).run(assignmentId, booking.id, resource.id);

			const assignments = db
				.prepare('SELECT * FROM booking_resource_assignments WHERE booking_id = ?')
				.all(booking.id);

			expect(assignments).toHaveLength(1);
		});

		it('should cascade delete resource assignments when booking is deleted', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });
			const resourceType = createResourceType({ userId: user.id });
			const resource = createResource({ resourceTypeId: resourceType.id });

			const booking = createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			db.prepare(
				'INSERT INTO booking_resource_assignments (id, booking_id, resource_id) VALUES (?, ?, ?)'
			).run(crypto.randomUUID(), booking.id, resource.id);

			// Delete booking
			db.prepare('DELETE FROM service_bookings WHERE id = ?').run(booking.id);

			// Check assignments are deleted
			const assignments = db
				.prepare('SELECT * FROM booking_resource_assignments WHERE booking_id = ?')
				.all(booking.id);

			expect(assignments).toHaveLength(0);
		});
	});

	describe('Booking queries', () => {
		it('should find bookings by service', () => {
			const user = createUser({ role: 'admin' });
			const service1 = createService({ userId: user.id, name: 'Service 1' });
			const service2 = createService({ userId: user.id, name: 'Service 2' });

			createServiceBooking({
				serviceId: service1.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});
			createServiceBooking({
				serviceId: service1.id,
				startTime: '2024-01-15T14:00:00Z',
				endTime: '2024-01-15T15:00:00Z'
			});
			createServiceBooking({
				serviceId: service2.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});

			const db = getTestDb();
			const bookings = db
				.prepare('SELECT * FROM service_bookings WHERE service_id = ?')
				.all(service1.id);

			expect(bookings).toHaveLength(2);
		});

		it('should find bookings by time range', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });

			createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z'
			});
			createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-16T10:00:00Z',
				endTime: '2024-01-16T11:00:00Z'
			});
			createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-17T10:00:00Z',
				endTime: '2024-01-17T11:00:00Z'
			});

			const db = getTestDb();
			const bookings = db
				.prepare(
					`SELECT * FROM service_bookings
					 WHERE start_time >= ? AND start_time < ?`
				)
				.all('2024-01-15T00:00:00Z', '2024-01-17T00:00:00Z');

			expect(bookings).toHaveLength(2);
		});

		it('should find bookings by status', () => {
			const user = createUser({ role: 'admin' });
			const service = createService({ userId: user.id });

			createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T10:00:00Z',
				endTime: '2024-01-15T11:00:00Z',
				status: 'confirmed'
			});
			createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-15T14:00:00Z',
				endTime: '2024-01-15T15:00:00Z',
				status: 'pending'
			});
			createServiceBooking({
				serviceId: service.id,
				startTime: '2024-01-16T10:00:00Z',
				endTime: '2024-01-16T11:00:00Z',
				status: 'cancelled'
			});

			const db = getTestDb();
			const confirmedBookings = db
				.prepare("SELECT * FROM service_bookings WHERE status = 'confirmed'")
				.all();

			expect(confirmedBookings).toHaveLength(1);
		});
	});
});
