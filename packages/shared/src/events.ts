export interface RawEvent {
  id: string;
  projectId: string;
  eventName: string;
  properties: Record<string, unknown>;
  timestamp: string;
  receivedAt: string;
}
