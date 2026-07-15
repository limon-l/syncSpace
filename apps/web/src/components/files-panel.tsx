'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, File, Download, Trash2, Loader2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface SharedFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
}

interface Props {
  roomCode: string;
  userId: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesPanel({ roomCode, userId }: Props) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${roomCode}/files`, {
        credentials: 'include',
      });
      if (res.ok) setFiles(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    fetchFiles();
    const socket = getSocket();
    const handler = () => fetchFiles();
    socket.on('file:shared', handler);
    return () => { socket.off('file:shared', handler); };
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/meetings/${roomCode}/files`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (res.ok) {
        const newFile = await res.json();
        setFiles((prev) => [newFile, ...prev]);
      }
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${roomCode}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      /* ignore */
    }
  };

  const handleDownload = async (file: SharedFile) => {
    const res = await fetch(`${API_BASE}/api/meetings/${roomCode}/files/${file.id}`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border flex-shrink-0">
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-xs text-text-secondary hover:text-text-primary">
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? 'Uploading...' : 'Upload file'}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Loader2 size={20} className="animate-spin text-text-secondary" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-text-secondary text-center pt-8">No files shared yet</p>
        ) : (
          files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-bg-elevated transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <File size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{f.fileName}</p>
                <p className="text-xs text-text-secondary">
                  {formatSize(f.fileSize)} · {f.uploaderName}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownload(f)}
                  className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-surface opacity-0 group-hover:opacity-100 transition-all"
                  title="Download"
                >
                  <Download size={14} />
                </button>
                {f.uploadedBy === userId && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="rounded-lg p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
