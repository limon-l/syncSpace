'use client';

import { memo, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorDown,
  Hand, MessageCircle, Users, LogOut, Lock, Unlock,
  MoreVertical, Settings, Maximize, Minimize, Grid3x3, LayoutGrid,
  Circle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMeetingStore } from '@/stores/meeting-store';
import { useMeetingPermissions } from '@/hooks/use-meeting-permissions';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { getSocket } from '@/lib/socket';

interface MeetingToolbarProps {
  roomCode: string;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  screenSharing: boolean;
}

export const MeetingToolbar = memo(function MeetingToolbar({
  roomCode,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onLeave,
  screenSharing,
}: MeetingToolbarProps) {
  const {
    localMicOn, localCamOn, localHandRaised, sidePanel, isLocked,
    viewMode, participants, waitingParticipants,
    setSidePanel, setViewMode,
  } = useMeetingStore();

  const { isHostOrCoHost, canLockMeeting, canEndMeeting } = useMeetingPermissions();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const socket = getSocket();

  const toggleHand = useCallback(() => {
    const store = useMeetingStore.getState();
    const next = !store.localHandRaised;
    store.setLocalHandRaised(next);
    socket.emit(next ? 'hand:raise' : 'hand:lower', { roomCode });
  }, [roomCode, socket]);

  const toggleLock = useCallback(() => {
    const store = useMeetingStore.getState();
    if (store.isLocked) {
      socket.emit('meeting:unlock', { roomCode });
    } else {
      socket.emit('meeting:lock', { roomCode });
    }
  }, [roomCode, socket]);

  const endMeeting = useCallback(() => {
    if (!confirm('End meeting for everyone?')) return;
    socket.emit('meeting:end', { roomCode });
  }, [roomCode, socket]);

  const muteAll = useCallback(() => {
    socket.emit('meeting:mute-all', { roomCode });
  }, [roomCode, socket]);

  const btnClass = (active: boolean, danger = false) =>
    `relative rounded-full p-2.5 sm:p-3 transition-all ${
      danger
        ? 'bg-danger text-white hover:bg-danger/80'
        : active
        ? 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
        : 'bg-danger text-white hover:bg-danger/80'
    }`;

  const panelBtnClass = (panel: string) =>
    `relative rounded-full p-2.5 sm:p-3 transition-all ${
      sidePanel === panel
        ? 'bg-primary text-white'
        : 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80'
    }`;

  return (
    <div className="flex items-center justify-between border-t border-border bg-bg-surface/80 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button onClick={onToggleMic} className={btnClass(localMicOn)} title={localMicOn ? 'Mute' : 'Unmute'}>
          {localMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          {!localMicOn && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-danger animate-pulse" />}
        </button>

        <button onClick={onToggleCam} className={btnClass(localCamOn)} title={localCamOn ? 'Camera off' : 'Camera on'}>
          {localCamOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        <button onClick={onToggleScreenShare} className={btnClass(screenSharing)} title={screenSharing ? 'Stop sharing' : 'Share screen'}>
          {screenSharing ? <MonitorDown size={18} /> : <MonitorUp size={18} />}
        </button>

        <div className="w-px h-7 bg-border mx-0.5 sm:mx-1" />

        <button onClick={toggleHand} className={btnClass(localHandRaised)} title={localHandRaised ? 'Lower hand' : 'Raise hand'}>
          <Hand size={18} />
          {localHandRaised && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-warning"
            />
          )}
        </button>

        {isHostOrCoHost && (
          <button onClick={muteAll} className="rounded-full p-2.5 sm:p-3 bg-bg-elevated text-text-primary hover:bg-warning/20 hover:text-warning transition-all" title="Mute all participants">
            <MicOff size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button onClick={() => setSidePanel(sidePanel === 'people' ? null : 'people')} className={panelBtnClass('people')} title="Participants">
          <Users size={18} />
          {waitingParticipants.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-warning text-[10px] font-bold text-white flex items-center justify-center px-1">
              {waitingParticipants.length}
            </span>
          )}
        </button>

        <button onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')} className={panelBtnClass('chat')} title="Chat">
          <MessageCircle size={18} />
        </button>

        <button onClick={() => setSidePanel(sidePanel === 'files' ? null : 'files')} className={panelBtnClass('files')} title="Files">
          <span className="text-sm">📎</span>
        </button>

        {isHostOrCoHost && (
          <button onClick={() => setSidePanel(sidePanel === 'settings' ? null : 'settings')} className={panelBtnClass('settings')} title="Meeting settings">
            <Settings size={18} />
          </button>
        )}

        <div className="w-px h-7 bg-border mx-0.5 sm:mx-1" />

        <button
          onClick={() => setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery')}
          className="rounded-full p-2.5 sm:p-3 bg-bg-elevated text-text-primary hover:bg-bg-elevated/80 transition-all"
          title={viewMode === 'gallery' ? 'Speaker view' : 'Gallery view'}
        >
          {viewMode === 'gallery' ? <LayoutGrid size={18} /> : <Grid3x3 size={18} />}
        </button>

        <button onClick={toggleFullscreen} className="rounded-full p-2.5 sm:p-3 bg-bg-elevated text-text-primary hover:bg-bg-elevated/80 transition-all" title="Fullscreen">
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        {isHostOrCoHost && canLockMeeting && (
          <button onClick={toggleLock} className="rounded-full p-2.5 sm:p-3 bg-bg-elevated text-warning hover:bg-warning/10 transition-all" title={isLocked ? 'Unlock' : 'Lock'}>
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
        )}

        <div className="w-px h-7 bg-border mx-0.5 sm:mx-1" />

        {canEndMeeting ? (
          <button onClick={endMeeting} className="rounded-full bg-danger/20 p-2.5 sm:p-3 text-danger hover:bg-danger/30 transition-all" title="End meeting">
            <LogOut size={18} />
          </button>
        ) : (
          <button onClick={onLeave} className="rounded-full bg-danger/20 p-2.5 sm:p-3 text-danger hover:bg-danger/30 transition-all" title="Leave meeting">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );
});
