import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Crop,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  PhotoLayoutPreset,
  ReportImageItem,
} from '../types/directionReport';

interface DirectionReportImageBlockProps {
  images: ReportImageItem[];
  layoutPreset: PhotoLayoutPreset;
  isPrintMode?: boolean;
  selectedImageId?: string | null;
  onSelectImage?: (id: string | null) => void;
  onChangeImages: (nextImages: ReportImageItem[]) => void;
  onChangeLayoutPreset?: (preset: PhotoLayoutPreset) => void;
  compactMode?: boolean;
}

export const PHOTO_LAYOUT_OPTIONS: Array<{
  id: PhotoLayoutPreset;
  label: string;
  description: string;
}> = [
  { id: 'single_large', label: '1 Fotografía Protagonista', description: 'Imagen destacada con pie de foto ejecutivo' },
  { id: 'two_comparative', label: '2 Fotografías Comparativas', description: 'Dos evidencias lado a lado (ej. Antes / Después o Jujuy / Salta)' },
  { id: 'four_grid', label: 'Grilla de 4 Evidencias', description: 'Cuatro registros visuales equilibrados en grilla 2×2' },
  { id: 'side_analysis', label: 'Imagen con Análisis Lateral', description: 'Fotografía a la izquierda y bloque de análisis detallado a la derecha' },
  { id: 'screenshot_comment', label: 'Captura Oficial con Comentario', description: 'Preserva proporción completa de capturas de pantalla sin recortar bordes' },
];

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });
}

export const DirectionReportImageBlock: React.FC<DirectionReportImageBlockProps> = ({
  images,
  layoutPreset,
  isPrintMode = false,
  selectedImageId = null,
  onSelectImage,
  onChangeImages,
  compactMode = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type) ||
      /\.(jpe?g|png|webp)$/i.test(f.name)
    );
    if (files.length === 0) return;

    const newItems: ReportImageItem[] = [];
    for (const file of files) {
      const dataUrl = await readFileAsDataUrl(file);
      newItems.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        src: dataUrl,
        originalName: file.name,
        title: file.name.replace(/\.[^.]+$/, ''),
        caption: 'Evidencia registrada para el período evaluado.',
        analysisText: '',
        branchTag: 'GENERAL',
        crop: {
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          fitMode: layoutPreset === 'screenshot_comment' ? 'contain' : 'cover',
        },
        alignment: 'center',
        showBorder: true,
        widthPercent: 100,
      });
    }

    const updated = [...images, ...newItems];
    onChangeImages(updated);
    if (newItems[0] && onSelectImage) {
      onSelectImage(newItems[0].id);
    }
  };

  const handleReplaceFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingId) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChangeImages(
      images.map(img =>
        img.id === replacingId
          ? { ...img, src: dataUrl, originalName: file.name }
          : img
      )
    );
    setReplacingId(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handlePaste = async (event: React.ClipboardEvent) => {
    if (isPrintMode) return;
    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems) return;
    const files: File[] = [];
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      event.preventDefault();
      await addFiles(files);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    if (isPrintMode) return;
    event.preventDefault();
    setIsDraggingOver(false);
    if (event.dataTransfer?.files?.length) {
      await addFiles(event.dataTransfer.files);
    }
  };

  const updateImage = (id: string, patch: Partial<ReportImageItem>) => {
    onChangeImages(images.map(img => (img.id === id ? { ...img, ...patch } : img)));
  };

  const removeImage = (id: string) => {
    onChangeImages(images.filter(img => img.id !== id));
    if (selectedImageId === id && onSelectImage) onSelectImage(null);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    onChangeImages(copy);
  };

  // Determine grid classes from preset
  const gridClass =
    layoutPreset === 'single_large' || layoutPreset === 'side_analysis' || layoutPreset === 'screenshot_comment'
      ? 'grid-cols-1'
      : layoutPreset === 'four_grid'
        ? 'grid-cols-2'
        : 'grid-cols-2';

  const maxSlots =
    layoutPreset === 'single_large' || layoutPreset === 'side_analysis' || layoutPreset === 'screenshot_comment'
      ? 1
      : layoutPreset === 'two_comparative'
        ? 2
        : 4;

  const visibleImages = images.slice(0, maxSlots);

  return (
    <div
      onPaste={handlePaste}
      onDragOver={e => {
        if (!isPrintMode) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      tabIndex={isPrintMode ? -1 : 0}
      className={`relative flex flex-col h-full outline-none transition ${
        isDraggingOver ? 'ring-2 ring-[#0072CE] bg-sky-50/40 rounded-xl' : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={e => e.target.files && void addFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleReplaceFile}
        className="hidden"
      />

      {visibleImages.length === 0 ? (
        !isPrintMode ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-[#F5F7FA] cursor-pointer transition hover:border-[#0072CE] hover:bg-sky-50/30 ${
              compactMode ? 'p-4 min-h-[120px]' : 'p-8 min-h-[240px]'
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0072CE] shadow-sm">
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs font-extrabold text-[#001E50]">
              Subir fotografía, arrastrar archivo o pegar captura con Ctrl+V
            </p>
            <p className="mt-1 text-[11px] text-[#5A6A85]">
              Formatos compatibles: JPG, PNG, WebP · Se preserva la resolución y proporción original
            </p>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-[#F5F7FA] p-6 text-xs text-[#5A6A85]">
            Sin registro fotográfico adjunto en este bloque.
          </div>
        )
      ) : (
        <div className={`grid ${gridClass} gap-4 flex-1 min-h-0`}>
          {visibleImages.map((img, idx) => {
            const isSelected = selectedImageId === img.id && !isPrintMode;
            const isCropping = croppingImageId === img.id && !isPrintMode;
            const alignClass =
              img.alignment === 'left'
                ? 'mr-auto'
                : img.alignment === 'right'
                  ? 'ml-auto'
                  : 'mx-auto';

            const isSideAnalysis =
              layoutPreset === 'side_analysis' || layoutPreset === 'screenshot_comment';

            return (
              <div
                key={img.id}
                onClick={e => {
                  e.stopPropagation();
                  if (!isPrintMode && onSelectImage) onSelectImage(img.id);
                }}
                className={`group relative flex ${
                  isSideAnalysis ? 'flex-row gap-5' : 'flex-col'
                } rounded-xl bg-white transition min-h-0 ${
                  img.showBorder ? 'border border-slate-200 p-2.5 shadow-xs' : 'p-1'
                } ${isSelected ? 'ring-2 ring-[#0072CE]' : ''}`}
              >
                {/* Image Viewport Container */}
                <div
                  style={{ width: isSideAnalysis ? '58%' : `${img.widthPercent || 100}%` }}
                  className={`relative overflow-hidden rounded-lg bg-[#F5F7FA] flex-1 flex items-center justify-center ${alignClass} ${
                    compactMode ? 'min-h-[110px] max-h-[160px]' : layoutPreset === 'four_grid' ? 'min-h-[135px] max-h-[175px]' : 'min-h-[210px] max-h-[310px]'
                  }`}
                >
                  <img
                    src={img.src}
                    alt={img.title || 'Evidencia Autosol'}
                    style={{
                      objectFit: img.crop.fitMode,
                      transform: `scale(${img.crop.zoom}) translate(${img.crop.offsetX}%, ${img.crop.offsetY}%)`,
                      transformOrigin: 'center center',
                    }}
                    className="h-full w-full transition-transform duration-150 select-none"
                  />

                  {img.branchTag && img.branchTag !== 'GENERAL' && (
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-[#001E50]/90 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      {img.branchTag === 'JUJUY' ? 'Jujuy (3059)' : 'Salta (3087)'}
                    </span>
                  )}

                  {/* Floating Quick Toolbar on Hover / Selection */}
                  {!isPrintMode && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-[#001E50]/90 p-1 text-white opacity-0 shadow-md transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setCroppingImageId(isCropping ? null : img.id);
                        }}
                        title="Encuadrar / Recortar sin deformar"
                        className={`rounded p-1 hover:bg-white/20 ${isCropping ? 'bg-[#0072CE]' : ''}`}
                      >
                        <Crop className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          updateImage(img.id, {
                            crop: {
                              ...img.crop,
                              fitMode: img.crop.fitMode === 'cover' ? 'contain' : 'cover',
                            },
                          });
                        }}
                        title={
                          img.crop.fitMode === 'cover'
                            ? 'Mostrar imagen entera (Ideal capturas)'
                            : 'Cubrir recuadro'
                        }
                        className="rounded p-1 hover:bg-white/20"
                      >
                        {img.crop.fitMode === 'cover' ? (
                          <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                          <Maximize2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setReplacingId(img.id);
                          replaceInputRef.current?.click();
                        }}
                        title="Reemplazar imagen"
                        className="rounded p-1 hover:bg-white/20"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              moveImage(idx, -1);
                            }}
                            title="Mover antes"
                            className="rounded p-1 hover:bg-white/20"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              moveImage(idx, 1);
                            }}
                            title="Mover después"
                            className="rounded p-1 hover:bg-white/20"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        title="Eliminar imagen"
                        className="rounded p-1 text-red-300 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Non-destructive Crop & Framing Overlay */}
                  {isCropping && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="absolute inset-x-2 bottom-2 z-20 rounded-xl bg-[#001E50]/95 p-3 text-white shadow-xl backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sky-300 mb-2">
                        <span>Encuadre no destructivo</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateImage(img.id, {
                              crop: { zoom: 1, offsetX: 0, offsetY: 0, fitMode: img.crop.fitMode },
                            })
                          }
                          className="text-[10px] underline hover:text-white"
                        >
                          Restablecer
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <label className="flex flex-col gap-1">
                          <span>Zoom ({img.crop.zoom.toFixed(1)}x)</span>
                          <input
                            type="range"
                            min={1}
                            max={2.5}
                            step={0.05}
                            value={img.crop.zoom}
                            onChange={e =>
                              updateImage(img.id, {
                                crop: { ...img.crop, zoom: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Horizontal ({img.crop.offsetX}%)</span>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            step={1}
                            value={img.crop.offsetX}
                            onChange={e =>
                              updateImage(img.id, {
                                crop: { ...img.crop, offsetX: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Vertical ({img.crop.offsetY}%)</span>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            step={1}
                            value={img.crop.offsetY}
                            onChange={e =>
                              updateImage(img.id, {
                                crop: { ...img.crop, offsetY: Number(e.target.value) },
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title, Caption & Optional Side Analysis */}
                <div className={isSideAnalysis ? 'flex-1 flex flex-col justify-between py-1' : 'mt-2'}>
                  <div>
                    {isPrintMode ? (
                      <h5 className="text-xs font-extrabold text-[#001E50]">{img.title}</h5>
                    ) : (
                      <input
                        type="text"
                        value={img.title}
                        onChange={e => updateImage(img.id, { title: e.target.value })}
                        placeholder="Título de la evidencia o captura..."
                        className="w-full bg-transparent text-xs font-extrabold text-[#001E50] outline-none border-b border-transparent focus:border-[#0072CE]"
                      />
                    )}
                    {isPrintMode ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-[#5A6A85]">{img.caption}</p>
                    ) : (
                      <input
                        type="text"
                        value={img.caption}
                        onChange={e => updateImage(img.id, { caption: e.target.value })}
                        placeholder="Pie de foto o referencia documental..."
                        className="mt-0.5 w-full bg-transparent text-[11px] text-[#5A6A85] outline-none border-b border-transparent focus:border-slate-300"
                      />
                    )}
                  </div>

                  {isSideAnalysis && (
                    <div className="mt-3 flex-1 rounded-xl border border-slate-200 bg-[#F5F7FA] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#0072CE]">
                        Análisis Ejecutivo de la Evidencia
                      </p>
                      {isPrintMode ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                          {img.analysisText || 'Sin observaciones adicionales registradas.'}
                        </p>
                      ) : (
                        <textarea
                          value={img.analysisText}
                          onChange={e => updateImage(img.id, { analysisText: e.target.value })}
                          placeholder="Describí el hallazgo, contexto de auditoría o conclusión asociada a esta imagen..."
                          rows={4}
                          className="mt-1.5 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!isPrintMode && visibleImages.length < maxSlots && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-[#F5F7FA]/60 p-4 text-xs font-bold text-[#5A6A85] transition hover:border-[#0072CE] hover:text-[#001E50]"
            >
              <Plus className="h-5 w-5 text-[#0072CE] mb-1" />
              <span>Agregar imagen ({visibleImages.length}/{maxSlots})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
