import { Meeting } from '../../models/meeting.model.js';
import { Message } from '../../models/message.model.js';
import { NotFoundError } from '../../lib/errors.js';

export async function getMessages(roomCode: string, userId: string, page = 1, limit = 50) {
  const meeting = await Meeting.findOne({ roomCode });
  if (!meeting) throw new NotFoundError('Meeting');

  const isMember = meeting.participantIds.some((id) => id.toString() === userId) ||
    meeting.hostId.toString() === userId;

  if (!isMember) {
    throw new NotFoundError('Meeting');
  }

  const messages = await Message.find({ meetingId: meeting._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return messages
    .map((m) => ({
      id: m._id.toString(),
      meetingId: m.meetingId.toString(),
      senderId: m.senderId.toString(),
      senderName: m.senderName,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt.toISOString(),
    }))
    .reverse();
}
