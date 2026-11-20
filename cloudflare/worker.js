// Cloudflare Email Routing -> Email Worker -> Render API.
// Install dependency postal-mime with npm in a separate Worker project,
// or copy this file into a Wrangler Worker and deploy.
import PostalMime from 'postal-mime';
export default {async email(message,env,ctx){
  if(!env.RENDER_API_URL||!env.INBOUND_SECRET)throw new Error('Missing inbound configuration');
  const parsed=await new PostalMime().parse(message.raw);
  const to=String(message.to||'').toLowerCase();
  if(to!=='info@nexusai.com')return;
  const response=await fetch(env.RENDER_API_URL.replace(/\/$/,'')+'/api/inbound',{
    method:'POST',headers:{'Content-Type':'application/json','x-inbound-secret':env.INBOUND_SECRET},
    body:JSON.stringify({from:message.from,to,subject:parsed.subject||'',text:parsed.text||'',html:''})
  });
  if(!response.ok)throw new Error('Inbound delivery failed: '+response.status);
}};