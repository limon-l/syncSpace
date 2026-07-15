'use client';

import { memo, useCallback, useEffect } from 'react';
import { X, Monitor, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDeviceStore } from '@/stores/device-store';
import { useMeetingStore } from '@/stores/meeting-store';
import { useMeetingPermissions } from '@/hooks/use-meeting-permissions';
import { getSocket } from '@/lib/socket';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  roomCode: string;
}

export const SettingsModal = memo(function SettingsModal({ open, onClose, roomCode }: SettingsModalProps) {
  const {
    audioInputDevices, videoInputDevices, audioOutputDevices,
    selectedAudioInput, selectedVideoInput, selectedAudioOutput,
    setSelectedAudioInput, setSelectedVideoInput, setSelectedAudioOutput,
    enumerateDevices,
  } = useDeviceStore();

  const { settings } = useMeetingStore();
  const perms = useMeetingPermissions();
  const socket = getSocket();

  useEffect(() => {
    if (open) enumerateDevices();
  }, [open, enumerateDevices]);

  const updateSettings = useCallback((partial: Partial<typeof settings>) => {
    socket.emit('meeting:settings-change', { roomCode, ...partial });
  }, [roomCode, socket]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-4 bg-bg-surface border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-text-primary">Settings</h2>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-bg-elevated transition-colors text-text-secondary">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              <section>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Audio Devices</h3>
                <label className="block">
                  <span className="text-xs text-text-secondary mb-1 block">Microphone</span>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                  >
                    {audioInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                    {audioInputDevices.length === 0 && <option value="default">Default</option>}
                  </select>
                </label>
                <label className="block mt-2">
                  <span className="text-xs text-text-secondary mb-1 block">Speaker</span>
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => setSelectedAudioOutput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                  >
                    {audioOutputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                    {audioOutputDevices.length === 0 && <option value="default">Default</option>}
                  </select>
                </label>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Video Devices</h3>
                <label className="block">
                  <span className="text-xs text-text-secondary mb-1 block">Camera</span>
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => setSelectedVideoInput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                  >
                    {videoInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                    {videoInputDevices.length === 0 && <option value="default">Default</option>}
                  </select>
                </label>
              </section>

              {perms.isHostOrCoHost && (
                <section>
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Meeting Settings</h3>
                  <div className="space-y-3">
                    <Toggle label="Waiting room" checked={settings.waitingRoom} onChange={(v) => updateSettings({ waitingRoom: v })} />
                    <Toggle label="Mute on join" checked={settings.muteOnJoin} onChange={(v) => updateSettings({ muteOnJoin: v })} />
                    <Toggle label="Camera off on join" checked={settings.cameraOffOnJoin} onChange={(v) => updateSettings({ cameraOffOnJoin: v })} />
                    <Toggle label="Allow participants to unmute" checked={settings.allowParticipantUnmute} onChange={(v) => updateSettings({ allowParticipantUnmute: v })} />
                    <Toggle label="Allow participants to use camera" checked={settings.allowParticipantCam} onChange={(v) => updateSettings({ allowParticipantCam: v })} />
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-text-primary">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-bg-elevated'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </div>
    </label>
  );
}
