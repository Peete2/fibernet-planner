import { useEffect, useState } from "react";
import { FileText, Loader2, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  bucket?: string;
  path: string;
  label: string;
  size?: "sm" | "md";
}

const isImageExt = (p: string) => /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(p);
const isPdfExt = (p: string) => /\.pdf$/i.test(p);

export default function DocumentPreview({ bucket = "fwa-documents", path, label, size = "sm" }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase.storage.from(bucket).createSignedUrl(path, 600).then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data?.signedUrl) { setErrored(true); setLoading(false); return; }
      setUrl(data.signedUrl);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [bucket, path]);

  const dim = size === "sm" ? "h-10 w-10" : "h-16 w-16";
  const isImg = isImageExt(path);
  const isPdf = isPdfExt(path);

  return (
    <>
      <button
        type="button"
        onClick={() => url && setOpen(true)}
        title={`Preview ${label}`}
        className={`${dim} shrink-0 rounded-md border border-border bg-muted/40 overflow-hidden flex items-center justify-center hover:border-primary/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        disabled={!url}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : errored || !url ? (
          <ImageOff className="w-4 h-4 text-muted-foreground" />
        ) : isImg ? (
          <img src={url} alt={label} className="w-full h-full object-cover" onError={() => setErrored(true)} />
        ) : (
          <FileText className="w-5 h-5 text-primary" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          {url && isImg && (
            <img src={url} alt={label} className="w-full max-h-[70vh] object-contain rounded-md border border-border" />
          )}
          {url && isPdf && (
            <iframe src={url} title={label} className="w-full h-[70vh] rounded-md border border-border" />
          )}
          {url && !isImg && !isPdf && (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              Preview not available for this file type. Use the download button to view it.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}