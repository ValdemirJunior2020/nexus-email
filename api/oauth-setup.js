// Local-only one-time Gmail OAuth authorization helper; never commit generated tokens.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
loadEnv({path:fileURLToPath(new URL('./.env',import.meta.url))});
import { google } from 'googleapis';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
const id=process.env.GMAIL_CLIENT_ID,secret=process.env.GMAIL_CLIENT_SECRET;
if(!id||!secret){console.error('Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to api/.env first.');process.exit(1);}
const redirect='http://127.0.0.1:8789/oauth2callback';
const oauth=new google.auth.OAuth2(id,secret,redirect),state=randomBytes(24).toString('hex');
const url=oauth.generateAuthUrl({access_type:'offline',prompt:'consent',scope:['https://www.googleapis.com/auth/gmail.modify','https://www.googleapis.com/auth/gmail.send'],state});
const server=http.createServer(async(req,res)=>{
 try{
 const u=new URL(req.url,redirect);
 if(u.pathname!=='/oauth2callback')return res.writeHead(404).end();
 if(u.searchParams.get('state')!==state)throw Error('State mismatch');
 if(u.searchParams.get('error'))throw Error(u.searchParams.get('error'));
 const {tokens}=await oauth.getToken(u.searchParams.get('code'));
 if(!tokens.refresh_token)throw Error('No refresh token. Revoke previous app access and retry.');
 const gmail=google.gmail({version:'v1',auth:(oauth.setCredentials(tokens),oauth)});
 const profile=await gmail.users.getProfile({userId:'me'});
 if(profile.data.emailAddress.toLowerCase()!=='nexusai.helpdesk@gmail.com')throw Error('Wrong Google account: '+profile.data.emailAddress);
 res.writeHead(200,{'Content-Type':'text/plain'}).end('Nexus Email Gmail authorization succeeded. Return to PowerShell.');
 console.log('\nConnected: '+profile.data.emailAddress+'\nStore this as a SECRET in api/.env and Render environment settings:\nGMAIL_REFRESH_TOKEN='+tokens.refresh_token+'\nDO NOT SHARE THIS TOKEN OR COMMIT IT TO GITHUB.');
 }catch(e){console.error(e.message);res.writeHead(400,{'Content-Type':'text/plain'}).end('Authorization failed; check PowerShell.');}
 finally{setTimeout(()=>server.close(),1000);}
});
server.listen(8789,'127.0.0.1',()=>{
 console.log('Open this URL to authorize the Nexus AI Gmail account:\n'+url);
 if(process.platform==='win32')execFile('cmd',['/c','start','',url],()=>{});
});
