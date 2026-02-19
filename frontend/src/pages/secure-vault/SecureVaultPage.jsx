import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineDocument,
  HiOutlineArrowUpTray,
  HiOutlineArrowDownTray,
  HiOutlineTrash,
  HiOutlineShare,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineFolder,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineDocumentText,
  HiOutlinePhoto,
  HiOutlineClipboardDocument,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const API_BASE = '/api/secure-vault';

// Document categories/folders
const FOLDERS = [
  { id: 'Government IDs', label: 'Government IDs', icon: HiOutlineShieldCheck, color: 'blue' },
  { id: 'Business Licenses', label: 'Business Licenses', icon: HiOutlineClipboardDocument, color: 'green' },
  { id: 'Tax Certificates', label: 'Tax Certificates', icon: HiOutlineDocumentText, color: 'purple' },
  { id: 'Banking', label: 'Banking', icon: HiOutlineDocument, color: 'amber' },
  { id: 'Insurance', label: 'Insurance', icon: HiOutlineShieldCheck, color: 'red' },
  { id: 'Other', label: 'Other', icon: HiOutlineFolder, color: 'gray' },
];

// Common document types for Indian businesses
const DOCUMENT_TYPES = [
  'PAN Card',
  'Aadhaar Card',
  'GSTIN Certificate',
  'Business License',
  'Import-Export License',
  'FSSAI License',
  'Trade License',
  'Shop & Establishment License',
  'MSME Registration',
  'TAN Certificate',
  'Company Incorporation Certificate',
  'Partnership Deed',
  'Bank Statement',
  'Cancelled Cheque',
  'Insurance Policy',
  'Property Document',
  'Passport',
  'Voter ID',
  'Driving License',
  'Other',
];

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  };
}

function getVaultHeaders() {
  const vaultToken = sessionStorage.getItem('vaultToken');
  return {
    ...getAuthHeaders(),
    'x-vault-token': vaultToken || '',
  };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getFileIcon(mimeType) {
  if (!mimeType) return HiOutlineDocument;
  if (mimeType.startsWith('image/')) return HiOutlinePhoto;
  if (mimeType.includes('pdf')) return HiOutlineDocumentText;
  return HiOutlineDocument;
}

// ─── Lock Screen ──────────────────────────────────────────────
function VaultLockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const [showReset, setShowReset] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [newVaultPassword, setNewVaultPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/unlock`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to unlock vault');
        setPassword('');
        return;
      }

      sessionStorage.setItem('vaultToken', data.vaultToken);
      toast.success('Vault unlocked');
      onUnlock();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Lock Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
              <HiOutlineLockClosed className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center text-gray-900 mb-1">
            Secure Document Vault
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter your vault password to access your documents
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleUnlock}>
            <div className="relative mb-4">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter vault password"
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <HiOutlineEyeSlash className="w-5 h-5" />
                ) : (
                  <HiOutlineEye className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <HiOutlineLockOpen className="w-5 h-5" />
                  Unlock Vault
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setShowReset(!showReset); setError(''); }}
              className="text-sm text-blue-600 hover:underline"
            >
              {showReset ? 'Cancel Reset' : 'Forgot vault password?'}
            </button>
          </div>

          {showReset && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 mb-3">Reset vault password using your login (admin) password</p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your login password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  value={newVaultPassword}
                  onChange={(e) => setNewVaultPassword(e.target.value)}
                  placeholder="New vault password (min 6 chars)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  disabled={resetLoading || !loginPassword || !newVaultPassword}
                  onClick={async () => {
                    setResetLoading(true);
                    setError('');
                    try {
                      const res = await fetch(`${API_BASE}/reset-with-login-password`, {
                        method: 'POST',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ login_password: loginPassword, new_vault_password: newVaultPassword }),
                      });
                      const data = await res.json();
                      if (!res.ok) { setError(data.error || 'Reset failed'); return; }
                      sessionStorage.setItem('vaultToken', data.vaultToken);
                      toast.success('Vault password reset. Vault unlocked.');
                      onUnlock();
                    } catch { setError('Network error'); } finally { setResetLoading(false); }
                  }}
                  className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-medium rounded-lg text-sm"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Vault Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────
function VaultSetupScreen({ onSetup }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/setup`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          security_question: securityQuestion || undefined,
          security_answer: securityAnswer || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to set up vault');
        return;
      }

      sessionStorage.setItem('vaultToken', data.vaultToken);
      toast.success('Vault created successfully!');
      onSetup();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <HiOutlineShieldCheck className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center text-gray-900 mb-1">
            Set Up Secure Vault
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Create a vault password to protect your sensitive documents.
            This is separate from your login password.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vault Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Question <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder="e.g., What is your mother's maiden name?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {securityQuestion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Answer
                </label>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Your answer"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Vault...
                </>
              ) : (
                <>
                  <HiOutlineShieldCheck className="w-5 h-5" />
                  Create Secure Vault
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Dialog ────────────────────────────────────────────
function UploadDialog({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [folderName, setFolderName] = useState('Other');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setDocumentName('');
      setDocumentType('');
      setFolderName('Other');
      setNotes('');
    }
  }, [open]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!documentName) {
        setDocumentName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !documentName || !documentType) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_name', documentName);
      formData.append('document_type', documentType);
      formData.append('folder_name', folderName);
      if (notes) formData.append('notes', notes);

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: getVaultHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'VAULT_EXPIRED' || data.code === 'VAULT_LOCKED') {
          toast.error('Vault session expired. Please unlock again.');
          sessionStorage.removeItem('vaultToken');
          window.location.reload();
          return;
        }
        throw new Error(data.error || 'Upload failed');
      }

      toast.success('Document uploaded successfully');
      onUploaded();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-5 space-y-4">
          {/* File Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.doc,.docx,.xls,.xlsx,.csv,.txt,.webp"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <HiOutlineDocument className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <HiOutlineArrowUpTray className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to select a file</p>
                <p className="text-xs text-gray-400 mt-1">PDF, images, documents up to 25MB</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., PAN Card - Company"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            >
              <option value="">Select type...</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
            <select
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {FOLDERS.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || !documentName || !documentType}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <HiOutlineArrowUpTray className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Share Dialog ─────────────────────────────────────────────
function ShareDialog({ open, onClose, document: doc }) {
  const [method, setMethod] = useState('whatsapp');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && doc) {
      setRecipient('');
      setMessage(`Sharing document: ${doc.document_name} (${doc.document_type})`);
    }
  }, [open, doc]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!recipient) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { ...getVaultHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, recipient, message }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Share failed');
      }

      if (method === 'whatsapp' && data.shareUrl) {
        window.open(data.shareUrl, '_blank');
        toast.success('Opening WhatsApp...');
      } else if (method === 'email') {
        if (data.method === 'smtp') {
          toast.success('Email sent successfully!');
        } else if (data.mailtoUrl) {
          window.open(data.mailtoUrl, '_blank');
          toast.success('Opening email client...');
        }
      }

      onClose();
    } catch (err) {
      toast.error(err.message || 'Share failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Share Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleShare} className="p-5 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{doc.document_name}</p>
            <p className="text-xs text-gray-500">{doc.document_type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Share via</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMethod('whatsapp')}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  method === 'whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  method === 'email'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Email
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {method === 'whatsapp' ? 'Phone Number' : 'Email Address'}
            </label>
            <input
              type={method === 'whatsapp' ? 'tel' : 'email'}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={method === 'whatsapp' ? 'e.g., 9876543210' : 'e.g., name@company.com'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !recipient}
              className={`px-4 py-2 text-sm text-white rounded-lg transition-colors flex items-center gap-2 ${
                method === 'whatsapp'
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiOutlineShare className="w-4 h-4" />
              )}
              {method === 'whatsapp' ? 'Send via WhatsApp' : 'Send via Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Change Password Dialog ───────────────────────────────────
function ChangePasswordDialog({ open, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  const handleChange = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: { ...getVaultHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      toast.success('Vault password changed successfully');
      onClose();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Change Vault Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleChange} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────
function DocumentCard({ doc, onDownload, onShare, onDelete }) {
  const FileIcon = getFileIcon(doc.mime_type);
  const isImage = doc.mime_type?.startsWith('image/');

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="h-32 bg-gray-50 rounded-t-lg flex items-center justify-center border-b border-gray-100 overflow-hidden">
        {isImage ? (
          <img
            src={`/uploads/secure-vault/${doc.file_path.split('/').pop()}`}
            alt={doc.document_name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`flex flex-col items-center ${isImage ? 'hidden' : ''}`}>
          <FileIcon className="w-10 h-10 text-gray-400" />
          <span className="text-xs text-gray-400 mt-1">
            {doc.mime_type?.split('/').pop()?.toUpperCase() || 'FILE'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 truncate" title={doc.document_name}>
          {doc.document_name}
        </h4>
        <p className="text-xs text-gray-500 mt-0.5">{doc.document_type}</p>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{formatFileSize(doc.file_size)}</span>
          <span>{formatDate(doc.created_at)}</span>
        </div>

        {doc.notes && (
          <p className="text-xs text-gray-400 mt-1 truncate" title={doc.notes}>
            {doc.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => onDownload(doc)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Download"
          >
            <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={() => onShare(doc)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Share"
          >
            <HiOutlineShare className="w-3.5 h-3.5" />
            Share
          </button>
          <button
            onClick={() => onDelete(doc)}
            className="flex items-center justify-center py-1.5 px-2 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <HiOutlineTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Vault Content ───────────────────────────────────────
function VaultContent({ onLock }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [shareDoc, setShareDoc] = useState(null);

  // Auto-lock timer (15 minutes of inactivity)
  const autoLockTimer = useRef(null);
  const AUTO_LOCK_MS = 15 * 60 * 1000;

  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    autoLockTimer.current = setTimeout(() => {
      sessionStorage.removeItem('vaultToken');
      toast('Vault auto-locked due to inactivity', { icon: '🔒' });
      onLock();
    }, AUTO_LOCK_MS);
  }, [onLock]);

  useEffect(() => {
    resetAutoLockTimer();
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetAutoLockTimer));

    return () => {
      if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
      events.forEach((evt) => window.removeEventListener(evt, resetAutoLockTimer));
    };
  }, [resetAutoLockTimer]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFolder) params.set('folder_name', activeFolder);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`${API_BASE}/documents?${params.toString()}`, {
        headers: getVaultHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'VAULT_EXPIRED' || data.code === 'VAULT_LOCKED') {
          sessionStorage.removeItem('vaultToken');
          toast.error('Vault session expired');
          onLock();
          return;
        }
        throw new Error(data.error);
      }

      setDocuments(data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [activeFolder, searchQuery, onLock]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = async (doc) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}/download`, {
        headers: getVaultHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.document_name + (doc.file_path ? '.' + doc.file_path.split('.').pop() : '');
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Download started');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.document_name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: getVaultHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleShare = (doc) => {
    setShareDoc(doc);
    setShowShareDialog(true);
  };

  const handleLock = () => {
    sessionStorage.removeItem('vaultToken');
    toast.success('Vault locked');
    onLock();
  };

  // Count documents per folder
  const folderCounts = {};
  documents.forEach((doc) => {
    folderCounts[doc.folder_name] = (folderCounts[doc.folder_name] || 0) + 1;
  });

  const filteredDocs = documents;

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secure Document Vault</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Your password-protected document storage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <HiOutlineKey className="w-4 h-4" />
            Change Password
          </button>
          <button
            onClick={() => setShowUploadDialog(true)}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <HiOutlineArrowUpTray className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={handleLock}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <HiOutlineLockClosed className="w-4 h-4" />
            Lock
          </button>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveFolder(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            !activeFolder
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          All ({documents.length})
        </button>
        {FOLDERS.map((folder) => {
          const FolderIcon = folder.icon;
          const count = folderCounts[folder.id] || 0;
          const isActive = activeFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(isActive ? null : folder.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5 ${
                isActive
                  ? `${colorMap[folder.color]} border-current`
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FolderIcon className="w-3.5 h-3.5" />
              {folder.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <HiOutlineXMark className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20">
          <HiOutlineFolder className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600">
            {searchQuery || activeFolder ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery || activeFolder
              ? 'Try a different search or folder'
              : 'Upload your first document to get started'}
          </p>
          {!searchQuery && !activeFolder && (
            <button
              onClick={() => setShowUploadDialog(true)}
              className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <HiOutlineArrowUpTray className="w-4 h-4" />
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUploaded={fetchDocuments}
      />
      <ShareDialog
        open={showShareDialog}
        onClose={() => { setShowShareDialog(false); setShareDoc(null); }}
        document={shareDoc}
      />
      <ChangePasswordDialog
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────
export default function SecureVaultPage() {
  const [vaultStatus, setVaultStatus] = useState(null); // null = loading, 'not_setup', 'locked', 'unlocked'
  const [loading, setLoading] = useState(true);

  const checkVaultStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.isSetup) {
        setVaultStatus('not_setup');
      } else {
        // Check if we have a valid vault token in session
        const vaultToken = sessionStorage.getItem('vaultToken');
        if (vaultToken) {
          // Verify token is still valid by trying to list documents
          const testRes = await fetch(`${API_BASE}/documents`, {
            headers: getVaultHeaders(),
          });
          if (testRes.ok) {
            setVaultStatus('unlocked');
          } else {
            sessionStorage.removeItem('vaultToken');
            setVaultStatus('locked');
          }
        } else {
          setVaultStatus('locked');
        }
      }
    } catch (err) {
      toast.error('Failed to check vault status');
      setVaultStatus('locked');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading vault...</span>
        </div>
      </div>
    );
  }

  if (vaultStatus === 'not_setup') {
    return <VaultSetupScreen onSetup={() => setVaultStatus('unlocked')} />;
  }

  if (vaultStatus === 'locked') {
    return <VaultLockScreen onUnlock={() => setVaultStatus('unlocked')} />;
  }

  return <VaultContent onLock={() => setVaultStatus('locked')} />;
}
