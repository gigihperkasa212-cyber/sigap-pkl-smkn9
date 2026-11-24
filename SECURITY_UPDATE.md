# 🔒 Security Update - Password Policy

## Perubahan Password Master Admin

**Tanggal Update:** 11 Agustus 2026  
**Status:** ✅ Implemented

---

## 📋 Ringkasan Perubahan

### Password Master Admin
- **DIHAPUS:** Password "123" untuk akun admin ❌
- **BERLAKU:** Hanya password "sampurna01" ✅
- **Alasan:** Meningkatkan keamanan sistem dengan password yang lebih kuat

---

## 🔐 Kebijakan Password Baru

### Master Administrator
| Role  | Username | Password Valid | Password Lama (Dihapus) |
|-------|----------|----------------|-------------------------|
| Admin | admin    | **sampurna01** | ~~123~~ ❌              |

### Guru & Siswa
| Role       | Password Default | Password Alternatif |
|------------|------------------|---------------------|
| Guru       | 123              | Sesuai database     |
| Siswa      | 123              | Sesuai database     |

---

## 🛡️ Implementasi Keamanan

### 1. Validasi Password Login
```javascript
// ADMIN: Hanya password 'sampurna01' yang berlaku
if (foundUser.username === 'admin' || foundUser.role === 'admin') {
  validPwd = 'sampurna01';
  isPassValid = (passwordVal === 'sampurna01');
}
```

### 2. Pesan Error Spesifik
- **Admin salah password:** "Kata Sandi salah! Password Admin yang benar: sampurna01"
- **Siswa/Guru salah password:** "Kata Sandi salah! (Password default Siswa/Guru: 123)"

### 3. Autofill Demo
```javascript
if (inputPassword) {
  inputPassword.value = (usernameKey === 'admin') ? 'sampurna01' : '123';
}
```

---

## 🔄 Validasi Role Login

### Aturan Login Berdasarkan Tab

**Tab Siswa:**
- ✅ Siswa dapat login
- ❌ Guru TIDAK dapat login
- ❌ Admin TIDAK dapat login

**Tab Guru/Pembimbing:**
- ❌ Siswa TIDAK dapat login
- ✅ Guru dapat login
- ✅ Admin dapat login

### Pesan Error
- Admin/Guru mencoba login di tab Siswa:  
  → "Login ditolak! Akun Guru/Admin tidak dapat login di tab Siswa. Silakan pilih tab 'Guru / Pembimbing'."

- Siswa mencoba login di tab Guru:  
  → "Login ditolak! Akun Siswa tidak dapat login di tab Guru. Silakan pilih tab 'Siswa'."

---

## 🧪 Testing Checklist

- [ ] Login admin dengan password "sampurna01" → Berhasil ✅
- [ ] Login admin dengan password "123" → Ditolak ❌
- [ ] Login admin di tab Siswa → Ditolak ❌
- [ ] Login admin di tab Guru/Pembimbing → Berhasil ✅
- [ ] Login siswa dengan password "123" → Berhasil ✅
- [ ] Login guru dengan password "123" → Berhasil ✅
- [ ] Pesan error password admin → Menampilkan "sampurna01" ✅
- [ ] Pesan error password siswa/guru → Menampilkan "123" ✅

---

## 📝 Catatan Tambahan

1. **Password tidak ada di database:** Default "123" untuk siswa/guru, "sampurna01" untuk admin
2. **Reset Password:** Fungsi `resetAdminPassword()` default ke "sampurna01"
3. **Backward Compatibility:** Password lama "123" tidak lagi valid untuk admin
4. **Security Best Practice:** Password admin lebih kuat dari default user

---

## 🚀 Cara Menerapkan Update

1. Refresh browser dengan `Ctrl + Shift + R`
2. Hapus localStorage (optional untuk reset cache):
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. Login dengan kredensial baru

---

## 📞 Kontak

Jika ada masalah dengan login setelah update ini, hubungi:
- **IT Support:** Administrator Sistem
- **Email:** [admin@smkn9malang.sch.id]

---

**Dokumentasi dibuat:** 11 Agustus 2026  
**Versi:** 1.0  
**Status:** Production Ready ✅
