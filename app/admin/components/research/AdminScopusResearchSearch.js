"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, ExternalLink, Loader2, Search } from "lucide-react";
import PageLayout from "../common/PageLayout";
import { publicationsAPI } from "../../../lib/api";
import { toast } from "react-hot-toast";
import { downloadXlsx } from "@/app/admin/utils/xlsxExporter";

const PUB_PAGE_SIZE = 10;
const EXPORT_COLUMNS = [
  { key: "rowNumber", header: "ลำดับ", width: 8 },
  { key: "title", header: "ชื่อเรื่อง", width: 60 },
  { key: "venue", header: "แหล่งเผยแพร่", width: 36 },
  { key: "citedBy", header: "Cited by", width: 12 },
  { key: "year", header: "ปี", width: 10 },
  { key: "scopusId", header: "Scopus ID", width: 16 },
  { key: "eid", header: "EID", width: 22 },
  { key: "doiUrl", header: "DOI/URL", width: 32 },
  { key: "scopusUrl", header: "Scopus URL", width: 32 },
  { key: "openAccess", header: "Open Access", width: 14 },
  { key: "keywords", header: "Keywords", width: 40 },
];

export default function AdminScopusResearchSearch() {
  const [pubQuery, setPubQuery] = useState("");
  const [publications, setPublications] = useState([]);
  const [pubMeta, setPubMeta] = useState({ total: 0, limit: PUB_PAGE_SIZE, offset: 0 });
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchPublications = useCallback(
    async (offset = 0) => {
      setPubLoading(true);
      setPubError("");
      try {
        const params = { limit: PUB_PAGE_SIZE, offset, sort: "year", direction: "desc" };
        if (pubQuery.trim()) {
          params.q = pubQuery.trim();
        }
        const res = await publicationsAPI.searchScopusPublications(params);
        const items = res?.data || [];
        setPublications(items);
        setPubMeta(res?.paging || { total: items.length, limit: PUB_PAGE_SIZE, offset });
      } catch (error) {
        console.error("Load publications error", error);
        setPublications([]);
        setPubMeta({ total: 0, limit: PUB_PAGE_SIZE, offset: 0 });
        setPubError(error?.message || "ไม่สามารถดึงข้อมูลงานวิจัยได้");
      } finally {
        setPubLoading(false);
      }
    },
    [pubQuery]
  );

  useEffect(() => {
    fetchPublications(0);
  }, [fetchPublications]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pubMeta?.total || 0) / (pubMeta?.limit || PUB_PAGE_SIZE))),
    [pubMeta]
  );
  const currentPage = useMemo(
    () => Math.floor((pubMeta?.offset || 0) / (pubMeta?.limit || PUB_PAGE_SIZE)) + 1,
    [pubMeta]
  );

  const handlePageChange = (direction) => {
    if (pubLoading) return;
    const nextPage = currentPage + direction;
    if (nextPage < 1 || nextPage > totalPages) return;
    const nextOffset = (nextPage - 1) * (pubMeta?.limit || PUB_PAGE_SIZE);
    fetchPublications(nextOffset);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return new Intl.NumberFormat("th-TH").format(num);
  };

  const buildExportRows = useCallback((items, startOffset = 0) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.map((pub, index) => {
      const rowNumber = startOffset + index + 1;
      const citedByValue =
        pub.cited_by !== undefined && pub.cited_by !== null ? pub.cited_by : "";
      const openAccessFlag =
        pub.open_access ?? pub.is_open_access ?? pub.openaccess ?? pub.openAccess;
      const keywords = Array.isArray(pub.keywords)
        ? pub.keywords.join("; ")
        : pub.keywords || "";

      return {
        rowNumber,
        title: pub.title || "",
        venue: pub.venue || pub.publication_name || "",
        citedBy: citedByValue,
        year: pub.publication_year || pub.coverDate || "",
        scopusId: pub.scopus_id || pub.scopusID || "",
        eid: pub.eid || "",
        doiUrl: pub.doi || pub.doi_url || pub.url || "",
        scopusUrl: pub.scopus_url || "",
        openAccess:
          openAccessFlag === undefined || openAccessFlag === null
            ? ""
            : openAccessFlag
            ? "Yes"
            : "No",
        keywords,
      };
    });
  }, []);

  const hasExportableData = useMemo(() => (pubMeta?.total || 0) > 0, [pubMeta?.total]);

  const handleExport = useCallback(async () => {
    if (!hasExportableData) return;
    setExporting(true);
    try {
      const query = pubQuery.trim();
      const limit = pubMeta?.limit || PUB_PAGE_SIZE;
      let offset = 0;
      let total = pubMeta?.total || 0;
      const allRows = [];

      while (offset === 0 || offset < total) {
        const params = { limit, offset, sort: "year", direction: "desc" };
        if (query) {
          params.q = query;
        }

        const res = await publicationsAPI.searchScopusPublications(params);
        const items = Array.isArray(res?.data) ? res.data : [];
        const paging = res?.paging || {};
        total = paging.total ?? total;
        const pageLimit = paging.limit || limit;

        allRows.push(...buildExportRows(items, offset));

        if (items.length < pageLimit) {
          break;
        }
        offset += pageLimit;
      }

      if (allRows.length === 0) {
        toast.error("ไม่พบข้อมูลงานวิจัยสำหรับส่งออก");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
      const filename = `scopus_publications_${timestamp}.xlsx`;
      downloadXlsx(EXPORT_COLUMNS, allRows, {
        sheetName: "Scopus Publications",
        filename,
      });
      toast.success(`ส่งออก ${allRows.length} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      console.error("Export publications error", error);
      toast.error("ไม่สามารถส่งออกไฟล์ได้");
    } finally {
      setExporting(false);
    }
  }, [buildExportRows, hasExportableData, pubMeta?.limit, pubMeta?.total, pubQuery]);

  return (
    <PageLayout
      title="ค้นหางานวิจัย"
      subtitle="ค้นหาและสำรวจเอกสารจากฐานข้อมูล Scopus"
      icon={Search}
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">ค้นหาเอกสารจาก Scopus</p>
            <p className="text-xs text-slate-500">ดึงข้อมูลเอกสารทั้งหมดที่มีอยู่ในฐานข้อมูล ไม่จำกัดเฉพาะผู้ใช้คนใด</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-64 rounded-lg border border-slate-300 bg-white px-9 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="ค้นหาชื่อเรื่อง / DOI / EID / คำค้น"
                value={pubQuery}
                onChange={(e) => setPubQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchPublications(0);
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => fetchPublications(0)}
              disabled={pubLoading}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pubLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ค้นหาเอกสาร
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !hasExportableData}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}ส่งออก Excel
            </button>
          </div>
        </div>

        <div className="p-5">
          {pubError ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{pubError}</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                {pubLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 rounded bg-slate-100" />
                    ))}
                  </div>
                ) : publications.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">ไม่พบข้อมูลงานวิจัยจาก Scopus</div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">รวม {formatNumber(pubMeta.total || 0)} รายการ</div>
                      <div className="text-xs text-slate-500">
                        อัปเดตการค้นหาเพื่อดูเอกสารทั้งหมดที่ตรงกับคำค้น
                      </div>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-14 px-4 py-2 text-center font-medium text-gray-700">ลำดับ</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">ชื่อเรื่อง</th>
                          <th className="w-24 px-4 py-2 text-right font-medium text-gray-700">Cited by</th>
                          <th className="w-20 px-4 py-2 text-center font-medium text-gray-700">ปี</th>
                          <th className="w-32 px-4 py-2 text-left font-medium text-gray-700">ลิงก์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {publications.map((pub, index) => {
                          const rowNumber = (pubMeta.offset || 0) + index + 1;
                          const citedByValue = pub.cited_by !== undefined && pub.cited_by !== null ? pub.cited_by : null;
                          const yearValue = pub.publication_year || "-";
                          const scopusUrl = pub.scopus_url;
                          const linkLabel = pub.title || pub.venue || pub.publication_name || "ไม่ระบุชื่อเรื่อง";

                          const titleContent = scopusUrl ? (
                            <a
                              href={scopusUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="group inline-flex max-w-full items-center gap-1 truncate font-semibold text-indigo-700 hover:text-indigo-900"
                              title={linkLabel}
                            >
                              <span className="truncate">{linkLabel}</span>
                              <ExternalLink size={14} className="min-h-[14px] min-w-[14px] opacity-70 group-hover:opacity-100" />
                            </a>
                          ) : (
                            <span className="block truncate font-semibold text-gray-900" title={pub.title}>
                              {linkLabel}
                            </span>
                          );
                          return (
                            <tr key={`${pub.id || pub.scopus_id || pub.eid}-${index}`} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-center text-gray-700">{rowNumber}</td>
                              <td className="max-w-xs px-4 py-2 lg:max-w-md">
                                <div className="space-y-1">
                                  {titleContent}
                                  {pub.venue || pub.publication_name ? (
                                    <span className="block truncate text-xs text-gray-500">{pub.venue || pub.publication_name}</span>
                                  ) : null}
                                  {pub.scopus_id ? (
                                    <span className="block text-[11px] text-gray-500">Scopus ID: {pub.scopus_id}</span>
                                  ) : null}
                                  {pub.eid ? <span className="block text-[11px] text-gray-500">EID: {pub.eid}</span> : null}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">{citedByValue ?? "-"}</td>
                              <td className="px-4 py-2 text-center text-gray-700">{yearValue}</td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {pub.url && (
                                    <a
                                      href={pub.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-1 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                                    >
                                      DOI/URL <ExternalLink size={14} />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
                      <span>
                        แสดง {(pubMeta.offset || 0) + 1}-
                        {Math.min((pubMeta.offset || 0) + (pubMeta.limit || PUB_PAGE_SIZE), pubMeta.total || 0)} จาก {pubMeta.total || 0}
                      </span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => handlePageChange(-1)}
                          disabled={currentPage <= 1 || pubLoading}
                          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                        >
                          ก่อนหน้า
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage >= totalPages || pubLoading}
                          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}