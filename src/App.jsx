import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PlusCircle, Trash2, ArrowUpCircle, ArrowDownCircle, Calendar, Wallet, LogOut, LogIn, UserPlus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function App() {
  // --- STATE KHUSUS AUTH ---
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // Untuk tukar tampilan Login/Daftar

  // --- STATE TRANSAKSI (SAMA SEPERTI SEBELUMNYA) ---
  const [transaksi, setTransaksi] = useState([]);
  const [keterangan, setKeterangan] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [tipe, setTipe] = useState('masuk');
  const [tanggalInput, setTanggalInput] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // --- LOGIKA PENGECEKAN SESSION ---
  useEffect(() => {
    // Ambil sesi login saat ini
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Pantau jika ada perubahan status (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  async function fetchData() {
    const { data } = await supabase.from('transaksi').select('*').order('created_at', { ascending: false });
    setTransaksi(data || []);
  }

  // --- FUNGSI AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Cek email Anda untuk konfirmasi pendaftaran!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransaksi([]); // Kosongkan data saat logout
  };

  // --- FUNGSI TRANSAKSI (DENGAN USER_ID) ---
  async function handleSubmit(e) {
    e.preventDefault();
    if (!keterangan || !jumlah) return;
    
    // Kirim data + ID User yang sedang login
    const { error } = await supabase.from('transaksi').insert([{ 
      keterangan, 
      jumlah: parseInt(jumlah), 
      tipe, 
      created_at: new Date(tanggalInput).toISOString(),
      user_id: session.user.id 
    }]);

    if (!error) { setKeterangan(''); setJumlah(''); fetchData(); }
  }

  async function hapusItem(id) {
    await supabase.from('transaksi').delete().eq('id', id);
    fetchData();
  }

  // --- LOGIKA PERHITUNGAN ---
  const transaksiBulanan = transaksi.filter(t => {
    const tgl = new Date(t.created_at);
    return tgl.getMonth() === selectedMonth && tgl.getFullYear() === selectedYear;
  });
  const totalMasuk = transaksiBulanan.filter(t => t.tipe === 'masuk').reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalKeluar = transaksiBulanan.filter(t => t.tipe === 'keluar').reduce((acc, curr) => acc + curr.jumlah, 0);
  const saldo = totalMasuk - totalKeluar;
  const dataGrafik = [{ name: 'Masuk', value: totalMasuk || 0 }, { name: 'Keluar', value: totalKeluar || 0 }];
  const COLORS = ['#10B981', '#EF4444'];

  // --- TAMPILAN JIKA BELUM LOGIN ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="flex justify-center mb-6 text-blue-600"><Wallet size={48}/></div>
          <h2 className="text-2xl font-black text-center mb-6 uppercase tracking-tight">
            {isRegistering ? 'Daftar Akun' : 'Masuk CuanTracker'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-blue-400 transition" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-blue-400 transition" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
              {isRegistering ? <UserPlus size={20}/> : <LogIn size={20}/>}
              {isRegistering ? 'Daftar Sekarang' : 'Masuk'}
            </button>
          </form>
          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-4 text-sm text-blue-600 font-bold">
            {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar gratis'}
          </button>
        </div>
      </div>
    );
  }

  // --- TAMPILAN DASHBOARD (JIKA SUDAH LOGIN) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><Wallet size={24}/></div>
          <h1 className="text-xl font-bold">CuanTracker</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400">PENGGUNA</p>
            <p className="text-xs font-bold text-slate-600">{session.user.email}</p>
          </div>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 p-2 rounded-xl hover:bg-red-100 transition shadow-sm border border-red-100"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM KIRI: STATS & GRAFIK */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
             <div className="flex justify-between items-center mb-6">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Saldo {daftarBulan[selectedMonth]}</p>
                <div className="flex gap-2 bg-white/20 p-1 rounded-xl">
                  <select className="bg-transparent text-[10px] font-bold outline-none cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                    {daftarBulan.map((bln, index) => <option key={index} value={index} className="text-black">{bln}</option>)}
                  </select>
                </div>
             </div>
             <h2 className="text-4xl font-black mb-6">Rp {saldo.toLocaleString('id-ID')}</h2>
             <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
                <div>
                  <p className="text-blue-200 text-[10px] font-bold uppercase">Masuk</p>
                  <p className="text-lg font-bold">+{totalMasuk.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-[10px] font-bold uppercase">Keluar</p>
                  <p className="text-lg font-bold">-{totalKeluar.toLocaleString()}</p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-400 text-[10px] uppercase mb-4 tracking-widest">Visualisasi Arus Kas</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataGrafik} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {dataGrafik.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* KOLOM KANAN: INPUT & RIWAYAT */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="font-bold text-sm mb-6 flex items-center gap-2"><PlusCircle size={20} className="text-blue-600"/> Tambah Catatan Keuangan</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" placeholder="Nasi Goreng..." value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
              <input type="number" className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" placeholder="Jumlah (Rp)" value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
              <input type="date" className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm outline-none" value={tanggalInput} onChange={(e) => setTanggalInput(e.target.value)} />
              <div className="flex gap-2">
                <select className="bg-slate-100 rounded-2xl p-4 text-xs font-bold flex-1 cursor-pointer" value={tipe} onChange={(e) => setTipe(e.target.value)}>
                  <option value="masuk">Masuk</option>
                  <option value="keluar">Keluar</option>
                </select>
                <button className="bg-blue-600 text-white px-6 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100"><PlusCircle size={24}/></button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest">Riwayat Aktivitas</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase italic">{session.user.email}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Transaksi</th>
                    <th className="px-8 py-4 text-right">Nominal</th>
                    <th className="px-8 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transaksiBulanan.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${t.tipe === 'masuk' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {t.tipe === 'masuk' ? <ArrowUpCircle size={18}/> : <ArrowDownCircle size={18}/>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">{t.keterangan}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{new Date(t.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-8 py-5 text-right font-black text-sm ${t.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.tipe === 'masuk' ? '+' : '-'} Rp {t.jumlah.toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => hapusItem(t.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transaksiBulanan.length === 0 && (
                <div className="text-center py-20 bg-white">
                  <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 text-sm italic">Belum ada catatan di periode ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}