import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.BANKMATA_SUPABASE;
const $=id=>document.getElementById(id);
const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const state={page:0,size:20,records:[],count:0,staff:false};
const labels={submitted:'Baru',under_review:'Ditinjau',education_pending:'Menunggu edukasi',ready_to_print:'Siap dicetak',completed:'Selesai',cancelled:'Dibatalkan'};
function show(auth){$('dashboard').hidden=!auth;$('account').hidden=!auth;$('sidebar').hidden=!auth}
function msg(id,value){$(id).textContent=value}
async function verify(){
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user){state.staff=false;show(false);location.replace('./index.html');return}
 const {data:role,error:roleError}=await db.from('bankmata_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(roleError||!role){await db.auth.signOut();state.staff=false;show(false);location.replace('./index.html');return}
 state.staff=true;msg('staffEmail',user.email||'Petugas');show(true);await load();
}
$('logout').addEventListener('click',async()=>{await db.auth.signOut();state.staff=false;state.records=[];show(false);location.replace('./index.html')});
async function load(){
 if(!state.staff)return;
 msg('dataMessage','Memuat data…');$('rows').replaceChildren();
 const status=$('status').value;
 let query=db.from('donor_registrations').select('id,registration_number,full_name,created_at,status,date_of_birth,gender,religion,phone,whatsapp,email,address,village,district,city,province,next_of_kin_name,next_of_kin_phone,next_of_kin_address,past_conditions,current_conditions,family_approval,information_source,privacy_consent_at',{count:'exact'}).order('created_at',{ascending:false}).range(state.page*state.size,(state.page+1)*state.size-1);
 if(status)query=query.eq('status',status);
 const {data,error,count}=await query;
 if(error){msg('dataMessage','Tidak dapat memuat data. Periksa izin akun atau koneksi.');return}
 state.records=data||[];state.count=count||0;render();
 msg('dataMessage',state.records.length?'':'Belum ada data pada halaman ini.');
 // Summary metrics are global counts, not just the current page.
 const categories=['','submitted','education_pending','completed'];
 const targets=['total','submitted','education','completed'];
 await Promise.all(categories.map(async(status,i)=>{
  let q=db.from('donor_registrations').select('id',{count:'exact',head:true});
  if(status)q=q.eq('status',status);
  const {count,error}=await q;msg(targets[i],error?'—':String(count??0));
 }));
}
function render(){
 const term=$('search').value.trim().toLocaleLowerCase('id');
 const filtered=state.records.filter(x=>!term||x.full_name?.toLocaleLowerCase('id').includes(term)||x.registration_number?.toLowerCase().includes(term));
 const tbody=$('rows');tbody.replaceChildren();
 for(const record of filtered){
  const tr=document.createElement('tr');
  for(const value of [record.registration_number,record.full_name,new Date(record.created_at).toLocaleDateString('id-ID'),labels[record.status]||record.status]){
   const td=document.createElement('td');td.textContent=value||'—';tr.append(td);
  }
  const action=document.createElement('td'),button=document.createElement('button');
  button.textContent='Lihat detail';button.addEventListener('click',()=>detail(record));action.append(button);tr.append(action);tbody.append(tr);
 }
 if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='Tidak ada registrasi yang sesuai.';tr.append(td);tbody.append(tr)}
 msg('pageInfo',state.count?('Halaman '+(state.page+1)+' · '+state.count+' registrasi'):'Belum ada registrasi');
 $('previous').disabled=state.page===0;$('following').disabled=(state.page+1)*state.size>=state.count;
}
function detail(r){
 const fields=[['Nomor registrasi',r.registration_number],['Nama',r.full_name],['Tanggal lahir',r.date_of_birth],['Jenis kelamin',r.gender],['Agama',r.religion],['Telepon',r.phone],['WhatsApp',r.whatsapp],['Email',r.email],['Alamat',r.address],['Kelurahan',r.village],['Kecamatan',r.district],['Kota',r.city],['Provinsi',r.province],['Ahli waris',r.next_of_kin_name],['Telepon ahli waris',r.next_of_kin_phone],['Alamat ahli waris',r.next_of_kin_address],['Riwayat penyakit dahulu',(r.past_conditions||[]).join(', ')],['Penyakit saat ini',(r.current_conditions||[]).join(', ')],['Persetujuan keluarga',r.family_approval],['Sumber informasi',r.information_source],['Persetujuan privasi',r.privacy_consent_at?'Tercatat':'Belum tercatat'],['Status',labels[r.status]||r.status]];
 const container=$('detailContent');container.replaceChildren();
 for(const [label,value] of fields){const div=document.createElement('div'),small=document.createElement('small'),span=document.createElement('span');small.textContent=label;span.textContent=value||'—';div.append(small,span);container.append(div)}
 const ktpSection=document.createElement('section');
 ktpSection.className='ktp-section';
 const ktpTitle=document.createElement('h3');ktpTitle.textContent='Dokumen KTP (privat)';ktpSection.append(ktpTitle);
 const ktpStatus=document.createElement('p');ktpStatus.textContent='Memeriksa dokumen…';ktpSection.append(ktpStatus);container.append(ktpSection);
 db.from('donor_ktp_documents').select('object_path').eq('registration_id',r.id).maybeSingle().then(({data,error})=>{
  if(!$('detail').open)return;
  if(error){ktpStatus.textContent='Fitur dokumen belum siap. Periksa migrasi SQL Tahap 7.';return}
  if(!data){ktpStatus.textContent='Belum ada KTP untuk registrasi ini.';return}
  ktpStatus.textContent='Dokumen tersedia di penyimpanan privat.';
  const button=document.createElement('button');button.type='button';button.className='outline';button.textContent='Lihat KTP (60 detik)';
  button.addEventListener('click',async()=>{
   const tab=window.open('about:blank','_blank');
   if(tab)tab.opener=null;
   button.disabled=true;
   const {data:link,error:linkError}=await db.storage.from('bankmata-ktp').createSignedUrl(data.object_path,60);
   button.disabled=false;
   if(linkError||!link?.signedUrl){if(tab)tab.close();ktpStatus.textContent='Dokumen tidak dapat dibuka. Periksa izin petugas.';return}
   if(tab){tab.location.replace(link.signedUrl)}else{ktpStatus.textContent='Browser memblokir tab baru. Izinkan pop-up untuk membuka dokumen.'}
  });ktpSection.append(button);
 });
 const section=document.createElement('section');
 const heading=document.createElement('h3');heading.textContent='Tindak lanjut petugas';section.append(heading);
 const choices={submitted:['under_review'],under_review:['education_pending'],education_pending:['ready_to_print'],ready_to_print:['completed'],completed:[],cancelled:[]};
 const next=choices[r.status]||[];
 if(next.length){
  const select=document.createElement('select');select.setAttribute('aria-label','Status berikutnya');
  for(const status of next){const option=document.createElement('option');option.value=status;option.textContent=labels[status];select.append(option)}
  const button=document.createElement('button');button.className='primary';button.textContent='Simpan status';
  button.addEventListener('click',async()=>{
   if(!window.confirm('Ubah status registrasi '+r.registration_number+' menjadi '+labels[select.value]+'?'))return;
   button.disabled=true;
   const {data,error}=await db.rpc('bankmata_change_status',{p_registration_id:r.id,p_expected_status:r.status,p_new_status:select.value});
   button.disabled=false;
   if(error||data!==true){window.alert('Status tidak berhasil diubah. Muat ulang dan periksa hak akses.');return}
   $('detail').close();await load();
  });
  section.append(select,button);
 }else{const p=document.createElement('p');p.textContent='Tidak ada transisi lanjutan untuk status ini.';section.append(p)}
 const auditHeading=document.createElement('h3');auditHeading.textContent='Riwayat aktivitas';section.append(auditHeading);
 const auditList=document.createElement('div');auditList.textContent='Memuat riwayat…';section.append(auditList);
 container.append(section);
 $('detail').showModal();
 db.from('donor_audit_events').select('action,occurred_at').eq('registration_id',r.id).order('occurred_at',{ascending:false}).limit(30).then(({data,error})=>{
  if(!$('detail').open)return;
  auditList.replaceChildren();
  if(error){auditList.textContent='Riwayat belum dapat ditampilkan.';return}
  if(!data?.length){auditList.textContent='Belum ada aktivitas.';return}
  for(const item of data){const p=document.createElement('p');p.textContent=new Date(item.occurred_at).toLocaleString('id-ID')+' · '+item.action;auditList.append(p)}
 });
}
$('closeDetail').addEventListener('click',()=>$('detail').close());
$('refresh').addEventListener('click',load);
$('search').addEventListener('input',render);
$('status').addEventListener('change',()=>{state.page=0;load()});
$('previous').addEventListener('click',()=>{if(state.page>0){state.page--;load()}});
$('following').addEventListener('click',()=>{if((state.page+1)*state.size<state.count){state.page++;load()}});
const views={
 overview:{eyebrow:'PUSAT OPERASIONAL',title:'Dashboard Bank Mata',subtitle:'Ringkasan pendaftaran dan tindak lanjut calon donor.',metrics:true,records:true,recordsTitle:'Registrasi Terbaru'},
 donors:{eyebrow:'DATA DONOR',title:'Data Calon Donor',subtitle:'Telusuri dan periksa registrasi calon donor yang masuk.',metrics:false,records:true,recordsTitle:'Daftar Calon Donor'},
 verification:{eyebrow:'ALUR VERIFIKASI',title:'Verifikasi & Edukasi',subtitle:'Tinjau registrasi dan proses edukasi melalui detail calon donor.',metrics:false,records:true,recordsTitle:'Antrian Registrasi'},
 documents:{eyebrow:'DOKUMEN',title:'Formulir & Cetak PDF',subtitle:'Persiapan dokumen resmi Bank Mata RSCM.',info:'Pencetakan dokumen resmi belum tersedia.',detail:'Pengisian formulir dan PDF sesuai dokumen resmi akan dikembangkan setelah format disetujui.'},
 history:{eyebrow:'AUDIT',title:'Riwayat Aktivitas',subtitle:'Riwayat perubahan status dapat dilihat melalui detail setiap registrasi.',info:'Riwayat aktivitas terpusat belum tersedia.',detail:'Untuk saat ini, buka detail calon donor dan lihat bagian Riwayat Aktivitas.'},
 staff:{eyebrow:'AKSES INTERNAL',title:'Manajemen Petugas',subtitle:'Pengelolaan akses hanya untuk administrator berwenang.',info:'Manajemen akun petugas belum tersedia.',detail:'Akun dan peran petugas tetap dikelola melalui Supabase oleh administrator.'},
 settings:{eyebrow:'SISTEM',title:'Pengaturan',subtitle:'Konfigurasi internal dan kebijakan operasional.',info:'Pengaturan mandiri belum tersedia.',detail:'Pengaturan keamanan dan koneksi tetap dilakukan melalui lingkungan deployment serta Supabase.'}
};
function setView(key){
 const view=views[key]||views.overview;
 $('viewEyebrow').textContent=view.eyebrow;$('viewTitle').textContent=view.title;$('viewSubtitle').textContent=view.subtitle;
 $('metricsPanel').hidden=!view.metrics;$('recordsPanel').hidden=!view.records;$('infoPanel').hidden=!view.info;
 if(view.records)$('recordsTitle').textContent=view.recordsTitle;
 if(view.info){$('infoTitle').textContent=view.info;$('infoText').textContent=view.detail;}
 document.querySelectorAll('.nav-link').forEach(btn=>{const active=btn.dataset.view===key;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});
 $('sidebar').classList.remove('open');$('menuToggle').setAttribute('aria-expanded','false');
}
document.querySelectorAll('.nav-link').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
$('menuToggle').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menuToggle').setAttribute('aria-expanded',String(open))});
setView('overview');
verify();
