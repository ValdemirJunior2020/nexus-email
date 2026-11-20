import { google } from 'googleapis';

export const GMAIL_ADDRESS='nexusai.helpdesk@gmail.com';
export function gmailReady(){return Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN);}
function client(){
 if(!gmailReady())throw new Error('Gmail OAuth not configured');
 const oauth=new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID,process.env.GMAIL_CLIENT_SECRET);
 oauth.setCredentials({refresh_token:process.env.GMAIL_REFRESH_TOKEN});
 return google.gmail({version:'v1',auth:oauth});
}
function decode(s){return Buffer.from((s||'').replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');}
function header(h,n){return h?.find(x=>x.name?.toLowerCase()===n.toLowerCase())?.value||'';}
function body(part){if(!part)return '';if(part.mimeType==='text/plain'&&part.body?.data)return decode(part.body.data);for(const p of part.parts||[]){const text=body(p);if(text)return text;}return part.body?.data&&part.mimeType!=='text/html'?decode(part.body.data):'';}
function normalize(r){const m=r.data;const h=m.payload?.headers||[];const labels=m.labelIds||[];return {id:m.id,mailbox:GMAIL_ADDRESS,folder:labels.includes('TRASH')?'trash':labels.includes('SENT')?'sent':labels.includes('INBOX')?'inbox':'archive',from:header(h,'From'),to:header(h,'To'),subject:header(h,'Subject')||'(No subject)',text:body(m.payload)||m.snippet||'',html:'',date:new Date(Number(m.internalDate||Date.now())).toISOString(),read:!labels.includes('UNREAD'),starred:labels.includes('STARRED'),providerId:m.id};}
export async function listGmail(folder='inbox'){const gmail=client();const ids=await gmail.users.messages.list({userId:'me',maxResults:100,...(folder==='all'?{}:{labelIds:folder==='inbox'?['INBOX']:folder==='sent'?['SENT']:folder==='trash'?['TRASH']:undefined})});const results=await Promise.all((ids.data.messages||[]).map(async m=>{const r=await gmail.users.messages.get({userId:'me',id:m.id,format:'full'});return normalize(r)}));return folder==='archive'?results.filter(x=>x.folder==='archive'):results;}
export async function getGmail(id){return normalize(await client().users.messages.get({userId:'me',id,format:'full'}));}
export async function updateGmail(id,patch){const addLabelIds=[],removeLabelIds=[];if(typeof patch.read==='boolean')(patch.read?removeLabelIds:addLabelIds).push('UNREAD');if(typeof patch.starred==='boolean')(patch.starred?addLabelIds:removeLabelIds).push('STARRED');if(patch.folder==='trash'){await client().users.messages.trash({userId:'me',id});return true;}if(patch.folder==='archive')removeLabelIds.push('INBOX');if(patch.folder==='inbox')addLabelIds.push('INBOX');await client().users.messages.modify({userId:'me',id,requestBody:{addLabelIds,removeLabelIds}});return true;}
export async function sendGmail({to,subject,text}){const clean=s=>String(s).replace(/[\r\n]/g,' ');const encodedSubject='=?UTF-8?B?'+Buffer.from(clean(subject)).toString('base64')+'?=';const raw=['From: Nexus AI <'+GMAIL_ADDRESS+'>','To: '+clean(to),'Subject: '+encodedSubject,'MIME-Version: 1.0','Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: base64','',Buffer.from(text,'utf8').toString('base64')].join('\r\n');const response=await client().users.messages.send({userId:'me',requestBody:{raw:Buffer.from(raw).toString('base64url')}});return response.data.id;}
