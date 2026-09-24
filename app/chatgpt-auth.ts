import {headers} from 'next/headers';
import {sessionUser} from '@/lib/auth';
export async function getChatGPTUser() {
  const h=await headers();const u=sessionUser(new Request(process.env.APP_URL||'http://localhost:3100',{headers:h}));
  return u?{userId:u.id,displayName:u.name,email:u.email,fullName:u.name}:null;
}
