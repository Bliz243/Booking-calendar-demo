import { transaction } from '$lib/server/db/client';
import { bookingRepository, type BookingFilters } from '../repositories/booking.repository';
import { serviceRepository } from '../repositories/service.repository';
import { calendarAdapter } from '../adapters/calendar.adapter';
import { availabilityService } from './availability.service';
import {
	rowToServiceBooking,
	rowToBookingResourceAssignment,
	type ServiceBooking,
	type ServiceBookingWithDetails,
	type BookingResourceAssignmentWithDetails
} from '$lib/types/service';
import { addHours, isBefore } from '$lib/utils/date';

export interface CreateBookingInput {
	serviceId: string;
	startTime: Date;
	endTime?: Date;
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	customerNotes?: string;
	resourceSelections?: Array<{ resourceTypeId: string; resourceId: string }>;
}

export interface CreateBookingOptions {
	isStaff?: boolean;
	staffId?: string;
	overrideMinNotice?: boolean;
	overrideOperatingHours?: boolean;
	assignedResourceIds?: string[];
}

export type BookingResult = { booking: ServiceBookingWithDetails } | { error: string };
export type BookingDeleteResult = { success: true } | { error: string };

function loadBookingWithDetails(bookingId: string): ServiceBookingWithDetails | null {
	const row = bookingRepository.findByIdWithService(bookingId);
	if (!row) return null;

	const assignments = bookingRepository.findAssignments(bookingId);

	return {
		...rowToServiceBooking(row),
		serviceName: row.service_name,
		serviceColor: row.service_color,
		assignedResources: assignments.map((a) => ({
			...rowToBookingResourceAssignment(a),
			resourceName: a.resource_name,
			resourceTypeName: a.type_name,
			resourceTypeColor: a.type_color
		}))
	};
}

export const bookingService = {
	/**
	 * Get a booking by ID
	 */
	getById(bookingId: string): ServiceBookingWithDetails | null {
		return loadBookingWithDetails(bookingId);
	},

	/**
	 * List bookings with filters
	 */
	list(filters?: BookingFilters): ServiceBookingWithDetails[] {
		const rows = bookingRepository.findByFilters(filters || {});
		const bookingIds = rows.map((r) => r.id);

		if (bookingIds.length === 0) return [];

		// Get all assignments
		const assignments = bookingRepository.findAssignmentsByBookingIds(bookingIds);
		const assignmentsByBooking = new Map<string, BookingResourceAssignmentWithDetails[]>();

		for (const a of assignments) {
			const existing = assignmentsByBooking.get(a.booking_id) || [];
			existing.push({
				...rowToBookingResourceAssignment(a),
				resourceName: a.resource_name,
				resourceTypeName: a.type_name,
				resourceTypeColor: a.type_color
			});
			assignmentsByBooking.set(a.booking_id, existing);
		}

		return rows.map((row) => ({
			...rowToServiceBooking(row),
			serviceName: row.service_name,
			serviceColor: row.service_color,
			assignedResources: assignmentsByBooking.get(row.id) || []
		}));
	},

	/**
	 * Create a new booking
	 */
	create(input: CreateBookingInput, options?: CreateBookingOptions): BookingResult {
		// Load service context
		const ctx = availabilityService.loadServiceContext(input.serviceId);
		if (!ctx) {
			return { error: 'Service not found' };
		}

		const startTime = input.startTime;
		const endTime =
			input.endTime || new Date(startTime.getTime() + ctx.service.durationMinutes * 60000);

		// Validate the slot
		const validation = availabilityService.validateSlot(input.serviceId, startTime, endTime, {
			customerEmail: input.customerEmail,
			isStaff: options?.isStaff,
			overrideMinNotice: options?.overrideMinNotice,
			overrideOperatingHours: options?.overrideOperatingHours
		});

		if (!validation.valid) {
			return { error: validation.reason || 'Slot is not available' };
		}

		// Determine resources to assign
		let resourcesToAssign: string[] = [];

		if (options?.assignedResourceIds?.length) {
			resourcesToAssign = options.assignedResourceIds;
		} else if (input.resourceSelections?.length) {
			resourcesToAssign = input.resourceSelections.map((s) => s.resourceId);
		} else if (validation.availableResources?.length) {
			// Auto-assign first available resource for each required type
			for (const group of validation.availableResources) {
				const requirement = ctx.requirements.find((r) => r.resourceTypeId === group.resourceTypeId);
				const quantity = requirement?.quantity ?? 1;

				for (let i = 0; i < Math.min(quantity, group.resources.length); i++) {
					resourcesToAssign.push(group.resources[i].resourceId);
				}
			}
		}

		// Determine initial status
		const initialStatus = ctx.service.requiresApproval ? 'pending' : 'confirmed';
		const approvalStatus = ctx.service.requiresApproval ? 'pending' : null;

		return transaction(() => {
			// Create the booking
			const bookingRow = bookingRepository.create({
				serviceId: input.serviceId,
				customerName: input.customerName,
				customerEmail: input.customerEmail,
				customerPhone: input.customerPhone,
				customerNotes: input.customerNotes,
				startTime,
				endTime,
				status: initialStatus,
				approvalStatus,
				createdBy: options?.staffId
			});

			// Create resource assignments
			for (const resourceId of resourcesToAssign) {
				bookingRepository.createAssignment(bookingRow.id, resourceId);
			}

			// Create calendar event for confirmed bookings
			if (initialStatus === 'confirmed') {
				this.createCalendarEvent(bookingRow.id);
			}

			const booking = loadBookingWithDetails(bookingRow.id);
			if (!booking) {
				throw new Error('Failed to create booking');
			}

			return { booking };
		});
	},

	/**
	 * Approve a pending booking
	 */
	approve(bookingId: string, staffId: string): BookingResult {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { error: 'Booking not found' };
		}

		if (booking.approval_status !== 'pending') {
			return { error: 'Booking is not pending approval' };
		}

		return transaction(() => {
			bookingRepository.updateStatus(bookingId, 'confirmed', {
				approvalStatus: 'approved',
				approvedBy: staffId
			});

			// Create calendar event
			this.createCalendarEvent(bookingId);

			const updated = loadBookingWithDetails(bookingId);
			if (!updated) {
				throw new Error('Failed to approve booking');
			}

			return { booking: updated };
		});
	},

	/**
	 * Reject a pending booking
	 */
	reject(bookingId: string, staffId: string, reason?: string): BookingResult {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { error: 'Booking not found' };
		}

		if (booking.approval_status !== 'pending') {
			return { error: 'Booking is not pending approval' };
		}

		bookingRepository.updateStatus(bookingId, 'cancelled', {
			approvalStatus: 'rejected',
			approvedBy: staffId,
			cancelledAt: true,
			cancellationReason: reason ?? 'Booking rejected'
		});

		const updated = loadBookingWithDetails(bookingId);
		if (!updated) {
			return { error: 'Failed to reject booking' };
		}

		return { booking: updated };
	},

	/**
	 * Cancel a booking
	 */
	cancel(bookingId: string, reason?: string, options?: { isStaff?: boolean }): BookingResult {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { error: 'Booking not found' };
		}

		if (booking.status === 'cancelled') {
			return { error: 'Booking is already cancelled' };
		}

		// Check cancellation window for customer cancellations
		if (!options?.isStaff) {
			const service = serviceRepository.findById(booking.service_id);
			if (service) {
				const bookingStart = new Date(booking.start_time);
				const cancellationDeadline = addHours(new Date(), service.cancellation_hours);

				if (isBefore(bookingStart, cancellationDeadline)) {
					return {
						error: `Cancellations must be made at least ${service.cancellation_hours} hours in advance`
					};
				}
			}
		}

		return transaction(() => {
			bookingRepository.updateStatus(bookingId, 'cancelled', {
				cancelledAt: true,
				cancellationReason: reason
			});

			// Cancel calendar event if exists
			if (booking.event_id) {
				calendarAdapter.cancelEvent(booking.event_id);
			}

			const updated = loadBookingWithDetails(bookingId);
			if (!updated) {
				throw new Error('Failed to cancel booking');
			}

			return { booking: updated };
		});
	},

	/**
	 * Update booking status (for staff)
	 */
	updateStatus(bookingId: string, status: 'completed' | 'no_show'): BookingResult {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { error: 'Booking not found' };
		}

		if (booking.status !== 'confirmed') {
			return { error: 'Only confirmed bookings can be marked as completed or no-show' };
		}

		bookingRepository.updateStatus(bookingId, status);

		const updated = loadBookingWithDetails(bookingId);
		if (!updated) {
			return { error: 'Failed to update booking' };
		}

		return { booking: updated };
	},

	/**
	 * Update resource assignments
	 */
	updateResources(bookingId: string, resourceIds: string[]): BookingDeleteResult {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { error: 'Booking not found' };
		}

		if (booking.status === 'cancelled' || booking.status === 'completed') {
			return { error: 'Cannot update resources for this booking' };
		}

		bookingRepository.setAssignments(bookingId, resourceIds);
		return { success: true };
	},

	/**
	 * Create a calendar event for a booking (internal helper)
	 */
	createCalendarEvent(bookingId: string): void {
		const booking = bookingRepository.findByIdWithService(bookingId);
		if (!booking) return;

		const title = `${booking.service_name} - ${booking.customer_name}`;
		const description = booking.customer_notes
			? `Customer: ${booking.customer_name}\nEmail: ${booking.customer_email}\nPhone: ${booking.customer_phone ?? 'N/A'}\n\nNotes: ${booking.customer_notes}`
			: `Customer: ${booking.customer_name}\nEmail: ${booking.customer_email}\nPhone: ${booking.customer_phone ?? 'N/A'}`;

		const eventId = calendarAdapter.createEventForBooking(
			title,
			description,
			new Date(booking.start_time),
			new Date(booking.end_time)
		);

		bookingRepository.updateEventId(bookingId, eventId);
	},

	/**
	 * Find a booking by its linked calendar event ID
	 */
	findByEventId(eventId: string): ServiceBookingWithDetails | null {
		const row = bookingRepository.findByEventIdWithService(eventId);
		if (!row) return null;

		const assignments = bookingRepository.findAssignments(row.id);

		return {
			...rowToServiceBooking(row),
			serviceName: row.service_name,
			serviceColor: row.service_color,
			assignedResources: assignments.map((a) => ({
				...rowToBookingResourceAssignment(a),
				resourceName: a.resource_name,
				resourceTypeName: a.type_name,
				resourceTypeColor: a.type_color
			}))
		};
	},

	/**
	 * Validate if a booking can be rescheduled to a new time.
	 * This is a LIGHTWEIGHT check that only verifies:
	 * 1. Booking exists and is in a valid state
	 * 2. Assigned resources don't have conflicts at the new time
	 *
	 * We intentionally skip operating hours, min notice, buffer time, etc.
	 * because staff should be able to freely move bookings.
	 */
	validateReschedule(
		bookingId: string,
		newStart: Date,
		newEnd: Date
	): { valid: true } | { valid: false; reason: string } {
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { valid: false, reason: 'Booking not found' };
		}

		if (booking.status === 'cancelled' || booking.status === 'completed') {
			return { valid: false, reason: 'Cannot reschedule a cancelled or completed booking' };
		}

		// Get assigned resources and check for conflicts
		const resourceIds = bookingRepository.findAssignedResourceIds(bookingId);

		if (resourceIds.length > 0) {
			const conflict = bookingRepository.findResourceConflict(
				resourceIds,
				newStart,
				newEnd,
				bookingId,
				booking.event_id
			);

			if (conflict) {
				return {
					valid: false,
					reason: `${conflict.resourceName} is already booked at this time`
				};
			}
		}

		return { valid: true };
	},

	/**
	 * Reschedule a booking to a new time.
	 * Updates both the booking record and the linked calendar event.
	 * Uses lightweight validation (only checks resource conflicts).
	 */
	reschedule(bookingId: string, newStart: Date, newEnd: Date): BookingResult {
		// Get booking first (we need it for validation and update)
		const booking = bookingRepository.findById(bookingId);
		if (!booking) {
			return { error: 'Booking not found' };
		}

		if (booking.status === 'cancelled' || booking.status === 'completed') {
			return { error: 'Cannot reschedule a cancelled or completed booking' };
		}

		// Lightweight conflict check
		const resourceIds = bookingRepository.findAssignedResourceIds(bookingId);

		if (resourceIds.length > 0) {
			const conflict = bookingRepository.findResourceConflict(
				resourceIds,
				newStart,
				newEnd,
				bookingId,
				booking.event_id
			);

			if (conflict) {
				return { error: `${conflict.resourceName} is already booked at this time` };
			}
		}

		// All clear - update in transaction
		return transaction(() => {
			// Update booking times
			bookingRepository.updateTimes(bookingId, newStart, newEnd);

			// Update calendar event if linked
			if (booking.event_id) {
				calendarAdapter.updateEventTime(booking.event_id, newStart, newEnd);
			}

			const updated = loadBookingWithDetails(bookingId);
			if (!updated) {
				throw new Error('Failed to reschedule booking');
			}

			return { booking: updated };
		});
	}
};
