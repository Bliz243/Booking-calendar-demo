/**
 * Availability Calculator Re-exports
 *
 * Re-exports from the booking domain for backward compatibility.
 * New code should import from '$lib/server/domains/booking' instead.
 */

import { availabilityService, type ServiceContext } from '$lib/server/domains/booking';
import type { AvailableSlot, SlotValidationResult } from '$lib/types/service';

export type { ServiceContext };

export function loadServiceContext(serviceId: string): ServiceContext | null {
	return availabilityService.loadServiceContext(serviceId);
}

export function getAvailableSlots(
	serviceId: string,
	startDate: Date,
	endDate: Date,
	options?: {
		excludeBookingId?: string;
		customerEmail?: string;
		durationMinutes?: number;
	}
): AvailableSlot[] {
	return availabilityService.getAvailableSlots(serviceId, startDate, endDate, options);
}

export function validateSlot(
	serviceId: string,
	startTime: Date,
	endTime: Date,
	options?: {
		excludeBookingId?: string;
		customerEmail?: string;
		isStaff?: boolean;
		overrideMinNotice?: boolean;
		overrideOperatingHours?: boolean;
	}
): SlotValidationResult {
	return availabilityService.validateSlot(serviceId, startTime, endTime, options);
}

export function getNextAvailableSlot(
	serviceId: string,
	fromTime: Date,
	options?: { durationMinutes?: number }
): AvailableSlot | null {
	return availabilityService.getNextAvailableSlot(serviceId, fromTime, options);
}
