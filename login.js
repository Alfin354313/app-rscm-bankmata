import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.BANKMATA_SUPABASE;
const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
async function authorized(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data,error}=await db.from('bankmata_staff').select('role').eq('user_id',user.id).maybeSingle();return !error&&!!data}
(async()=>{if(await authorized())location.replace('./admin.html')})();
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();$('loginButton').disabled=true;$('loginMessage').textContent='Memeriksa akses…';
 const {error}=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});
 if(error){$('loginMessage').textContent='Email atau kata sandi tidak valid.';$('loginButton').disabled=false;return}
 if(!await authorized()){await db.auth.signOut();$('loginMessage').textContent='Akun tidak memiliki akses petugas.';$('loginButton').disabled=false;return}
 location.replace('./admin.html');
});
