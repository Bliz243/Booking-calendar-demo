/**
 * Booking Service Re-exports
 *
 * Re-exports from the booking domain for backward compatibility.
 * New code should import from '$lib/server/domains/booking' instead.
 */

import { bookingService, type CreateBookingOptions } from '$lib/server/domains/booking';
import type { ServiceBooking, ServiceBookingWithDetails } from '$lib/types/service';

export type { CreateBookingOptions };

type BookingSuccess<T> = { success: true; booking: T };
type BookingError = { success: false; error: string };

export function createServiceBooking(
	input: {
		serviceId: string;
		startTime: string;
		endTime?: string;
		customerName: string;
		customerEmail: string;
		customerPhone?: string;
		customerNotes?: string;
		resourceSelections?: Array<{ resourceTypeId: string; resourceId: string }>;
	},
	options?: CreateBookingOptions
): { booking: ServiceBooking; error?: never } | { booking?: never; error: string } {
	const result = bookingService.create(
		{
			serviceId: input.serviceId,
			startTime: new Date(input.startTime),
			endTime: input.endTime ? new Date(input.endTime) : undefined,
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			customerPhone: input.customerPhone,
			customerNotes: input.customerNotes,
			resourceSelections: input.resourceSelections
		},
		options
	);

	if ('error' in result) {
		return { error: result.error };
	}
	return { booking: result.booking };
}

export function getServiceBookingById(bookingId: string): ServiceBookingWithDetails | null {
	return bookingService.getById(bookingId);
}

export function listServiceBookings(filters?: {
	serviceId?: string;
	status?: string;
	approvalStatus?: string;
	startDate?: Date;
	endDate?: Date;
	customerEmail?: string;
}): ServiceBookingWithDetails[] {
	return bookingService.list(filters);
}

export function approveBooking(
	bookingId: string,
	staffId: string
): BookingSuccess<ServiceBooking> | BookingError {
	const result = bookingService.approve(bookingId, staffId);
	if ('error' in result) {
		return { success: false, error: result.error };
	}
	return { success: true, booking: result.booking };
}

export function rejectBooking(
	bookingId: string,
	staffId: string,
	reason?: string
): BookingSuccess<ServiceBooking> | BookingError {
	const result = bookingService.reject(bookingId, staffId, reason);
	if ('error' in result) {
		return { success: false, error: result.error };
	}
	return { success: true, booking: result.booking };
}

export function cancelBooking(
	bookingId: string,
	reason?: string,
	options?: { isStaff?: boolean; staffId?: string }
): BookingSuccess<ServiceBooking> | BookingError {
	const result = bookingService.cancel(bookingId, reason, options);
	if ('error' in result) {
		return { success: false, error: result.error };
	}
	return { success: true, booking: result.booking };
}

export function updateBookingStatus(
	bookingId: string,
	status: 'completed' | 'no_show'
): BookingSuccess<ServiceBooking> | BookingError {
	const result = bookingService.updateStatus(bookingId, status);
	if ('error' in result) {
		return { success: false, error: result.error };
	}
	return { success: true, booking: result.booking };
}

export function updateBookingResources(
	bookingId: string,
	resourceIds: string[]
): { success: true } | { success: false; error: string } {
	const result = bookingService.updateResources(bookingId, resourceIds);
	if ('error' in result) {
		return { success: false, error: result.error };
	}
	return { success: true };
}
