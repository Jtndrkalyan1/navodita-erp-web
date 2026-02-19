import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineDocumentText,
  HiOutlineArrowUpTray,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineListBullet,
  HiOutlineSquares2X2,
  HiOutlineDocumentArrowDown,
  HiOutlinePhoto,
  HiOutlineTableCells,
  HiOutlineFilm,
  HiOutlinePaperClip,
  HiOutlineXMark,
  HiOutlineFolderOpen,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCloudArrowUp,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/feedback/LoadingSpinner';
import DeleteConfirmModal from '../../components/feedback/DeleteConfirmModal';

// ── Constants ─────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Invoice', 'Bill', 'Receipt', 'Contract', 'Employee', 'Other'];

const FILE_TYPE_ICONS = {
  pdf: { icon: HiOutlineDocumentText, color: 'text-red-500', bg: 'bg-red-50' },
  doc: { icon: HiOutlineDocumentText, color: 'text-blue-500', bg: 'bg-blue-50' },
  docx: { icon: HiOutlineDocumentText, color: 'text-blue-500', bg: 'bg-blue-50' },
  xls: { icon: HiOutlineTableCells, color: 'text-green-500', bg: 'bg-green-50' },
  xlsx: { icon: HiOutlineTableCells, color: 'text-green-500', bg: 'bg-green-50' },
  csv: { icon: HiOutlineTableCells, color: 'text-green-500', bg: 'bg-green-50' },
  png: { icon: HiOutlinePhoto, color: 'text-purple-500', bg: 'bg-purple-50' },
  jpg: { icon: HiOutlinePhoto, color: 'text-purple-500', bg: 'bg-purple-50' },
  jpeg: { icon: HiOutlinePhoto, color: 'text-purple-500', bg: 'bg-purple-50' },
  gif: { icon: HiOutlinePhoto, color: 'text-purple-500', bg: 'bg-purple-50' },
  mp4: { icon: HiOutlineFilm, color: 'text-orange-500', bg: 'bg-orange-50' },
  zip: { icon: HiOutlinePaperClip, color: 'text-amber-500', bg: 'bg-amber-50' },
};

function getFileTypeInfo(fileName) {
  if (!fileName) return { icon: HiOutlineDocumentText, color: 'text-gray-500', bg: 'bg-gray-50' };
  const ext = fileName.split('.').pop()?.toLowerCase();
  return FILE_TYPE_ICONS[ext] || { icon: HiOutlineDocumentText, color: 'text-gray-500', bg: 'bg-gray-50' };
}

function formatFileSize(bytes) {
  if (!bytes) return '--';
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Upload Area Component ────────────────────────────────────────

function UploadArea({ onUpload, uploading }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [description, setDescription] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      onUpload(files[0], selectedCategory, description);
      setDescription('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, selectedCategory, description);
      setDescription('');
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 mb-6">
      <h3 className="text-sm font-semibold text-[#333] mb-3 flex items-center gap-2">
        <HiOutlineCloudArrowUp className="w-4 h-4 text-[#0071DC]" />
        Upload Document
      </h3>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-[#0071DC] bg-[#0071DC]/5'
              : 'border-[#E5E7EB] hover:border-[#0071DC]/50 hover:bg-gray-50'
          }`}
        >
          <HiOutlineArrowUpTray className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-[#0071DC]' : 'text-[#9CA3AF]'}`} />
          <p className="text-sm text-[#6B7280]">
            <span className="text-[#0071DC] font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">PDF, DOC, XLS, Images, ZIP up to 100MB</p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.zip"
          />
        </div>

        {/* Options */}
        <div className="w-full sm:w-56 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC] bg-white"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-[#0071DC]">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Document Grid Card ────────────────────────────────────────────

function DocumentGridCard({ doc, onDelete, onDownload }) {
  const typeInfo = getFileTypeInfo(doc.file_name);
  const Icon = typeInfo.icon;

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden hover:shadow-sm transition-shadow group">
      {/* Icon Area */}
      <div
        className={`${typeInfo.bg} p-6 flex items-center justify-center cursor-pointer`}
        onClick={() => onDownload(doc)}
      >
        <Icon className={`w-10 h-10 ${typeInfo.color}`} />
      </div>

      {/* Info */}
      <div className="p-3 border-t border-[#E5E7EB]">
        <p
          className="text-sm font-medium text-[#333] truncate cursor-pointer hover:text-[#0071DC]"
          title={doc.file_name}
          onClick={() => onDownload(doc)}
        >
          {doc.file_name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-[#6B7280]">
              {doc.category || 'Other'}
            </span>
            <span className="text-xs text-[#9CA3AF] truncate">{formatFileSize(doc.file_size)}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Delete"
          >
            <HiOutlineTrash className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-1">{formatDate(doc.created_at)}</p>
      </div>
    </div>
  );
}

// ── Document List Row ─────────────────────────────────────────────

function DocumentListRow({ doc, onDelete, onDownload }) {
  const typeInfo = getFileTypeInfo(doc.file_name);
  const Icon = typeInfo.icon;

  return (
    <tr className="hover:bg-[#F9FAFB] transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onDownload(doc)}>
          <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#333] truncate hover:text-[#0071DC]">{doc.file_name}</p>
            {doc.description && (
              <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{doc.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-[#6B7280]">
          {doc.category || 'Other'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#6B7280]">{formatFileSize(doc.file_size)}</td>
      <td className="px-4 py-3 text-sm text-[#6B7280]">{doc.uploaded_by || '--'}</td>
      <td className="px-4 py-3 text-sm text-[#6B7280]">{formatDate(doc.created_at)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDownload(doc)}
            className="p-1.5 rounded text-[#6B7280] hover:text-[#0071DC] hover:bg-blue-50 transition-colors cursor-pointer"
            title="Download"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(doc)}
            className="p-1.5 rounded text-[#6B7280] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Documents Page ───────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [page, setPage] = useState(1);
  const [limit] = useState(24);

  // Delete modal
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch Documents ─────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category !== 'All') params.category = category;

      const res = await apiClient.get('/documents', { params });
      const data = res.data;
      setDocuments(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.response?.status !== 401) {
        setDocuments([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, category]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Upload Handler ──────────────────────────────────────────────

  const handleUpload = async (file, fileCategory, description) => {
    if (!file) return;

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', fileCategory);
      if (description) formData.append('description', description);

      await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`"${file.name}" uploaded successfully`);
      fetchDocuments();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to upload document. Please try again.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // ── Delete Handler ──────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/documents/${deleteDoc.id}`);
      toast.success(`"${deleteDoc.file_name}" deleted`);
      fetchDocuments();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete document';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setDeleteDoc(null);
    }
  };

  // ── Download Handler ────────────────────────────────────────────

  const handleDownload = (doc) => {
    if (doc.file_path) {
      window.open(`/api/documents/${doc.id}/download`, '_blank');
    } else {
      toast('Preview not available');
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / limit);
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#333]">Documents</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Upload and manage your business documents
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <UploadArea onUpload={handleUpload} uploading={uploading} />

      {/* Filters Bar */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm mb-4">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20 focus:border-[#0071DC]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer"
              >
                <HiOutlineXMark className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#0071DC] text-white'
                  : 'text-[#6B7280] hover:text-[#333]'
              }`}
              title="Grid view"
            >
              <HiOutlineSquares2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#0071DC] text-white'
                  : 'text-[#6B7280] hover:text-[#333]'
              }`}
              title="List view"
            >
              <HiOutlineListBullet className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 pb-3 flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-[#0071DC] text-white'
                  : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Content */}
      {loading ? (
        <div className="py-20">
          <LoadingSpinner size="lg" label="Loading documents..." />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-16 text-center">
          <HiOutlineFolderOpen className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-[#6B7280] font-medium">No documents found</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {debouncedSearch || category !== 'All'
              ? 'Try adjusting your filters'
              : 'Upload your first document to get started'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {documents.map((doc) => (
            <DocumentGridCard
              key={doc.id}
              doc={doc}
              onDelete={setDeleteDoc}
              onDownload={handleDownload}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">File Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Uploaded By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {documents.map((doc) => (
                  <DocumentListRow
                    key={doc.id}
                    doc={doc}
                    onDelete={setDeleteDoc}
                    onDownload={handleDownload}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-[#6B7280]">
            Showing <span className="font-medium text-[#333]">{startRecord}</span> to{' '}
            <span className="font-medium text-[#333]">{endRecord}</span> of{' '}
            <span className="font-medium text-[#333]">{total}</span> documents
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-[#6B7280]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDoc?.file_name}"? This action cannot be undone.`}
        confirmLabel="Delete Document"
        loading={deleting}
      />
    </div>
  );
}
