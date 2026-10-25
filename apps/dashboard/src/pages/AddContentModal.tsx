import { type FormEvent, useState } from "react";
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

type Mode = "text" | "url" | "image" | "video" | "upload";

const MODES: { value: Mode; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "url", label: "Web page (URL)" },
  { value: "image", label: "Image (URL)" },
  { value: "video", label: "Video (URL)" },
  { value: "upload", label: "Upload image / video file" },
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
  const [mode, setMode] = useState<Mode>("text");
  const [judul, setJudul] = useState("");
  const [payload, setPayload] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(picked: File | null) {
    setError(null);
    if (picked && !(picked.type in UPLOAD_MIME_TYPES)) {
      setFile(null);
      setError("Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, or WebM.");
      return;
    }
    if (picked && picked.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`File is too large (max ${MAX_MB} MB).`);
      return;
    }
    setFile(picked);
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
    <Modal title="Add content" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Type">
          <select
            className={inputClass}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setPayload("");
              setFile(null);
              setError(null);
            }}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Title"
          hint={
            mode === "upload"
              ? "Optional, defaults to the file name"
              : undefined
          }
        >
          <input
            className={inputClass}
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Welcome banner"
            maxLength={200}
            autoFocus
          />
        </Field>

        {mode === "text" && (
          <Field label="Text to display" hint={`${payload.length}/2000`}>
            <textarea
              className={`${inputClass} resize-y`}
              rows={4}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              maxLength={2000}
            />
          </Field>
        )}
        {(mode === "url" || mode === "image" || mode === "video") && (
          <Field label="URL" hint="Must start with http:// or https://">
            <input
              className={inputClass}
              type="url"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="https://example.com/file"
            />
          </Field>
        )}
        {mode === "upload" && (
          <Field
            label="File"
            hint={`JPG, PNG, WebP, GIF, MP4 or WebM. Max ${MAX_MB} MB.`}
          >
            <input
              className={`${inputClass} cursor-pointer p-1.5 text-zinc-600 file:mr-3 file:cursor-pointer file:rounded file:border file:border-zinc-300 file:bg-zinc-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-100`}
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        )}

        <ErrorText message={error} />
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
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
                ? "Uploading…"
                : "Saving…"
              : "Add content"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
