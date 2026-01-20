import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ShieldCheck,
  GraduationCap,
  Search,
  Upload,
  Loader2,
  CheckCircle2,
  FileText,
  ExternalLink,
  AlertCircle,
  LockKeyhole,
  LogOut,
  History,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api";
const IPFS_GATEWAY = "http://localhost:8080/ipfs";

function App() {
  const [activeTab, setActiveTab] = useState<"verify" | "admin">("verify");
  const [adminMode, setAdminMode] = useState<"issue" | "revoke">("issue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [verifyMethod, setVerifyMethod] = useState<"id" | "file">("id");
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    isMatch: boolean;
    msg: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token"),
  );

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [certId, setCertId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    studentName: "",
    nim: "",
    degree: "",
  });
  const [revokeData, setRevokeData] = useState({ id: "", reason: "" });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getFriendlyError = (err: any) => {
    const msg = err.response?.data?.error || err.message || "";
    if (msg.includes("VALIDATION_ERROR"))
      return "Mohon periksa kembali, format data belum sesuai.";
    if (msg.includes("IPFS_ERROR"))
      return "Gagal mengunggah ke IPFS. Silakan coba sesaat lagi.";
    if (msg.includes("BLOCKCHAIN_ERROR"))
      return "Sistem Blockchain sibuk atau ID sudah terdaftar.";
    if (msg.includes("401"))
      return "Sesi Anda telah berakhir. Silakan login kembali.";
    if (msg.includes("not found"))
      return "Ijazah tidak ditemukan dalam database Blockchain.";
    return msg || "Terjadi kesalahan sistem. Silakan coba lagi.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await axios.post(`${BACKEND_URL}/login`, loginData);
      setToken(resp.data.token);
      localStorage.setItem("admin_token", resp.data.token);
      setLoginData({ username: "", password: "" });
    } catch (err) {
      setError("Username atau Password salah. Akses ditolak.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("admin_token");
    setActiveTab("verify");
    setResult(null);
    setHistory([]);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi tambahan sebelum kirim ke backend
    if (!certId) return;
    if (verifyMethod === "file" && !verifyFile) {
      setError("Silakan pilih file PDF terlebih dahulu.");
      return;
    }

    if (!certId) return;
    setLoading(true);
    setError("");
    setResult(null);
    setHistory([]);
    setVerificationStatus(null);

    try {
      if (verifyMethod === "id") {
        const resp = await axios.get(`${BACKEND_URL}/verify/${certId}`);
        setResult(resp.data);
        const hResp = await axios.get(`${BACKEND_URL}/history/${resp.data.id}`);
        setHistory(hResp.data);
      } else {
        // Verifikasi via File
        if (!verifyFile || !certId) throw new Error("ID dan File wajib diisi.");

        const data = new FormData();
        data.append("file", verifyFile);
        data.append("id", certId);

        const resp = await axios.post(`${BACKEND_URL}/verify-file`, data);
        setResult(resp.data.blockchainData);
        setVerificationStatus({
          isMatch: resp.data.isMatch,
          msg: resp.data.message,
        });

        const hResp = await axios.get(
          `${BACKEND_URL}/history/${resp.data.blockchainData.id}`,
        );
        setHistory(hResp.data);
      }
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile)
      return setError("Silakan pilih dokumen PDF ijazah terlebih dahulu.");
    setLoading(true);
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => data.append(k, v));
    data.append("file", selectedFile);

    try {
      await axios.post(`${BACKEND_URL}/issue`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("BERHASIL: Ijazah telah resmi terdaftar di Blockchain.");
      setFormData({ id: "", studentName: "", nim: "", degree: "" });
      setSelectedFile(null);
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Peringatan: Pencabutan ijazah bersifat permanen. Lanjutkan?",
      )
    )
      return;
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/revoke`, revokeData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("BERHASIL: Ijazah telah dicabut.");
      setRevokeData({ id: "", reason: "" });
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-indigo-100">
      {/* FLOATING ERROR NOTIFICATION */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-start justify-between border border-red-500">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm font-bold leading-tight">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="hover:bg-white/20 p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 grid grid-cols-3 items-center max-w-6xl">
          {/* SISI KIRI: LOGO */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap">
              Academic<span className="text-indigo-600">Trust</span>
            </h1>
          </div>

          {/* SISI TENGAH: NAVIGASI (Tetap di tengah karena grid-cols-3) */}
          <div className="flex justify-center">
            <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab("verify")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "verify" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
              >
                Verifikasi
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "admin" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}
              >
                Portal Kampus
              </button>
            </nav>
          </div>

          {/* SISI KANAN: LOGOUT (Hanya muncul di tab admin & jika token ada) */}
          <div className="flex justify-end">
            {token && activeTab === "admin" && (
              <button
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full border border-transparent hover:border-red-100 transition-all"
                title="Log Out"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {activeTab === "verify" ? (
          /* ============================================================
             TAB VERIFIKASI - MENGGUNAKAN VERSI LEBAR & MEWAH
             ============================================================ */
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-5xl font-black text-slate-800 tracking-tight">
                Cek Keaslian Ijazah
              </h2>
              <p className="text-lg text-slate-500 font-medium italic">
                Validasi integritas data akademik Anda langsung ke Ledger
                Blockchain.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {/* Switcher Metode */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setVerifyMethod("id");
                    setVerificationStatus(null); // Hapus status file
                    setResult(null); // Hapus hasil ijazah
                    setHistory([]); // Hapus riwayat
                    setCertId(""); // Kosongkan input
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${verifyMethod === "id" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}
                >
                  Cari ID / Nama
                </button>
                <button
                  onClick={() => {
                    setVerifyMethod("file");
                    setVerificationStatus(null); // Hapus status file
                    setResult(null); // Hapus hasil ijazah
                    setHistory([]); // Hapus riwayat
                    setCertId(""); // Kosongkan input
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${verifyMethod === "file" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}
                >
                  Unggah File PDF
                </button>
              </div>

              <form
                onSubmit={handleVerify}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100 space-y-4"
              >
                <input
                  type="text"
                  placeholder="Masukkan ID Ijazah untuk lookup"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-semibold"
                  value={certId}
                  onChange={(e) => {
                    setCertId(e.target.value);
                    // Tambahkan 3 baris di bawah ini:
                    setResult(null);
                    setVerificationStatus(null);
                    setHistory([]);
                  }}
                />

                {verifyMethod === "file" && (
                  <div className="border-2 border-dashed border-slate-300 p-6 rounded-2xl text-center">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        setVerifyFile(e.target.files?.[0] || null)
                      }
                      className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                )}

                <button
                  disabled={
                    loading ||
                    !certId ||
                    (verifyMethod === "file" && !verifyFile)
                  }
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  Mulai Verifikasi Blockchain
                </button>
              </form>
            </div>

            {/* Tampilkan Status Kecocokan File jika ada */}
            {verificationStatus && (
              <div
                className={`max-w-5xl mx-auto mt-8 p-6 rounded-3xl border-2 flex items-center gap-4 ${verificationStatus.isMatch ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
              >
                {verificationStatus.isMatch ? (
                  <CheckCircle2 size={32} />
                ) : (
                  <AlertTriangle size={32} />
                )}
                <p className="text-lg font-black">{verificationStatus.msg}</p>
              </div>
            )}

            {/* --- AREA HASIL VERIFIKASI --- */}
            {result && (
              <div className="space-y-10 animate-in zoom-in-80 duration-500">
                {/* JIKA METODE = CARI ID / NAMA: Tampilkan Kartu Mewah (Visualisasi Sertifikat) */}
                {verifyMethod === "id" && (
                  <div
                    className={`bg-white border-2 rounded-[3.5rem] shadow-2xl overflow-hidden max-w-5xl mx-auto ${result.status === "REVOKED" ? "border-red-200" : "border-green-100"}`}
                  >
                    <div
                      className={`${result.status === "REVOKED" ? "bg-red-600" : "bg-green-600"} p-5 text-white flex justify-between items-center px-12`}
                    >
                      <span className="text-sm font-black uppercase tracking-[0.2em]">
                        {result.status === "REVOKED"
                          ? "Invalid / Revoked Document"
                          : "Verified Certificate"}
                      </span>
                      {result.status === "REVOKED" ? (
                        <AlertTriangle size={24} />
                      ) : (
                        <CheckCircle2 size={24} />
                      )}
                    </div>

                    <div className="p-10 space-y-12">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <div className="space-y-2 text-left">
                          <h3 className="text-6xl font-black text-slate-800 uppercase leading-tight">
                            {result.studentName}
                          </h3>
                          <p className="text-2xl text-indigo-600 font-bold tracking-wide">
                            {result.degree}
                          </p>
                        </div>
                        <div className="bg-slate-50 px-8 py-6 rounded-3xl border border-slate-300 min-w-[50px] text-center md:text-right">
                          <p className="md:text-center text-xs text-slate-400 font-black uppercase tracking-tighter mb-1 font-bold">
                            Nomor Induk Mahasiswa
                          </p>
                          <p className="md:text-center font-mono font-black text-4xl text-slate-700">
                            {result.nim}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-10 border-y border-slate-900">
                        <div className="text-left">
                          <p className="text-xs text-slate-400 font-black uppercase mb-2 tracking-widest">
                            Tanggal Terbit
                          </p>
                          <p className="text-xl font-bold text-slate-700">
                            {new Date(result.issueDate).toLocaleDateString(
                              "id-ID",
                              { dateStyle: "long" },
                            )}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-slate-400 font-black uppercase mb-2 tracking-widest">
                            ID Ijazah
                          </p>
                          <p className="text-xl font-mono font-bold text-slate-700">
                            {result.id}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-slate-400 font-black uppercase mb-2 tracking-widest">
                            Status Keabsahan
                          </p>
                          <p
                            className={`text-xl font-black uppercase ${result.status === "REVOKED" ? "text-red-600 underline" : "text-green-600"}`}
                          >
                            {result.status || "VALID"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-300">
                        <div className="flex items-center gap-4 mb-4">
                          <FileText className="text-indigo-600" size={28} />
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 text-left">
                            Hash Dokumen Ijazah
                          </p>
                        </div>
                        <a
                          href={`${IPFS_GATEWAY}/${result.ipfsHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-6 bg-white rounded-2xl border-2 border-transparent hover:border-indigo-400 transition-all group text-left"
                        >
                          <p className="font-mono text-lg text-slate-600 break-all leading-relaxed group-hover:text-indigo-700">
                            {result.ipfsHash}
                          </p>
                          <div className="mt-4 flex items-center gap-10 text-indigo-500 font-bold text-sm">
                            Lihat Dokumen Asli <ExternalLink size={16} />
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* JIKA METODE = UNGGAH FILE: Tampilkan Laporan Integritas Hash */}
                {verifyMethod === "file" && verificationStatus && (
                  <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                    <div
                      className={`p-10 rounded-[2.5rem] border-4 shadow-2xl bg-white ${verificationStatus.isMatch ? "border-green-500" : "border-red-500"}`}
                    >
                      <div className="flex items-center gap-6 mb-8 text-left">
                        {verificationStatus.isMatch ? (
                          <div className="bg-green-100 p-4 rounded-2xl text-green-600">
                            <ShieldCheck size={48} />
                          </div>
                        ) : (
                          <div className="bg-red-100 p-4 rounded-2xl text-red-600">
                            <AlertTriangle size={48} />
                          </div>
                        )}
                        <div>
                          <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                            Laporan Integritas File
                          </h3>
                          <p
                            className={`text-lg font-bold ${verificationStatus.isMatch ? "text-green-600" : "text-red-600"}`}
                          >
                            {verificationStatus.msg}
                          </p>
                        </div>
                      </div>

                      {verificationStatus.isMatch ? (
                        <div className="grid grid-cols-1 gap-4 text-left border-t pt-8">
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              Hash File (IPFS CID)
                            </p>
                            <p className="font-mono text-sm break-all text-slate-600">
                              {result.ipfsHash}
                            </p>
                          </div>
                          <div className="flex justify-between items-center bg-green-50 p-6 rounded-2xl border border-green-100 text-green-900">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Metadata Blockchain
                              </p>
                              <p className="text-xl font-black">
                                {result.studentName} ({result.nim})
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Status
                              </p>
                              <p className="text-xl font-black text-green-600">
                                {result.status || "VALID"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-left">
                          <p className="text-red-800 font-bold text-lg mb-2">
                            ⚠ Dokumen Ini Tidak Sah
                          </p>
                          <p className="text-red-600 text-sm leading-relaxed">
                            Meskipun ID <strong>{certId}</strong> terdaftar di
                            sistem, file yang Anda unggah memiliki tanda tangan
                            digital yang berbeda. Hal ini menunjukkan bahwa file
                            tersebut telah{" "}
                            <strong>dimodifikasi secara ilegal</strong> atau
                            bukan merupakan file asli yang diterbitkan
                            universitas.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* RIWAYAT LEDGER: Hanya tampil jika pencarian teks ATAU jika file cocok */}
                {(verifyMethod === "id" ||
                  (verifyMethod === "file" && verificationStatus?.isMatch)) &&
                  history.length > 0 && (
                    <div className="max-w-5xl mx-auto space-y-8 pt-10 text-left">
                      <h4 className="text-2xl font-black flex items-center gap-4 text-slate-800 uppercase tracking-widest">
                        <History size={32} className="text-indigo-600" />{" "}
                        Riwayat Ledger Blockchain
                      </h4>
                      <div className="space-y-8 relative border-l-4 border-indigo-500 ml-20 pl-11">
                        {history.map((record: any) => (
                          <div
                            key={record.txId}
                            className="relative bg-white p-10 rounded-[2.5rem] shadow-md border border-slate-900 hover:shadow-xl transition-all duration-300"
                          >
                            <div
                              className={`absolute -left-[62px] top-12 w-8 h-8 rounded-full border-4 border-white shadow-md ${record.data?.status === "REVOKED" ? "bg-red-600" : "bg-green-600"}`}
                            ></div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                              <span
                                className={`px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.1em] ${record.data?.status === "REVOKED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
                              >
                                {record.data?.status || "VALID"}
                              </span>
                              <span className="text-base font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 uppercase tracking-tighter">
                                {new Date(record.timestamp).toLocaleString(
                                  "id-ID",
                                  { dateStyle: "full", timeStyle: "medium" },
                                )}
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 leading-relaxed mb-8">
                              {record.data?.status === "REVOKED"
                                ? `Proses Pencabutan: ${record.data?.revocationReason}`
                                : "Ijazah Resmi diterbitkan ke dalam Blockchain."}
                            </p>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">
                                Transaction ID (Verified Hash)
                              </p>
                              <p className="font-mono text-sm text-slate-300 break-all leading-relaxed">
                                {record.txId}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================
             TAB PORTAL KAMPUS - MENGGUNAKAN VERSI KOMPAK (MAX-W-2XL)
             ============================================================ */
          <div className="max-w-2xl mx-auto">
            {!token ? (
              /* LOGIN FORM KOMPAK */
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 text-center space-y-10 animate-in zoom-in-95">
                <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
                  <LockKeyhole size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    Portal Akses
                  </h2>
                  <p className="text-slate-400 font-medium text-sm">
                    Otoritas Universitas Terdaftar
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  <input
                    type="text"
                    placeholder="Admin Username"
                    className="w-full border-2 border-slate-100 p-4 rounded-xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={loginData.username}
                    onChange={(e) =>
                      setLoginData({ ...loginData, username: e.target.value })
                    }
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full border-2 border-slate-100 p-4 rounded-xl font-bold outline-none focus:border-indigo-500 transition-all"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                  <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 uppercase tracking-widest transition-all">
                    {loading ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Masuk ke Sistem"
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* DASHBOARD ADMIN KOMPAK */
              <div className="space-y-8 animate-in slide-in-from-bottom-8">
                <div className="flex bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm">
                  <button
                    onClick={() => setAdminMode("issue")}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${adminMode === "issue" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"}`}
                  >
                    <GraduationCap size={16} /> Terbitkan
                  </button>
                  <button
                    onClick={() => setAdminMode("revoke")}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${adminMode === "revoke" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"}`}
                  >
                    <Trash2 size={16} /> Cabut
                  </button>
                </div>

                {adminMode === "issue" ? (
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6 text-left">
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      Registrasi Ijazah Baru
                    </h3>
                    <form onSubmit={handleIssue} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                            ID Ijazah
                          </label>
                          <input
                            type="text"
                            placeholder="CERT-001"
                            className="w-full border-2 border-slate-900 p-3.5 rounded-xl font-bold focus:border-indigo-500 outline-none"
                            value={formData.id}
                            onChange={(e) =>
                              setFormData({ ...formData, id: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                            Nomor Induk Mahasiswa
                          </label>
                          <input
                            type="text"
                            placeholder="2026xxxx"
                            className="w-full border-2 border-slate-900 p-3.5 rounded-xl font-bold focus:border-indigo-500 outline-none"
                            value={formData.nim}
                            onChange={(e) =>
                              setFormData({ ...formData, nim: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                          Nama Lengkap Mahasiswa
                        </label>
                        <input
                          type="text"
                          placeholder="Nama Sesuai Dokumen"
                          className="w-full border-2 p-3.5 rounded-xl font-bold outline-none focus:border-indigo-500"
                          value={formData.studentName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              studentName: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                          Program Studi & Gelar
                        </label>
                        <input
                          type="text"
                          placeholder="S1 - Sistem Informasi"
                          className="w-full border-2 p-3.5 rounded-xl font-bold outline-none focus:border-indigo-500"
                          value={formData.degree}
                          onChange={(e) =>
                            setFormData({ ...formData, degree: e.target.value })
                          }
                          required
                        />
                      </div>

                      {/* FILE UPLOAD DENGAN INFORMASI UKURAN FILE */}
                      <div
                        className={`p-8 border-4 border-dashed rounded-3xl flex flex-col items-center gap-3 transition-all ${selectedFile ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200 hover:border-indigo-200"}`}
                      >
                        {selectedFile ? (
                          <div className="text-center space-y-2">
                            <CheckCircle2
                              size={40}
                              className="text-green-500 mx-auto"
                            />
                            <div className="space-y-1">
                              <p className="text-sm font-bold truncate max-w-[250px] mx-auto">
                                {selectedFile.name}
                              </p>
                              {/* INFO UKURAN FILE */}
                              <p className="text-[10px] font-black text-indigo-500 uppercase bg-white px-2 py-1 rounded-md border inline-block">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                                MB • PDF DOCUMENT
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedFile(null)}
                              className="text-red-500 text-[10px] font-black uppercase hover:underline block mx-auto"
                            >
                              Ganti File
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload size={32} className="text-slate-300" />
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Pilih PDF Ijazah
                              </p>
                              <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">
                                Maksimal Ukuran 10 MB
                              </p>
                            </div>
                            <label className="cursor-pointer bg-slate-800 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-md">
                              Pilih File
                              <input
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) =>
                                  setSelectedFile(e.target.files?.[0] || null)
                                }
                              />
                            </label>
                          </>
                        )}
                      </div>

                      <button
                        disabled={loading || !selectedFile}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 disabled:bg-slate-200 uppercase tracking-widest transition-all"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin mx-auto" />
                        ) : (
                          "Daftarkan ke Blockchain"
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* FORM REVOKE KOMPAK */
                  <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border-2 border-red-50 space-y-6 text-left">
                    <div className="flex items-center gap-3 text-red-600">
                      <AlertTriangle size={24} />
                      <h3 className="text-lg font-black uppercase tracking-tight">
                        Otoritas Pencabutan
                      </h3>
                    </div>
                    <p className="text-xs text-red-500 font-bold italic leading-relaxed">
                      Peringatan: Tindakan ini permanen. Pastikan ID target
                      sudah benar.
                    </p>
                    <form onSubmit={handleRevoke} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                          ID Ijazah
                        </label>
                        <input
                          type="text"
                          placeholder="CERT-XXXX"
                          className="w-full border-2 border-slate-900 p-3.5 rounded-xl font-bold outline-none focus:border-red-500"
                          value={revokeData.id}
                          onChange={(e) =>
                            setRevokeData({ ...revokeData, id: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                          Alasan Resmi
                        </label>
                        <textarea
                          placeholder="Masukkan alasan pencabutan..."
                          className="w-full border-2 border-slate-900 p-3.5 rounded-xl font-bold outline-none focus:border-red-500 h-28 resize-none text-sm leading-relaxed"
                          value={revokeData.reason}
                          onChange={(e) =>
                            setRevokeData({
                              ...revokeData,
                              reason: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <button
                        disabled={loading || !revokeData.id}
                        className="w-full bg-red-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-red-700 uppercase tracking-widest transition-all"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin mx-auto" />
                        ) : (
                          "Cabut Ijazah Sekarang"
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
