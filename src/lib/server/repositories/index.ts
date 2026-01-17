/**
 * Repository Re-exports
 *
 * This file re-exports repositories from the domain layer for backward compatibility.
 * New code should import directly from '$lib/server/domains' or specific domains.
 */

// Calendar domain repositories
export { calendarRepository, eventRepository } from '../domains/calendar';

// Resource domain repositories
export {
	resourceTypeRepository,
	resourceRepository,
	qualificationRepository
} from '../domains/resource';

// Booking domain repositories
export { serviceRepository, bookingRepository } from '../domains/booking';
