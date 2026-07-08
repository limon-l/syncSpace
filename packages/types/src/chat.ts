export interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'system';
  createdAt: string;
}

export interface SendMessageRequest {
  roomCode: string;
  content: string;
}
