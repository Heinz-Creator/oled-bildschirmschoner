import {EVENT_NAMES} from './events.js';
export function previewEvents(value){return [...new Set(Array.isArray(value)?value:[])].filter(key=>Object.hasOwn(EVENT_NAMES,key));}
export function applyPreviewEvents(schedule,events,now){for(const event of previewEvents(events))schedule.set(event,true,now);}
