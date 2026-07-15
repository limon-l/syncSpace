'use client';

import { useMemo } from 'react';
import { useMeetingStore } from '@/stores/meeting-store';

export function useMeetingPermissions() {
  const { participants, settings, currentUserId } = useMeetingStore();

  const currentParticipant = useMemo(
    () => participants.find((p) => p.userId === currentUserId),
    [participants, currentUserId],
  );

  const isHost = currentParticipant?.role === 'host';
  const isCoHost = currentParticipant?.role === 'co-host';
  const isHostOrCoHost = isHost || isCoHost;

  const canMuteSelf = isHost || isCoHost || settings.allowParticipantUnmute;
  const canUnmuteSelf = isHost || isCoHost || settings.allowParticipantUnmute;
  const canToggleCamera = isHost || isCoHost || settings.allowParticipantCam;
  const canMuteOthers = isHostOrCoHost;
  const canRemoveOthers = isHostOrCoHost;
  const canAdmitOthers = isHostOrCoHost;
  const canLockMeeting = isHost;
  const canEndMeeting = isHost;
  const canTransferHost = isHost;
  const canPromoteCohost = isHost;
  const canDemoteCohost = isHost;
  const canMuteAll = isHostOrCoHost;

  return {
    isHost,
    isCoHost,
    isHostOrCoHost,
    currentParticipant,
    canMuteSelf,
    canUnmuteSelf,
    canToggleCamera,
    canMuteOthers,
    canRemoveOthers,
    canAdmitOthers,
    canLockMeeting,
    canEndMeeting,
    canTransferHost,
    canPromoteCohost,
    canDemoteCohost,
    canMuteAll,
    settings,
  };
}
