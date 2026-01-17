import { queryAll, queryOne } from '$lib/server/db/client';
import { resourceRepository } from '../repositories/resource.repository';
import type { ResourceAvailabilityRow, ResourceRow } from '$lib/types/resource';
import type { ServiceBookingRow } from '$lib/types/service';
import { format } from '$lib/utils/date';

export interface ResourceWithAvailability {
	id: string;
	name: string;
	resourceTypeId: string;
	availability: ResourceAvailabilityRow[];
	qualificationIds: string[];
}

export const availabilityService = {
	/**
	 * Check if a specific resource is available during a time range
	 */
	isResourceAvailable(
		resourceId: string,
		startTime: Date,
		endTime: Date,
		excludeBookingId?: string
	): boolean {
		// Check if resource has availability for this day
		const dayOfWeek = startTime.getDay();
		const availability = resourceRepository.findAvailabilityForDay(resourceId, dayOfWeek);

		if (availability.length === 0) {
			return false;
		}

		// Check if the requested time falls within any availability window
		const timeStr = format(startTime, 'HH:mm');
		const endTimeStr = format(endTime, 'HH:mm');

		const hasAvailableWindow = availability.some((window) => {
			return window.start_time <= timeStr && window.end_time >= endTimeStr;
		});

		if (!hasAvailableWindow) {
			return false;
		}

		// Check for conflicts with existing service bookings
		const startIso = startTime.toISOString();
		const endIso = endTime.toISOString();

		let conflictQuery = `
			SELECT sb.id
			FROM service_bookings sb
			JOIN booking_resource_assignments bra ON bra.booking_id = sb.id
			WHERE bra.resource_id = ?
			AND sb.status NOT IN ('cancelled', 'completed', 'no_show')
			AND sb.start_time < ?
			AND sb.end_time > ?
		`;
		const conflictParams: unknown[] = [resourceId, endIso, startIso];

		if (excludeBookingId) {
			conflictQuery += ` AND sb.id != ?`;
			conflictParams.push(excludeBookingId);
		}

		const conflicts = queryAll<{ id: string }>(conflictQuery, conflictParams);

		if (conflicts.length > 0) {
			return false;
		}

		// Check for conflicts with event_resources
		const eventConflicts = queryAll<{ id: string }>(
			`
			SELECT er.id
			FROM event_resources er
			JOIN events e ON e.id = er.event_id
			WHERE er.resource_id = ?
			AND er.status != 'declined'
			AND e.status != 'cancelled'
			AND e.start_time < ?
			AND e.end_time > ?
			`,
			[resourceId, endIso, startIso]
		);

		return eventConflicts.length === 0;
	},

	/**
	 * Get all resources of a specific type that are available during a time range
	 */
	getAvailableResources(
		resourceTypeId: string,
		startTime: Date,
		endTime: Date,
		requiredQualifications?: string[],
		excludeBookingId?: string
	): ResourceWithAvailability[] {
		// Get all active resources of this type
		const resources = resourceRepository.findActiveByTypeId(resourceTypeId);
		const availableResources: ResourceWithAvailability[] = [];

		for (const resource of resources) {
			// Check qualifications if required
			if (requiredQualifications && requiredQualifications.length > 0) {
				const qualificationIds = resourceRepository.findQualifications(resource.id);

				const hasAllQualifications = requiredQualifications.every((reqId) =>
					qualificationIds.includes(reqId)
				);

				if (!hasAllQualifications) {
					continue;
				}
			}

			// Check if resource is available at this time
			if (this.isResourceAvailable(resource.id, startTime, endTime, excludeBookingId)) {
				const availability = resourceRepository.findAvailability(resource.id);
				const qualificationIds = resourceRepository.findQualifications(resource.id);

				availableResources.push({
					id: resource.id,
					name: resource.name,
					resourceTypeId: resource.resource_type_id,
					availability,
					qualificationIds
				});
			}
		}

		return availableResources;
	},

	/**
	 * Check if a resource has availability configured for a given day
	 */
	resourceHasAvailabilityForDay(resourceId: string, dayOfWeek: number): boolean {
		const availability = resourceRepository.findAvailabilityForDay(resourceId, dayOfWeek);
		return availability.length > 0;
	},

	/**
	 * Get the intersection of operating hours for a set of resources on a given day
	 */
	getResourcesOperatingHoursIntersection(
		resourceIds: string[],
		dayOfWeek: number
	): { startTime: string; endTime: string } | null {
		if (resourceIds.length === 0) {
			return null;
		}

		let latestStart = '00:00';
		let earliestEnd = '23:59';

		for (const resourceId of resourceIds) {
			const availability = resourceRepository.findAvailabilityForDay(resourceId, dayOfWeek);

			if (availability.length === 0) {
				return null;
			}

			let resourceEarliestStart = '23:59';
			let resourceLatestEnd = '00:00';

			for (const window of availability) {
				if (window.start_time < resourceEarliestStart) {
					resourceEarliestStart = window.start_time;
				}
				if (window.end_time > resourceLatestEnd) {
					resourceLatestEnd = window.end_time;
				}
			}

			if (resourceEarliestStart > latestStart) {
				latestStart = resourceEarliestStart;
			}
			if (resourceLatestEnd < earliestEnd) {
				earliestEnd = resourceLatestEnd;
			}
		}

		if (latestStart >= earliestEnd) {
			return null;
		}

		return { startTime: latestStart, endTime: earliestEnd };
	},

	/**
	 * Get existing bookings for a resource within a date range
	 */
	getResourceBookings(resourceId: string, startDate: Date, endDate: Date): ServiceBookingRow[] {
		const startIso = startDate.toISOString();
		const endIso = endDate.toISOString();

		return queryAll<ServiceBookingRow>(
			`
			SELECT sb.*
			FROM service_bookings sb
			JOIN booking_resource_assignments bra ON bra.booking_id = sb.id
			WHERE bra.resource_id = ?
			AND sb.status NOT IN ('cancelled', 'completed', 'no_show')
			AND sb.start_time < ?
			AND sb.end_time > ?
			ORDER BY sb.start_time
			`,
			[resourceId, endIso, startIso]
		);
	},

	/**
	 * Get booking count for a customer within a service
	 */
	getCustomerActiveBookingCount(
		serviceId: string,
		customerEmail: string,
		excludeBookingId?: string
	): number {
		let query = `
			SELECT COUNT(*) as count
			FROM service_bookings
			WHERE service_id = ?
			AND customer_email = ?
			AND status IN ('pending', 'confirmed')
		`;
		const params: unknown[] = [serviceId, customerEmail];

		if (excludeBookingId) {
			query += ` AND id != ?`;
			params.push(excludeBookingId);
		}

		const result = queryOne<{ count: number }>(query, params);
		return result?.count ?? 0;
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
		const startIso = startTime.toISOString();
		const endIso = endTime.toISOString();

		let query = `
			SELECT COUNT(*) as count
			FROM service_bookings
			WHERE service_id = ?
			AND status IN ('pending', 'confirmed')
			AND start_time = ?
			AND end_time = ?
		`;
		const params: unknown[] = [serviceId, startIso, endIso];

		if (excludeBookingId) {
			query += ` AND id != ?`;
			params.push(excludeBookingId);
		}

		const result = queryOne<{ count: number }>(query, params);
		return result?.count ?? 0;
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
		const startIso = startTime.toISOString();
		const endIso = endTime.toISOString();

		let query = `
			SELECT COUNT(*) as count
			FROM service_bookings
			WHERE service_id = ?
			AND status IN ('pending', 'confirmed')
			AND start_time < ?
			AND end_time > ?
		`;
		const params: unknown[] = [serviceId, endIso, startIso];

		if (excludeBookingId) {
			query += ` AND id != ?`;
			params.push(excludeBookingId);
		}

		const result = queryOne<{ count: number }>(query, params);
		return (result?.count ?? 0) > 0;
	}
};
