import { type FormEvent, useState, useRef } from "react";
import { UPLOAD_MIME_TYPES, type Content } from "@signage/shared";
import {
  ErrorText,
  Field,
  Modal,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "../components/ui";
import { api } from "../lib/api";
import {
  UploadCloud,
  FileText,
  Globe,
  Image,
  Film,
  CheckCircle2,
  X,
} from "lucide-react";

type Mode = "upload" | "text" | "url" | "image" | "video";

const MODES: { value: Mode; label: string; icon: typeof FileText }[] = [
  { value: "upload", label: "Upload File", icon: UploadCloud },
  { value: "text", label: "Text Slide", icon: FileText },
  { value: "url", label: "Web Page", icon: Globe },
  { value: "image", label: "Image URL", icon: Image },
  { value: "video", label: "Video URL", icon: Film },
];

const ACCEPT = Object.keys(UPLOAD_MIME_TYPES).join(",");
const MAX_MB = 50;

export function AddContentModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (content: Content) => void;
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [judul, setJudul] = useState("");
  const [payload, setPayload] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(picked: File | null) {
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!(picked.type in UPLOAD_MIME_TYPES)) {
      setFile(null);
      setError("Unsupported file format. Please upload JPG, PNG, WebP, GIF, MP4, or WebM.");
      return;
    }
    if (picked.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`File exceeds the maximum size limit of ${MAX_MB} MB.`);
      return;
    }
    setFile(picked);
    if (!judul.trim()) {
      // Auto-populate title with friendly filename without extension
      const cleanName = picked.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setJudul(cleanName);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved =
        mode === "upload"
          ? await api.contents.upload(file as File, judul)
          : await api.contents.create({
              judul: judul.trim(),
              tipe: mode,
              payload: payload.trim(),
            });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  const ready =
    mode === "upload"
      ? file !== null
      : judul.trim() !== "" && payload.trim() !== "";

  return (
    <Modal title="Add Media Asset" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        {/* Visual Mode Selector */}
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-300">
            Content Type
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setMode(m.value);
                    setPayload("");
                    setFile(null);
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-600/20 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                      : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? "text-blue-400" : "text-zinc-400"}`} />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title Input */}
        <Field
          label="Title"
          hint={
            mode === "upload"
              ? "Optional label for dashboard identification"
              : "Descriptive label for this media item"
          }
        >
          <input
            className={inputClass}
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="e.g. Summer Promo 2026 / Office Schedule"
            maxLength={200}
            autoFocus
          />
        </Field>

        {/* Upload Mode: Drag and Drop Box */}
        {mode === "upload" && (
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
              File Attachment
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                    : "border-white/10 bg-zinc-950/60 hover:border-blue-500/40 hover:bg-white/[0.02]"
                }`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-blue-400 mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-zinc-100">
                  Click to select a file or drag and drop here
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Supported: JPG, PNG, WebP, GIF, MP4, WebM (Max {MAX_MB} MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Text Mode */}
        {mode === "text" && (
          <Field label="Text Announcement" hint={`${payload.length} / 2000 characters`}>
            <textarea
              className={`${inputClass} resize-y font-sans`}
              rows={5}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Type announcement message to display on screens…"
              maxLength={2000}
            />
          </Field>
        )}

        {/* URL Modes (web, image url, video url) */}
        {(mode === "url" || mode === "image" || mode === "video") && (
          <Field
            label={`${mode.toUpperCase()} Address`}
            hint="Must be an accessible URL starting with http:// or https://"
          >
            <input
              className={inputClass}
              type="url"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="https://cdn.example.com/media.mp4"
            />
          </Field>
        )}

        <ErrorText message={error} />

        <div className="flex justify-end gap-2 border-t border-zinc-800/80 pt-4">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={btnPrimary}
            disabled={saving || !ready}
          >
            {saving
              ? mode === "upload"
                ? "Uploading to Storage…"
                : "Saving…"
              : "Save to Media Library"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

