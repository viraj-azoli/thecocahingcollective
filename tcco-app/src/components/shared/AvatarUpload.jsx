import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showToast } from './Toast';

/**
 * AvatarUpload — drop-in avatar photo uploader.
 *
 * Props:
 *   currentUrl  – existing public URL (or null)
 *   userId      – auth user ID used as folder name in the bucket
 *   size        – 'sm' | 'md' | 'lg' | 'xl'  (default 'xl')
 *   onUpload    – callback(publicUrl) after successful upload
 *   bucket      – storage bucket name (default 'avatars')
 */
export default function AvatarUpload({
  currentUrl,
  userId,
  size = 'xl',
  onUpload,
  bucket = 'avatars',
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const inputRef = useRef(null);

  React.useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const SIZES = { sm: 32, md: 48, lg: 64, xl: 96 };
  const px = SIZES[size] ?? 96;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Max file size is 5 MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      // Bust cache with timestamp
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      setPreview(bustedUrl);
      onUpload?.(bustedUrl);
      showToast('Photo updated!');
    } catch (err) {
      console.error('Avatar upload error:', err);
      setPreview(currentUrl || null);
      showToast('Upload failed — please try again', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload profile photo"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          background: preview ? 'transparent' : 'var(--primary)',
          backgroundImage: preview ? `url(${preview})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: px * 0.4,
          color: '#fff',
          fontWeight: 700,
          cursor: uploading ? 'wait' : 'pointer',
          border: '3px solid var(--gray-200)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'opacity 0.2s',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {!preview && '?'}
        {/* hover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
          fontSize: '22px',
        }}
          className="avatar-upload-overlay"
        >
          📷
        </div>
      </div>

      <button
        className="btn btn-outline"
        style={{ fontSize: '13px', padding: '6px 14px' }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        type="button"
      >
        {uploading ? 'Uploading…' : 'Change photo'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      <style>{`
        div[role="button"]:hover .avatar-upload-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
