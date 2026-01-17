/**
 * Availability Service
 *
 * Handles all slot calculation and availability validation for bookings.
 * Uses the resource adapter for cross-domain resource availability checks.
 */

import { serviceRepository } from '../repositories/service.repository';
import { resourceAdapter } from '../adapters/resource.adapter';
import {
	rowToService,
	rowToServiceResourceRequirement,
	type Service,
	type AvailableSlot,
	type ResourceAvailabilityGroup,
	type SlotValidationResult
} from '$lib/types/service';
import {
	startOfDay,
	addDays,
	addMinutes,
	addHours,
	combineDateAndTime,
	isBefore,
	isAfter,
	format
} from '$lib/utils/date';

export interface ServiceContext {
	service: Service;
	requirements: {
		id: string;
		resourceTypeId: string;
		resourceTypeName: string;
		quantity: number;
		isOptional: boolean;
		requiredQualifications: string[];
	}[];
}

export interface GetSlotsOptions {
	excludeBookingId?: string;
	customerEmail?: string;
	durationMinutes?: number;
}

export interface ValidateSlotOptions {
	excludeBookingId?: string;
	customerEmail?: string;
	isStaff?: boolean;
	overrideMinNotice?: boolean;
	overrideOperatingHours?: boolean;
}

/**
 * Load service with all its resource requirements
 */
function loadServiceContext(serviceId: string): ServiceContext | null {
	const serviceRow = serviceRepository.findById(serviceId);

	if (!serviceRow) {
		return null;
	}

	const service = rowToService(serviceRow);

	const requirementRows = serviceRepository.findRequirements(serviceId);

	const requirements = requirementRows.map((row) => {
		const req = rowToServiceResourceRequirement(row);
		return {
			...req,
			resourceTypeName: row.type_name
		};
	});

	return { service, requirements };
}

/**
 * Check if all required resources are available for a time slot
 * Returns null if not all required resources are available
 */
function checkResourceAvailability(
	ctx: ServiceContext,
	startTime: Date,
	endTime: Date,
	excludeBookingId?: string
): ResourceAvailabilityGroup[] | null {
	const groups: ResourceAvailabilityGroup[] = [];

	// If no requirements, the slot is available
	if (ctx.requirements.length === 0) {
		return groups;
	}

	for (const requirement of ctx.requirements) {
		const availableResources = resourceAdapter.getAvailableResources(
			requirement.resourceTypeId,
			startTime,
			endTime,
			requirement.requiredQualifications.length > 0
				? requirement.requiredQualifications
				: undefined,
			excludeBookingId
		);

		// Check if we have enough resources
		if (availableResources.length < requirement.quantity) {
			// If this requirement is optional, we can skip it
			if (requirement.isOptional) {
				continue;
			}
			// Required resource not available
			return null;
		}

		groups.push({
			resourceTypeId: requirement.resourceTypeId,
			resourceTypeName: requirement.resourceTypeName,
			resources: availableResources.map((r) => ({
				resourceId: r.id,
				resourceName: r.name
			}))
		});
	}

	return groups;
}

/**
 * Get available slots for a specific day
 */
function getSlotsForDay(
	ctx: ServiceContext,
	day: Date,
	duration: number,
	minNoticeTime: Date,
	options?: GetSlotsOptions
): AvailableSlot[] {
	const slots: AvailableSlot[] = [];
	const bufferMinutes = ctx.service.bufferMinutes;

	// Calculate slot interval (duration + buffer)
	const slotInterval = duration + bufferMinutes;

	// Generate slots within operating hours
	let currentStart = combineDateAndTime(day, ctx.service.operatingStartTime);
	const operatingEnd = combineDateAndTime(day, ctx.service.operatingEndTime);

	while (true) {
		const slotEnd = addMinutes(currentStart, duration);

		// Check if slot fits within operating hours
		if (isAfter(slotEnd, operatingEnd)) {
			break;
		}

		// Check min notice
		if (isBefore(currentStart, minNoticeTime)) {
			currentStart = addMinutes(currentStart, slotInterval);
			continue;
		}

		// Check resource availability for this slot
		const resourceGroups = checkResourceAvailability(
			ctx,
			currentStart,
			slotEnd,
			options?.excludeBookingId
		);

		// Only add slot if all required resources are available
		if (resourceGroups !== null) {
			// For class-type services, check capacity
			if (ctx.service.capacity > 1) {
				const currentUsage = resourceAdapter.getServiceCapacityUsage(
					ctx.service.id,
					currentStart,
					slotEnd,
					options?.excludeBookingId
				);

				const remainingCapacity = ctx.service.capacity - currentUsage;
				if (remainingCapacity > 0) {
					slots.push({
						startTime: currentStart,
						endTime: slotEnd,
						availableResources: resourceGroups,
						remainingCapacity
					});
				}
			} else {
				// For appointment services (capacity=1), check for overlapping bookings
				const hasOverlap = resourceAdapter.hasOverlappingBookings(
					ctx.service.id,
					currentStart,
					slotEnd,
					options?.excludeBookingId
				);

				if (!hasOverlap) {
					slots.push({
						startTime: currentStart,
						endTime: slotEnd,
						availableResources: resourceGroups
					});
				}
			}
		}

		currentStart = addMinutes(currentStart, slotInterval);
	}

	return slots;
}

export const availabilityService = {
	/**
	 * Load service context (for use by booking service)
	 */
	loadServiceContext,

	/**
	 * Calculate available slots for a service within a date range
	 */
	getAvailableSlots(
		serviceId: string,
		startDate: Date,
		endDate: Date,
		options?: GetSlotsOptions
	): AvailableSlot[] {
		const ctx = loadServiceContext(serviceId);

		if (!ctx || !ctx.service.isActive) {
			return [];
		}

		const slots: AvailableSlot[] = [];
		const now = new Date();
		const minNoticeTime = addHours(now, ctx.service.minNoticeHours);
		const maxAdvanceDate = addDays(now, ctx.service.maxAdvanceDays);

		// Determine effective duration
		const duration = options?.durationMinutes ?? ctx.service.durationMinutes;

		// Effective date range
		const effectiveStart = isBefore(startDate, minNoticeTime)
			? startOfDay(minNoticeTime)
			: startOfDay(startDate);
		const effectiveEnd = isAfter(endDate, maxAdvanceDate) ? maxAdvanceDate : endDate;

		// Iterate through each day
		let currentDay = effectiveStart;

		while (
			isBefore(currentDay, effectiveEnd) ||
			format(currentDay, 'yyyy-MM-dd') === format(effectiveEnd, 'yyyy-MM-dd')
		) {
			const dayOfWeek = currentDay.getDay();

			// Check if service operates on this day
			if (!ctx.service.operatingDays.includes(dayOfWeek)) {
				currentDay = addDays(currentDay, 1);
				continue;
			}

			// Get slots for this day
			const daySlots = getSlotsForDay(ctx, currentDay, duration, minNoticeTime, options);
			slots.push(...daySlots);

			currentDay = addDays(currentDay, 1);
		}

		return slots;
	},

	/**
	 * Validate a specific slot for booking
	 */
	validateSlot(
		serviceId: string,
		startTime: Date,
		endTime: Date,
		options?: ValidateSlotOptions
	): SlotValidationResult {
		const ctx = loadServiceContext(serviceId);

		if (!ctx) {
			return { valid: false, reason: 'Service not found' };
		}

		if (!ctx.service.isActive) {
			return { valid: false, reason: 'Service is not active' };
		}

		const now = new Date();

		// Check min notice (unless overridden by staff)
		if (!options?.overrideMinNotice) {
			const minNoticeTime = addHours(now, ctx.service.minNoticeHours);
			if (isBefore(startTime, minNoticeTime)) {
				return {
					valid: false,
					reason: `Bookings require at least ${ctx.service.minNoticeHours} hours notice`
				};
			}
		}

		// Check max advance
		const maxAdvanceDate = addDays(now, ctx.service.maxAdvanceDays);
		if (isAfter(startTime, maxAdvanceDate)) {
			return {
				valid: false,
				reason: `Cannot book more than ${ctx.service.maxAdvanceDays} days in advance`
			};
		}

		// Check duration
		const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

		if (ctx.service.minDurationMinutes && duration < ctx.service.minDurationMinutes) {
			return {
				valid: false,
				reason: `Minimum duration is ${ctx.service.minDurationMinutes} minutes`
			};
		}

		if (ctx.service.maxDurationMinutes && duration > ctx.service.maxDurationMinutes) {
			return {
				valid: false,
				reason: `Maximum duration is ${ctx.service.maxDurationMinutes} minutes`
			};
		}

		// Check operating day (unless overridden by staff)
		if (!options?.overrideOperatingHours) {
			const dayOfWeek = startTime.getDay();
			if (!ctx.service.operatingDays.includes(dayOfWeek)) {
				return { valid: false, reason: 'Service is not available on this day' };
			}

			// Check operating hours
			const timeStr = format(startTime, 'HH:mm');
			const endTimeStr = format(endTime, 'HH:mm');

			if (timeStr < ctx.service.operatingStartTime || endTimeStr > ctx.service.operatingEndTime) {
				return {
					valid: false,
					reason: `Service operates between ${ctx.service.operatingStartTime} and ${ctx.service.operatingEndTime}`
				};
			}
		}

		// Check customer concurrent booking limit
		if (options?.customerEmail && ctx.service.maxConcurrentPerCustomer > 0) {
			const activeCount = resourceAdapter.getCustomerActiveBookingCount(
				serviceId,
				options.customerEmail,
				options.excludeBookingId
			);

			if (activeCount >= ctx.service.maxConcurrentPerCustomer) {
				return {
					valid: false,
					reason: `Maximum ${ctx.service.maxConcurrentPerCustomer} active booking(s) per customer`
				};
			}
		}

		// Check capacity and overlapping bookings
		if (ctx.service.capacity > 1) {
			// For class-type services, check exact time capacity
			const currentUsage = resourceAdapter.getServiceCapacityUsage(
				serviceId,
				startTime,
				endTime,
				options?.excludeBookingId
			);

			if (currentUsage >= ctx.service.capacity) {
				return { valid: false, reason: 'This time slot is fully booked' };
			}
		} else {
			// For appointment services (capacity=1), check for any overlapping bookings
			const hasOverlap = resourceAdapter.hasOverlappingBookings(
				serviceId,
				startTime,
				endTime,
				options?.excludeBookingId
			);

			if (hasOverlap) {
				return { valid: false, reason: 'This time slot is already booked' };
			}
		}

		// Check resource availability
		const resourceGroups = checkResourceAvailability(
			ctx,
			startTime,
			endTime,
			options?.excludeBookingId
		);

		if (resourceGroups === null) {
			return { valid: false, reason: 'Required resources are not available at this time' };
		}

		return { valid: true, availableResources: resourceGroups };
	},

	/**
	 * Get the next available slot from a given time
	 */
	getNextAvailableSlot(
		serviceId: string,
		fromTime: Date,
		options?: { durationMinutes?: number }
	): AvailableSlot | null {
		const ctx = loadServiceContext(serviceId);

		if (!ctx || !ctx.service.isActive) {
			return null;
		}

		const duration = options?.durationMinutes ?? ctx.service.durationMinutes;
		const maxAdvanceDate = addDays(new Date(), ctx.service.maxAdvanceDays);

		// Search up to max advance days
		const slots = this.getAvailableSlots(serviceId, fromTime, maxAdvanceDate, {
			durationMinutes: duration
		});

		return slots.length > 0 ? slots[0] : null;
	}
};
