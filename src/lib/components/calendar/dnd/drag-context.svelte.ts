import { setContext, getContext } from 'svelte';
import type { DragData, EventInstance } from '$lib/types/calendar';
import { floorToNearestMinutes, addMinutes, differenceInMinutes } from '$lib/utils/date';

const DRAG_CONTEXT_KEY = Symbol('calendar-drag');

export interface DropPreview {
	date: Date;
	startTime: Date;
	endTime: Date;
	top: number; // percentage or pixel position
	height: number; // percentage or pixel position
}

export interface DragState {
	isDragging: boolean;
	dragData: DragData | null;
	draggedEvent: EventInstance | null;
	ghostPosition: { x: number; y: number } | null;
	dropTarget: { date: Date; time: Date } | null;
	dropPreview: DropPreview | null;
}

export class CalendarDragState {
	isDragging = $state(false);
	dragData = $state<DragData | null>(null);
	draggedEvent = $state<EventInstance | null>(null);
	ghostPosition = $state<{ x: number; y: number } | null>(null);
	dropTarget = $state<{ date: Date; time: Date } | null>(null);
	dropPreview = $state<DropPreview | null>(null);
	hourHeight = $state(60); // pixels per hour
	lastDragEndTime = $state(0); // Timestamp of when last drag ended

	// Conflict detection for real-time visual feedback
	hasConflict = $state(false);
	conflictMessage = $state<string | null>(null);

	startDrag(data: DragData, event?: EventInstance) {
		this.isDragging = true;
		this.dragData = data;
		this.draggedEvent = event || null;
	}

	// Check if a click should be suppressed (within 200ms of drag end)
	shouldSuppressClick(): boolean {
		return Date.now() - this.lastDragEndTime < 200;
	}

	updateGhostPosition(x: number, y: number) {
		this.ghostPosition = { x, y };
	}

	updateDropTarget(date: Date, time: Date) {
		this.dropTarget = { date, time };

		// Calculate drop preview
		if (this.draggedEvent && this.dragData?.type === 'move') {
			const snappedTime = floorToNearestMinutes(time, 15);
			const duration = differenceInMinutes(this.draggedEvent.endTime, this.draggedEvent.startTime);
			const endTime = addMinutes(snappedTime, duration);

			// Calculate position in pixels
			const startMinutes = snappedTime.getHours() * 60 + snappedTime.getMinutes();
			const top = (startMinutes / 60) * this.hourHeight;
			const height = (duration / 60) * this.hourHeight;

			this.dropPreview = {
				date,
				startTime: snappedTime,
				endTime,
				top,
				height
			};
		} else if (this.dragData?.type === 'resize-bottom' && this.draggedEvent) {
			const snappedTime = floorToNearestMinutes(time, 15);
			const startTime = this.draggedEvent.startTime;
			const duration = Math.max(15, differenceInMinutes(snappedTime, startTime));
			const endTime = addMinutes(startTime, duration);

			const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
			const top = (startMinutes / 60) * this.hourHeight;
			const height = (duration / 60) * this.hourHeight;

			this.dropPreview = {
				date,
				startTime,
				endTime,
				top,
				height
			};
		} else if (this.dragData?.type === 'resize-top' && this.draggedEvent) {
			const snappedTime = floorToNearestMinutes(time, 15);
			const endTime = this.draggedEvent.endTime;
			const duration = Math.max(15, differenceInMinutes(endTime, snappedTime));
			const startTime = addMinutes(endTime, -duration);

			const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
			const top = (startMinutes / 60) * this.hourHeight;
			const height = (duration / 60) * this.hourHeight;

			this.dropPreview = {
				date,
				startTime,
				endTime,
				top,
				height
			};
		}
	}

	setHourHeight(height: number) {
		this.hourHeight = height;
	}

	/**
	 * Set conflict status for real-time visual feedback during drag
	 */
	setConflictStatus(hasConflict: boolean, message: string | null = null) {
		this.hasConflict = hasConflict;
		this.conflictMessage = message;
	}

	endDrag() {
		this.isDragging = false;
		this.dragData = null;
		this.draggedEvent = null;
		this.ghostPosition = null;
		this.dropTarget = null;
		this.dropPreview = null;
		this.hasConflict = false;
		this.conflictMessage = null;
		this.lastDragEndTime = Date.now(); // Record when drag ended
	}

	reset() {
		this.endDrag();
	}
}

export function setDragContext(dragState: CalendarDragState) {
	setContext(DRAG_CONTEXT_KEY, dragState);
}

export function getDragContext(): CalendarDragState {
	return getContext<CalendarDragState>(DRAG_CONTEXT_KEY);
}

export function createDragState(): CalendarDragState {
	return new CalendarDragState();
}
