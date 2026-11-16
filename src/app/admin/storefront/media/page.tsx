"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Film, ImagePlus, LoaderCircle, Save, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";

function promotionStoragePath(url: string, bucket: string): string | null {
  try { const parsed = new URL(url); const marker = `/storage/v1/object/public/${bucket}/`; const index = parsed.pathname.indexOf(marker); return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + marker.length)) : null; } catch { return null; }
}

type StorefrontConfig = Record<string, unknown> & {
  hero_video_url?: string;
  hero_video_fallback_url?: string;
};

export default function StorefrontMediaPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [config, setConfig] = useState<StorefrontConfig>({});
  const [videoUrl, setVideoUrl] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) {
        setError("Database connection is not configured.");
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in through the admin dashboard first.");
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("admin_profiles").select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (!profile?.is_active || !["owner", "marketing_manager"].includes(profile.role)) {
        setError("Only the owner or an authorised marketing manager can upload homepage media.");
        setLoading(false);
        return;
      }
      const { data, error: readError } = await supabase
        .from("site_settings").select("setting_value").eq("setting_key", "storefront_config").maybeSingle();
      if (!alive) return;
      if (readError) setError(readError.message);
      let saved: StorefrontConfig = {};
      try {
        if (data?.setting_value) saved = JSON.parse(data.setting_value) as StorefrontConfig;
      } catch {
        setError("The saved storefront settings could not be read.");
      }
      setConfig(saved);
      setVideoUrl(typeof saved.hero_video_url === "string" ? saved.hero_video_url : "");
      setFallbackUrl(typeof saved.hero_video_fallback_url === "string" ? saved.hero_video_fallback_url : "");
      setAuthorized(true);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function generateMobilePoster(file: File): Promise<Blob | null> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("The uploaded MP4 could not be previewed for its mobile fallback."));
      });
      const targetTime = Math.min(1, Math.max(0, (video.duration || 1) * 0.15));
      if (targetTime > 0) {
        await new Promise<void>((resolve, reject) => {
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error("Could not capture a frame for the mobile fallback."));
          video.currentTime = targetTime;
        });
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context || !canvas.width || !canvas.height) return null;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function upload(file: File | undefined, kind: "video" | "image") {
    if (!supabase || !file) return;
    const isVideo = kind === "video";
    if (isVideo && (file.type !== "video/mp4" || file.size > 100 * 1024 * 1024)) {
      setError("Choose an MP4 video no larger than 100 MB.");
      return;
    }
    if (!isVideo && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Choose a JPG, PNG or WebP fallback image no larger than 5 MB.");
      return;
    }
    setError("");
    setMessage("");
    isVideo ? setUploadingVideo(true) : setUploadingImage(true);
    const extension = isVideo ? "mp4" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `homepage/${isVideo ? "brand-commercial" : "mobile-fallback"}-${Date.now()}.${extension}`;
    const { data, error: uploadError } = await supabase.storage
      .from("promotion-media")
      .upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data: publicData } = supabase.storage.from("promotion-media").getPublicUrl(data.path);
      if (isVideo) {
        setVideoUrl(publicData.publicUrl);
        try {
          const poster = await generateMobilePoster(file);
          if (poster) {
            const posterPath = `homepage/mobile-fallback-${Date.now()}.jpg`;
            const { data: posterData, error: posterError } = await supabase.storage
              .from("promotion-media")
              .upload(posterPath, poster, { upsert: false, contentType: "image/jpeg", cacheControl: "3600" });
            if (!posterError) {
              const { data: posterPublic } = supabase.storage.from("promotion-media").getPublicUrl(posterData.path);
              setFallbackUrl(posterPublic.publicUrl);
              setMessage("Video uploaded and a mobile fallback image was generated automatically. Select Save homepage media to publish.");
            } else {
              setMessage("Video uploaded. The mobile fallback could not be saved; you can upload a separate image below.");
            }
          } else {
            setMessage("Video uploaded. Add a mobile fallback image below, then select Save homepage media.");
          }
        } catch {
          setMessage("Video uploaded. Add a mobile fallback image below, then select Save homepage media.");
        }
      } else {
        setFallbackUrl(publicData.publicUrl);
        setMessage("Mobile fallback uploaded. Select Save homepage media to publish.");
      }
    }
    isVideo ? setUploadingVideo(false) : setUploadingImage(false);
  }

  async function save() {
    if (!supabase || !authorized) return;
    setSaving(true);
    setError("");
    setMessage("");
    const next: StorefrontConfig = {
      ...config,
      hero_video_url: videoUrl.trim(),
      hero_video_fallback_url: fallbackUrl.trim()
    };
    const { error: saveError } = await supabase.from("site_settings").upsert({
      setting_key: "storefront_config",
      setting_value: JSON.stringify(next),
      updated_at: new Date().toISOString()
    }, { onConflict: "setting_key" });
    if (saveError) setError(saveError.message);
    else {
      setConfig(next);
      setMessage("Homepage media settings saved. Refresh the storefront to view the brand film.");
    }
    setSaving(false);
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f7f1] text-sm text-[#42694b]"><LoaderCircle className="mr-2 animate-spin" />Loading homepage media settings…</main>;
  }

  if (!authorized) {
    return <main className="min-h-screen bg-[#f4f7f1] p-6"><div className="mx-auto max-w-lg rounded-2xl bg-white p-7"><h1 className="text-xl font-bold">Homepage media access</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin" className="mt-5 inline-flex text-sm font-bold text-[#315b43]">Back to admin</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f7f1] px-4 py-8 text-[#26392c] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/storefront" className="inline-flex items-center gap-2 text-xs font-bold text-[#65806a]"><ArrowLeft size={14} /> Storefront editor</Link>
        <div className="mt-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#8b9986]">Homepage media</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1c3c29]">Brand commercial video</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7d897a]">Upload the eCuisinefoods MP4 commercial for the homepage hero. It will play muted, loop continuously and use the fallback image on small screens.</p>
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p>}

        <section className="mt-7 rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e9f3e6] text-[#087f5b]"><Film size={21} /></span><div><h2 className="font-bold">Homepage brand video</h2><p className="mt-1 text-xs text-[#7d897a]">MP4 · up to 100 MB · muted autoplay and looping</p></div></div>
          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#cbdcc8] bg-[#f8fbf6] px-5 py-8 text-center transition hover:bg-[#f0f7ec]">
            {uploadingVideo ? <LoaderCircle className="animate-spin text-[#087f5b]" size={25} /> : <UploadCloud className="text-[#087f5b]" size={27} />}
            <span className="mt-3 text-sm font-bold text-[#315b43]">{uploadingVideo ? "Uploading video…" : "Choose the eCuisinefoods MP4 video"}</span>
            <span className="mt-1 text-[11px] text-[#8a9689]">The uploaded video is stored in the public promotion-media bucket.</span>
            <input type="file" accept="video/mp4,.mp4" disabled={uploadingVideo} onChange={(event: ChangeEvent<HTMLInputElement>) => void upload(event.target.files?.[0], "video")} className="sr-only" />
          </label>
          <label className="mt-5 block text-xs font-bold text-[#405443]">Video URL
            <input type="url" value={videoUrl} onChange={event => setVideoUrl(event.target.value)} placeholder="Upload an MP4 or paste its public URL" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#4c805b]" />
          </label>
          {videoUrl && <div className="mt-4 overflow-hidden rounded-xl border border-[#e4e9e1] bg-[#102f22]"><video src={videoUrl} muted controls playsInline className="max-h-72 w-full object-contain" /><div className="flex items-center justify-between gap-3 px-3 py-2"><p className="flex items-center gap-2 text-[10px] font-semibold text-white"><CheckCircle2 size={13} /> Video ready to publish</p><button type="button" onClick={()=>{setVideoUrl("");setMessage("Video removal is pending. Save homepage media to confirm.");}} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[10px] font-bold text-white hover:bg-red-500/80"><Trash2 size={12}/> Remove video</button></div></div>}
        </section>

        <section className="mt-5 rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff4d3] text-[#9a7014]"><ImagePlus size={21} /></span><div><h2 className="font-bold">Mobile fallback image</h2><p className="mt-1 text-xs text-[#7d897a]">JPG, PNG or WebP · up to 5 MB</p></div></div>
          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e8dba9] bg-[#fffdf5] px-5 py-7 text-center transition hover:bg-[#fff8df]">
            {uploadingImage ? <LoaderCircle className="animate-spin text-[#987019]" size={25} /> : <ImagePlus className="text-[#987019]" size={27} />}
            <span className="mt-3 text-sm font-bold text-[#725719]">{uploadingImage ? "Uploading image…" : "Choose a mobile fallback image"}</span>
            <span className="mt-1 text-[11px] text-[#8a9689]">A still frame is generated from the MP4 automatically; you can replace it with a different image here.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} onChange={(event: ChangeEvent<HTMLInputElement>) => void upload(event.target.files?.[0], "image")} className="sr-only" />
          </label>
          <label className="mt-5 block text-xs font-bold text-[#405443]">Fallback image URL
            <input type="url" value={fallbackUrl} onChange={event => setFallbackUrl(event.target.value)} placeholder="Upload an image or paste its public URL" className="mt-2 w-full rounded-xl border border-[#dfe6dc] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#4c805b]" />
          </label>
          {fallbackUrl && <div className="mt-4 rounded-xl border border-[#e4e9e1] bg-[#f8faf6] p-3"><img src={fallbackUrl} alt="Homepage mobile fallback preview" className="max-h-64 w-full object-contain"/><button type="button" onClick={()=>{setFallbackUrl("");setMessage("Fallback image removal is pending. Save homepage media to confirm.");}} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-[10px] font-bold text-red-700 hover:bg-red-50"><Trash2 size={12}/> Remove fallback image</button></div>}
        </section>

        <div className="sticky bottom-3 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e9e1] bg-white/95 p-3 shadow-xl backdrop-blur">
          <p className="max-w-md text-[10px] leading-5 text-[#879184]">Uploading stores the file. Save publishes its URL to the homepage configuration.</p>
          <button type="button" disabled={saving || uploadingVideo || uploadingImage} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#087f5b] px-6 py-3 text-xs font-bold text-white disabled:opacity-60"><Save size={15} />{saving ? "Saving…" : "Save homepage media"}</button>
        </div>
      </div>
    </main>
  );
}
