import { useRef, useState } from 'react';
import { UploadCloud, ImageOff } from 'lucide-react';

interface ImageUploadProps {
  label?: string;
  required?: boolean;
  currentImageUrl?: string | null;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

// Drag-drop + click-to-browse image picker with a live preview. First upload
// component in this codebase — no existing pattern to reuse, so kept minimal
// and Tailwind-styled to match Table.tsx/Dropdown.tsx conventions.
export default function ImageUpload({ label = 'Image', required, currentImageUrl, onFileSelect, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelect(file);
  };

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-3 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200 shrink-0" />
        ) : (
          <div className="h-16 w-16 flex items-center justify-center rounded-lg bg-slate-100 text-slate-300 shrink-0">
            <ImageOff size={20} />
          </div>
        )}
        <div className="text-sm text-slate-500 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <UploadCloud size={15} />
            Click or drag to upload
          </div>
          <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG, WEBP or GIF, up to 5MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
