import { createClient } from "@supabase/supabase-js";
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const {data}=await db.from("events").select("id,title,city,date_precision,starts_at,verification_status,dedupe_key,event_sources(source_title,source_url),event_artists(match_method)").order("discovered_at");
for(const e of data) console.log(e.verification_status,"|",e.city,"|",e.date_precision,"|",e.dedupe_key,"|",e.event_sources.map(s=>s.source_title).join(","),"|",e.event_artists.map(a=>a.match_method).join(","), "|", e.event_sources.map(s=>new URL(s.source_url).hostname).join(","));
