/**
 * Resource Adapter
 *
 * Provides a clean interface for the booking domain to interact with the resource domain.
 * All resource availability checks from booking should go through this adapter.
 */

import { availabilityService, type ResourceWithAvailability } from '../../resource';

export const resourceAdapter = {
	/**
	 * Check if a specific resource is available during a time range
	 */
	isResourceAvailable(
		resourceId: string,
		startTime: Date,
		endTime: Date,
		excludeBookingId?: string
	): boolean {
		return availabilityService.isResourceAvailable(
			resourceId,
			startTime,
			endTime,
			excludeBookingId
		);
	},

	/**
	 * Get all available resources of a specific type during a time range
	 */
	getAvailableResources(
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
	},

	/**
	 * Get customer's active booking count for a service
	 */
	getCustomerActiveBookingCount(
		serviceId: string,
		customerEmail: string,
		excludeBookingId?: string
	): number {
		return availabilityService.getCustomerActiveBookingCount(
			serviceId,
			customerEmail,
			excludeBookingId
		);
	},

	/**
	 * Get capacity usage for a class-type booking
	 */
	getServiceCapacityUsage(
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
	},

	/**
	 * Check for overlapping bookings
	 */
	hasOverlappingBookings(
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
};
