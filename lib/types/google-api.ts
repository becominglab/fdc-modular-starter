// Google Calendar API 型定義

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  created?: string;
  updated?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
}

export interface GoogleCalendarListResponse {
  kind: 'calendar#calendarList';
  items: GoogleCalendar[];
  nextPageToken?: string;
}

export interface GoogleCalendarEventsResponse {
  kind: 'calendar#events';
  summary: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  timeZone?: string;
}

// Google Tasks API 型定義

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
  selfLink?: string;
  updated?: string;
}

export interface GoogleTaskListsResponse {
  kind: 'tasks#taskLists';
  items: GoogleTaskList[];
  nextPageToken?: string;
}

export interface GoogleTasksResponse {
  kind: 'tasks#tasks';
  items: GoogleTask[];
  nextPageToken?: string;
}
