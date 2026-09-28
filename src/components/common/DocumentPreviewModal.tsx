'use client';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Paperclip,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  AlertTriangle,
  Upload,
  CheckCircle,
} from 'lucide-react';

export interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string | null | undefined;
  fileName?: string;
  onReupload?: (file: File) => Promise<void> | void;
}

export function DocumentPreviewModal({
  open,
  onClose,
  title,
  url,
  fileName = 'Dokumen',
  onReupload,
}: DocumentPreviewModalProps) {
  // Zoom & Rotation states for images
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Excel viewer states
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<any[][]>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Re-upload state for legacy records without binary
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Image error state
  const [imageError, setImageError] = useState(false);

  // Reset states on open/url change
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setSearchFilter('');
      setUploadSuccess(false);
      setImageError(false);
    }
  }, [open, url]);

  const cleanName = fileName.toLowerCase();

  // Determine file type
  const isImage = Boolean(
    url?.startsWith('data:image/') ||
      cleanName.endsWith('.png') ||
      cleanName.endsWith('.jpg') ||
      cleanName.endsWith('.jpeg') ||
      cleanName.endsWith('.webp') ||
      cleanName.endsWith('.gif') ||
      cleanName.endsWith('.svg')
  );

  const isExcel = Boolean(
    url?.startsWith('data:application/vnd') ||
      url?.startsWith('data:text/csv') ||
      cleanName.endsWith('.xlsx') ||
      cleanName.endsWith('.xls') ||
      cleanName.endsWith('.csv')
  );

  const isPdf = Boolean(
    url?.startsWith('data:application/pdf') ||
      cleanName.endsWith('.pdf')
  );

  const isWord = Boolean(
    cleanName.endsWith('.docx') ||
      cleanName.endsWith('.doc') ||
      url?.startsWith('data:application/msword') ||
      url?.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml')
  );

  // Resolve URL for relative public paths
  const resolvedUrl = useMemo(() => {
    if (!url) return null;
    if (
      url.startsWith('data:') ||
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('blob:')
    ) {
      return url;
    }
    if (url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  }, [url]);

  // Check if URL is valid physical binary data or web link
  const hasValidBinaryData = Boolean(
    resolvedUrl &&
      (resolvedUrl.startsWith('data:') ||
        resolvedUrl.startsWith('http://') ||
        resolvedUrl.startsWith('https://') ||
        resolvedUrl.startsWith('blob:') ||
        resolvedUrl.startsWith('/'))
  );

  // Parse Excel workbook when isExcel and valid binary
  useEffect(() => {
    if (!open || !isExcel || !hasValidBinaryData || !url) return;

    let isMounted = true;
    setExcelLoading(true);
    setExcelError(null);

    const parseWorkbook = async () => {
      try {
        let wb: XLSX.WorkBook;
        if (url.startsWith('data:')) {
          const base64Index = url.indexOf('base64,');
          const base64Content = base64Index !== -1 ? url.substring(base64Index + 7) : url;
          wb = XLSX.read(base64Content, { type: 'base64' });
        } else {
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          wb = XLSX.read(buf, { type: 'array' });
        }

        if (!isMounted) return;

        if (wb.SheetNames.length > 0) {
          setSheetNames(wb.SheetNames);
          const firstSheet = wb.SheetNames[0];
          setActiveSheet(firstSheet);
          const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], {
            header: 1,
            defval: '',
          });
          setSheetRows(data);
        } else {
          setExcelError('Berkas spreadsheet tidak memiliki lembar kerja (sheet).');
        }
      } catch (err: any) {
        console.error('Gagal membaca data Excel:', err);
        if (isMounted) {
          setExcelError('Gagal memproses berkas Excel. Format mungkin terproteksi atau tidak valid.');
        }
      } finally {
        if (isMounted) setExcelLoading(false);
      }
    };

    parseWorkbook();

    return () => {
      isMounted = false;
    };
  }, [open, isExcel, hasValidBinaryData, url]);

  // Handle switching Excel sheets
  const handleSheetChange = (sheetName: string) => {
    if (!url) return;
    setActiveSheet(sheetName);
    try {
      let wb: XLSX.WorkBook;
      if (url.startsWith('data:')) {
        const base64Index = url.indexOf('base64,');
        const base64Content = base64Index !== -1 ? url.substring(base64Index + 7) : url;
        wb = XLSX.read(base64Content, { type: 'base64' });
      } else {
        return;
      }
      const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
        header: 1,
        defval: '',
      });
      setSheetRows(data);
    } catch (err) {
      console.error('Error changing sheet:', err);
    }
  };

  // Filtered rows for Excel search
  const filteredExcelRows = useMemo(() => {
    if (!searchFilter.trim()) return sheetRows;
    const query = searchFilter.toLowerCase();
    return sheetRows.filter((row, idx) => {
      if (idx === 0) return true; // keep header
      return row.some((cell) => String(cell).toLowerCase().includes(query));
    });
  }, [sheetRows, searchFilter]);

  // Download handler
  const handleDownload = () => {
    if (!url || !hasValidBinaryData) {
      alert(`Berkas "${fileName}" belum memiliki data fisik yang tersimpan di sistem.`);
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'Dokumen_Medis';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open in new tab handler
  const handleOpenNewTab = () => {
    if (!url || !hasValidBinaryData) return;
    if (url.startsWith('data:')) {
      // Create blob for robust new tab opening
      try {
        const arr = url.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch {
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  // File re-upload for legacy records
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onReupload) return;

    setIsUploading(true);
    try {
      await onReupload(file);
      setUploadSuccess(true);
    } catch (err) {
      alert('Gagal mengunggah berkas: ' + (err as any)?.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-xs shrink-0 ${
                isExcel
                  ? 'bg-emerald-600 text-white'
                  : isPdf
                  ? 'bg-rose-600 text-white'
                  : isImage
                  ? 'bg-sky-600 text-white'
                  : isWord
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              {isExcel ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : isPdf ? (
                <FileText className="w-5 h-5" />
              ) : isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isWord ? (
                <FileText className="w-5 h-5" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                {fileName}
                {isExcel ? ' • Spreadsheet Excel' : isPdf ? ' • Dokumen PDF' : isImage ? ' • Gambar/Foto Scan' : isWord ? ' • Dokumen Word' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasValidBinaryData && !isExcel && !isWord && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                title="Buka di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tab Baru</span>
              </button>
            )}

            {hasValidBinaryData && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-1.5 bg-[#005930] hover:bg-[#004726] text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                title="Unduh Berkas"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Unduh</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-5 flex flex-col min-h-[450px]">
          {hasValidBinaryData ? (
            /* ======================================================= */
            /* 1. EXCEL SPREADSHEET VIEWER                             */
            /* ======================================================= */
            isExcel ? (
              <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Excel Control Bar */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  {/* Sheet Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-0.5">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSheetChange(name)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
                          activeSheet === name
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {/* Search / Filter */}
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari dalam spreadsheet..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 w-48 sm:w-60"
                    />
                    {sheetRows.length > 0 && (
                      <span className="ml-2 text-[10px] font-bold text-slate-500 hidden sm:inline">
                        {filteredExcelRows.length - 1 > 0 ? `${filteredExcelRows.length - 1} baris` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Table Data Content */}
                <div className="flex-1 overflow-auto max-h-[62vh] relative">
                  {excelLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Memproses dan membaca tabel spreadsheet...</p>
                    </div>
                  ) : excelError ? (
                    <div className="py-16 text-center space-y-3 px-4">
                      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">{excelError}</p>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Berkas Excel Asli</span>
                      </button>
                    </div>
                  ) : filteredExcelRows.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        {filteredExcelRows[0] && (
                          <tr className="bg-slate-800 text-white sticky top-0 z-10">
                            <th className="py-2.5 px-3 font-bold border-r border-slate-700 text-center w-12 text-slate-300">
                              #
                            </th>
                            {filteredExcelRows[0].map((headerCell: any, colIdx: number) => (
                              <th
                                key={colIdx}
                                className="py-2.5 px-3 font-extrabold border-r border-slate-700 whitespace-nowrap"
                              >
                                {headerCell !== undefined && headerCell !== null && String(headerCell) !== ''
                                  ? String(headerCell)
                                  : `Kolom ${colIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredExcelRows.slice(1).map((row: any[], rowIdx: number) => (
                          <tr
                            key={rowIdx}
                            className={`hover:bg-emerald-50/60 transition ${
                              rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-400 text-center border-r border-slate-200 bg-slate-100/60">
                              {rowIdx + 1}
                            </td>
                            {filteredExcelRows[0]?.map((_: any, colIdx: number) => {
                              const val = row[colIdx];
                              return (
                                <td
                                  key={colIdx}
                                  className="py-2 px-3 text-slate-800 border-r border-slate-200 whitespace-nowrap"
                                >
                                  {val !== undefined && val !== null && String(val) !== ''
                                    ? String(val)
                                    : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-16 text-center space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-500">Lembar kerja kosong atau tidak ada data yang cocok.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : isImage ? (
              /* ======================================================= */
              /* 2. IMAGE VIEWER                                         */
              /* ======================================================= */
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Image Toolbar */}
                <div className="mb-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 min-w-[45px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    title="Putar 90 Derajat"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900 px-1.5 py-1"
                  >
                    Reset
                  </button>
                </div>

                {/* Image Surface */}
                <div className="max-w-full max-h-[66vh] overflow-auto flex items-center justify-center bg-white p-3 rounded-2xl shadow-xs border border-slate-200">
                  {imageError ? (
                    <div className="py-12 text-center space-y-3 px-6">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">Berkas Gambar Tidak Dapat Dimuat</p>
                        <p className="text-xs text-slate-500 mt-0.5">{fileName}</p>
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Tautan berkas lokal ({fileName}) belum tersinkronisasi sebagai data biner atau berkas telah dipindahkan.
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload()}
                          className="px-4 py-2 bg-[#005930] hover:bg-[#004726] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                        >
                          Coba Unduh Berkas
                        </button>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={resolvedUrl || ''}
                      alt={fileName}
                      onError={() => setImageError(true)}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-[60vh] max-w-full object-contain rounded-xl select-none"
                    />
                  )}
                </div>
              </div>
            ) : isPdf ? (
              /* ======================================================= */
              /* 3. PDF VIEWER                                           */
              /* ======================================================= */
              <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <iframe
                  src={url ? `${url}#toolbar=1` : undefined}
                  className="w-full h-[65vh] rounded-2xl bg-white border-0"
                  title={fileName}
                />
              </div>
            ) : isWord ? (
              /* ======================================================= */
              /* 4. WORD DOCUMENT CARD                                   */
              /* ======================================================= */
              <div className="flex-1 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{fileName}</h4>
                    <p className="text-xs text-slate-500 mt-1">Dokumen Microsoft Word (.doc / .docx)</p>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Format Word dilindungi dan dapat dibuka secara lengkap langsung menggunakan Microsoft Word atau Office Viewer di perangkat Anda.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh &amp; Buka Berkas Word</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ======================================================= */
              /* 5. GENERIC FILE PREVIEW / IFRAME                        */
              /* ======================================================= */
              <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <iframe
                  src={url || undefined}
                  className="w-full h-[65vh] rounded-2xl bg-white border-0"
                  title={fileName}
                />
              </div>
            )
          ) : (
            /* ======================================================= */
            /* 6. LEGACY RECORD NOTICE / NO BINARY DATA FALLBACK       */
            /* ======================================================= */
            <div className="flex-1 flex items-center justify-center py-6">
              <div className="max-w-lg w-full bg-white p-6 sm:p-8 rounded-3xl border border-amber-200 shadow-md text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    Berkas Fisik Belum Terunggah
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Nama arsip rujukan: <span className="font-bold text-slate-800 underline">{fileName}</span>
                  </p>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-left text-xs text-amber-950 space-y-1">
                  <p className="font-bold">Informasi Penyimpanan:</p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Data rekam medis ini sebelumnya tersimpan hanya berupa nama dokumen string ({fileName}) tanpa berkas biner fisik utuh.
                  </p>
                </div>

                {uploadSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-700" />
                    <span>Berkas berhasil diperbarui! Memuat pratinjau...</span>
                  </div>
                ) : onReupload ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-slate-700">
                      Lampirkan berkas fisik sekarang untuk dapat dipratinjau langsung:
                    </p>
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005930] hover:bg-[#004726] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>{isUploading ? 'Mengunggah Berkas...' : 'Pilih Berkas Fisik Baru'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Tutup Pratinjau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
