# Panel Admin — Bank Mata RSCM

Repository khusus website internal petugas. Website formulir masyarakat tetap berada di repository `Alfin354313/layanan-bankmata`.

`index.html`: login petugas; `admin.html`: dashboard. Login dan akses data menggunakan Supabase Authentication dan RLS serta tabel `bankmata_staff`.

**Deploy:** buat project Vercel yang menunjuk ke repo ini, gunakan branch `feature/panel-admin-bankmata-v1` untuk Preview. Jangan aktifkan produksi sebelum pemeriksaan keamanan, MFA, audit akses baca, dan penguatan CSP. Tidak ada service-role key di browser.
