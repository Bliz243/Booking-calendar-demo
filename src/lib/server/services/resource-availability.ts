/**
 * Resource Availability Re-exports
 *
 * Re-exports from the resource domain for backward compatibility.
 * New code should import from '$lib/server/domains/resource' instead.
 */

import { availabilityService, type ResourceWithAvailability } from '$lib/server/domains/resource';
import type { ServiceBookingRow } from '$lib/types/service';

export type { ResourceWithAvailability };

export function isResourceAvailable(
	resourceId: string,
	startTime: Date,
	endTime: Date,
	excludeBookingId?: string
): boolean {
	return availabilityService.isResourceAvailable(resourceId, startTime, endTime, excludeBookingId);
}

export function getAvailableResources(
	resourceTypeId: string,
	startTime: Date,
	endTime: Date,
	requiredQualifications?: string[],
	excludeBookingId?: string
): ResourceWithAvailability[] {
	return availabilityService.getAvailableResources(
		resourceTypeId,
		startTime,
		endTime,
		requiredQualifications,
		excludeBookingId
	);
}

export function resourceHasAvailabilityForDay(resourceId: string, dayOfWeek: number): boolean {
	return availabilityService.resourceHasAvailabilityForDay(resourceId, dayOfWeek);
}

export function getResourcesOperatingHoursIntersection(
	resourceIds: string[],
	dayOfWeek: number
): { startTime: string; endTime: string } | null {
	return availabilityService.getResourcesOperatingHoursIntersection(resourceIds, dayOfWeek);
}

export function getResourceBookings(
	resourceId: string,
	startDate: Date,
	endDate: Date
): ServiceBookingRow[] {
	return availabilityService.getResourceBookings(resourceId, startDate, endDate);
}

export function getCustomerActiveBookingCount(
	serviceId: string,
	customerEmail: string,
	excludeBookingId?: string
): number {
	return availabilityService.getCustomerActiveBookingCount(
		serviceId,
		customerEmail,
		excludeBookingId
	);
}

export function getServiceCapacityUsage(
	serviceId: string,
	startTime: Date,
	endTime: Date,
	excludeBookingId?: string
): number {
	return availabilityService.getServiceCapacityUsage(
		serviceId,
		startTime,
		endTime,
		excludeBookingId
	);
}

export function hasOverlappingBookings(
	serviceId: string,
	startTime: Date,
	endTime: Date,
	excludeBookingId?: string
): boolean {
	return availabilityService.hasOverlappingBookings(
		serviceId,
		startTime,
		endTime,
		excludeBookingId
	);
}
