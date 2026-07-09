import { AccessToken, type VideoGrant } from 'livekit-server-sdk';
import { config } from '../../lib/config.js';

export async function generateLiveKitToken(
  userId: string,
  displayName: string,
  roomName: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const apiKey = config.LIVEKIT_API_KEY;
  const apiSecret = config.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API credentials not configured');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: displayName,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    ttl: '5m',
  });

  const grant: VideoGrant = {
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  at.addGrant(grant);

  return at.toJwt();
}

export async function generateLiveKitTokenForScreenShare(
  userId: string,
  displayName: string,
  roomName: string,
): Promise<string> {
  const apiKey = config.LIVEKIT_API_KEY;
  const apiSecret = config.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API credentials not configured');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `${userId}_screen`,
    name: `${displayName} (Screen)`,
    ttl: '5m',
  });

  const grant: VideoGrant = {
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  at.addGrant(grant);

  return at.toJwt();
}
