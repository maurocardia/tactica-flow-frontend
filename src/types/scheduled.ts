export type ScheduleScope = 'este' | 'otro';

export interface ScheduledMessage {
  id: string;
  contactName: string;
  scope: ScheduleScope;
  text: string;
  datetimeLabel: string;
  recurrenceLabel: string;
  active: boolean;
}

export interface Sequence {
  id: string;
  contactName: string;
  scope: ScheduleScope;
  name: string;
  stepsCount: number;
  active: boolean;
}
