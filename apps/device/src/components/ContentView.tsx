import type { Content } from "@signage/shared";

/** Menampilkan satu konten memenuhi layar. Pakai `key` agar animasi masuk berulang tiap konten baru. */
export function ContentView({ content }: { content: Content }) {
  switch (content.tipe) {
    case "text":
      return (
        <div className="fade-in flex h-full w-full items-center justify-center p-[6vmin]">
          <p className="max-w-[90%] whitespace-pre-wrap break-words text-center text-[clamp(2rem,7vmin,7rem)] font-semibold leading-tight text-white">
            {content.payload}
          </p>
        </div>
      );
    case "image":
      return (
        <img
          className="fade-in h-full w-full object-contain"
          src={content.payload}
          alt={content.judul}
        />
      );
    case "video":
      // Autoplay hanya diizinkan browser jika video dibisukan
      return (
        <video
          className="fade-in h-full w-full object-contain"
          src={content.payload}
          autoPlay
          muted
          loop
          playsInline
        />
      );
    case "url":
      // Banyak situs menolak ditampilkan di dalam iframe (X-Frame-Options); sandbox membatasi hak situs tersebut
      return (
        <iframe
          className="fade-in h-full w-full border-0 bg-white"
          src={content.payload}
          title={content.judul}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      );
  }
}
