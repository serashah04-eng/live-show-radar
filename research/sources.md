# Credible India live-entertainment sources (research output)

Research date: 2026-10-12. Built from seven research passes; every entry is marked **verified** only if the homepage was actually fetched. Anything blocked, unresolved or unclear is **unverified** or **needs_human_review**. Nothing was filled from memory. Tier 1 = official primary, Tier 2 = trade/news confirmation, Tier 3 = discovery lead only.

Counts: 189 usable entries (50 verified, 30 need human review, 109 unverified), 10 rejected.

## Tier 1: official primary sources

### artist_label

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Coldplay | [coldplay.com](https://www.coldplay.com) | verified | T1 | none / [link](https://instagram.com/coldplay/) / [link](http://www.twitter.com/coldplay/) / [link](https://www.youtube.com/user/ColdplayVEVO) | [link](https://www.coldplay.com/wp-sitemap.xml) | announce | robots.txt allows crawl except /wp/wp-admin/; WordPress sitemap. Socials from footer. |
| Diljit Dosanjh | [diljitdosanjh.com](https://www.diljitdosanjh.com) | verified | T1 | none / [link](instagram.com/diljitdosanjh) / [link](x.com/diljitdosanjh) / [link](youtube.com/@diljitdosanjh) | none | announce | robots/terms not fetched. Tour page lists India date with BookMyShow link; no sale dates. |
| Shreya Ghoshal | [shreyaghoshal.com](https://www.shreyaghoshal.com) | verified | T1 | none / [link](instagram.com/shreyaghoshal) / [link](x.com/shreyaghoshal) / [link](footer YouTube icon present, URL not captured) | [link](https://www.shreyaghoshal.com/sitemap_index.xml) | announce | robots.txt allows all; sitemap_index.xml found via robots. Tour page listed no dates on fetch day; links to Ba |
| Saregama India | [saregama.com](https://www.saregama.com) | verified | T1 | none / [link](footer icon present, URL not captured) / [link](footer icon present, URL not captured) / [link](footer icon present, URL not captured) | [link](http://www.saregama.com/sitemap/sitemap.xml) | announce | robots.txt blocks /cart, /download, /listener, blog archives; sitemap at /sitemap/sitemap.xml. No RSS seen. |

### bank_presale

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Kotak Mahindra Bank - Media Releases (card presales) | [kotak.bank.in](https://www.kotak.bank.in/) | verified | T1 | [link](https://www.linkedin.com/company/kotak-mahindra-bank) / none / [link](https://twitter.com/kotakbankltd?lang=en) / [link](https://www.youtube.com/user/KotakBankIndia) | none | announce, card presale, early bird | Domain migrated kotak.com -> kotak.bank.in (301). No RSS found. robots.txt allows general crawling but disallo |
| Visa India - Newsroom | [visa.co.in](https://www.visa.co.in/) | verified | T1 | none / none / none / none | none | announce | Page fetched; no RSS link visible; footer not in extracted text. robots.txt: only /content_library/modal/ disa |

### industry_body

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Live Event Development Cell (LEDC) - MIB | [mib.gov.in](https://mib.gov.in/) | verified | T1 | none / none / none / none | none | announce | Page fetched, last updated 24 Sep 2026; hosts Framework Policy, Model Executive Order for live-event permissio |

### trade_press

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Pollstar (news) | [news.pollstar.com](https://news.pollstar.com) | verified | T1 | none / none / none / none | none | announce | robots.txt: only /wp-admin/ disallowed, Crawl-delay 10, no AI-bot rules. Sitemaps from robots.txt: /wp-sitemap |

### promoter

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Team Innovation | [teaminnovation.in](https://teaminnovation.in) | verified | T1 | [link](https://www.linkedin.com/company/teaminnovation/) / [link](https://www.instagram.com/team.innovation/profilecard/?igsh=MXJ0aGlrdGltZDMwag==) / none / none | none | announce | No RSS found. robots.txt returned 404 (no restrictions published). Terms page not located. Monitor upcoming-ev |
| Only Much Louder (OML) | [oml.in](https://oml.in) | verified | T1 | [link](https://www.linkedin.com/company/only-much-louder/mycompany/) / [link](https://www.instagram.com/onlymuchlouder/?hl=en) / none / none | none | announce | WordPress site. robots.txt only blocks /wp-admin. Events index appears to be a legacy list (NH7 page says acti |
| Sunburn Festival | [sunburn.in](https://www.sunburn.in) | verified | T1 | none / [link](https://www.instagram.com/sunburnfestival/) / [link](https://twitter.com/SunburnFestival) / [link](https://www.youtube.com/@SunburnFestival) | none | announce, sale date | WordPress with Events Calendar plugin. /sitemap.xml (wp-sitemap index) includes wp-sitemap-posts-tribe_events- |
| TribeVibe Entertainment | [tribevibe.live](https://tribevibe.live) | verified | T1 | [link](https://www.linkedin.com/company/tribevibe) / [link](https://www.instagram.com/tribevibe.live) / [link](https://x.com/tribevibe) / [link](https://www.youtube.com/@tribevibe) | none | announce | Live Events page was linked but its content not fetched. robots.txt returned only Cloudflare content-signal co |
| Magnetic Fields / Nomads | [magneticfields.in](https://www.magneticfields.in) | verified | T1 | none / [link](https://instagram.com/magneticfieldsfestival) / none / none | none | announce, early bird, sale date | Main site has no social links; Instagram link found on nomads.magneticfields.in. Nomads 2026 (Feb 13-15, Abhey |
| Echoes of Earth | [echoesofearth.com](https://www.echoesofearth.com) | verified | T1 | none / [link](https://instagram.com/echoesofearthfestival) / [link](https://x.com/eoemusicfest) / [link](https://youtube.com/@echoesofearthfestival) | none | announce, early bird, card presale, sale date | Run by Swordfish Events and Entertainment, Bengaluru. Ticket links per city. robots/sitemap not checked. |
| Ziro Festival of Music | [zirofestival.com](https://www.zirofestival.com) | verified | T1 | none / [link](https://www.instagram.com/zirofestival/) / [link](https://twitter.com/zirofestival) / [link](https://www.youtube.com/zirofestival) | none | announce, sale date | 2026 edition listed Sept 24-27, 2026 (already passed). robots.txt only has content-signal comments (no disallo |
| Dover Lane Music Conference | [doverlanemusicconference.org](https://doverlanemusicconference.org) | verified | T1 | none / [link](https://www.instagram.com/thedoverlanemusicconference?igsh=MmN6cmYxeGRzZ2Q5) / none / [link](https://youtube.com/@thedoverlanemusicconference7996?si=Aj782qJoqqqzhYQe) | none | announce | WordPress-like; no feed found. No 2026-27 edition text on homepage; Facebook link in header too. |
| The Music Academy Madras | [musicacademymadras.in](https://musicacademymadras.in) | verified | T1 | none / [link](https://www.instagram.com/madrasmusicacademy) / [link](https://x.com/musicacademyma) / [link](https://www.youtube.com/channel/UCKmE9i2iW0KaqgSxVFYmZUw?view_as=subscriber) | none | announce, sale date | robots.txt allows all; sitemap https://musicacademymadras.in/sitemap_index.xml. 100th annual concerts Dec 15,  |

### ticketing

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| District by Zomato | [district.in](https://www.district.in) | verified | T1 | none / [link](https://www.instagram.com/districtupdates/) / [link](https://x.com/district_india) / [link](https://www.youtube.com/@district.culture) | [link](not found on site (robots.txt disallows /rss)) | announce, sale date, early bird, card presale | robots.txt allows default crawling except /profile, /checkout, /order*, /rss, any URL with '?'; publishes site |
| thumpN | [thumpn.com](https://thumpn.com) | verified | T1 | none / none / none / none | none | announce, sale date | Fetch returned only title (JS-rendered). robots.txt allows /events, /event/, /artist/, /tour/, /hub/, /venue/  |
| Skillbox | [skillboxes.com](https://www.skillboxes.com) | verified | T1 | none / none / none / none | [link](https://www.skillboxes.com/sitemap.xml (sitemap, not RSS)) | announce, sale date | robots.txt allows all except /admin/, /super-admin/ and some /media/ file folders. Sitemaps listed: sitemap-ev |
| Eventbrite | [eventbrite.com](https://www.eventbrite.com) | verified | T1 | [link](https://www.linkedin.com/company/eventbrite) / [link](https://www.instagram.com/eventbrite) / [link](https://www.x.com/eventbritehelp) / none | [link](not found on site (robots disallows /rss/, /atom/)) | announce, sale date | robots.txt blocks /rss/, /atom/, /events/rss/, parts of /api/v3/, and 100+ named scrapers; sitemap index at ht |
| MeraEvents | [meraevents.com](https://www.meraevents.com) | verified | T1 | [link](https://www.linkedin.com/company/meraevents) / [link](https://instagram.com/meraeventsindia) / [link](https://x.com/meraeventsindia) / none | [link](https://meraevents.com/sitemap.xml (sitemap); no RSS found) | announce, sale date | robots.txt allows all except /admin, /dashboard, /profile, /event-preview, /associations/. Developer docs link |
| HighApe | [highape.com](https://highape.com) | verified | T1 | [link](https://in.linkedin.com/company/high-ape) / [link](https://www.instagram.com/highape) / [link](https://x.com/highape) / none | [link](https://www.highape.com/sitemap.xml (sitemap, not RSS)) | announce, sale date | robots.txt allows / but disallows /api/, /account/, /ticket/. Sitemap listed. Terms not read. |

### venue

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| BIEC - Bangalore International Exhibition Centre | [biec.in](https://biec.in) | verified | T1 | [link](https://www.linkedin.com/company/bangalore-international-exhibition-centre) / none / [link](https://x.com/biecentre) / none | none | announce | robots.txt: User-agent * Allow /, sitemap https://www.biec.in/sitemap.xml. Events calendar has year filter, no |
| DY Patil Stadium (D Y Patil Sports Academy), Navi Mumbai | [dypatilstadium.com](https://www.dypatilstadium.com) | verified | T1 | none / [link](https://www.instagram.com/dypatilstadium/) / none / [link](https://www.youtube.com/c/DYPATILSPORTSACADEMY) | none | announce | robots.txt could not be retrieved (fetch returned nothing usable). No feed found. Contact: contact@dypatilstad |
| NCPA Mumbai | [ncpamumbai.com](https://www.ncpamumbai.com) | verified | T1 | [link](https://in.linkedin.com/company/national-centre-for-performing-arts) / [link](https://www.instagram.com/ncpamumbai/) / [link](https://www.twitter.com/NCPAMumbai) / [link](https://www.youtube.com/user/TheNCPAMumbai1/videos) | none | announce, sale date | robots.txt: User-agent * Disallow: (empty = all allowed); sitemap https://www.ncpamumbai.com/sitemap_index.xml |
| Royal Opera House Mumbai | [royaloperahouse.in](https://www.royaloperahouse.in) | verified | T1 | none / [link](https://www.instagram.com/MumbaiOpera/) / [link](https://twitter.com/MumbaiOpera) / none | none | announce, sale date | robots.txt: User-agent * Allow /, sitemap https://www.royaloperahouse.in/sitemap.xml. No RSS seen. Terms not f |
| Dome India (Dome SVP Stadium, formerly NSCI Dome), Worli | [domeindia.com](https://domeindia.com) | verified | T1 | [link](https://www.linkedin.com/company/domeindia/) / [link](https://instagram.com/domeindia?igshid=YTQwZjQ0NmI0OA==) / [link](https://x.com/domeindia?s=21&t=RryQ6-rluMQxDFwsMMGCVQ) / [link](https://www.youtube.com/@DomeIndia-go2ro) | none | announce, sale date | robots.txt: User-agent * Disallow: (empty = all allowed); sitemap https://domeindia.com/sitemap_index.xml. No  |
| Royal Western India Turf Club (Mahalaxmi Racecourse operator) | [rwitc.com](https://www.rwitc.com) | verified | T1 | none / [link](instagram.com/rwitcmumbai) / [link](x.com/rwitcmumbai) / [link](youtube.com/@rwitcltd9390) | none | announce | robots.txt: User-agent * Allow /; no sitemap listed. Racing calendar is a PDF. Terms not fetched. |
| Nicco Park Kolkata | [niccoparks.com](https://www.niccoparks.com/) | verified | T1 | none / [link](https://www.instagram.com/nicco_park/) / [link](https://www.x.com/Niccopark) / [link](https://www.youtube.com/@niccopark890) | none |  | robots.txt allows all except /wp-admin/; sitemap https://www.niccoparks.com/sitemap_index.xml. No RSS/events c |

## Tier 2: trade and news confirmation

### news

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Rolling Stone India | [rollingstoneindia.com](https://rollingstoneindia.com) | verified | T2 | none / [link](http://instagram.com/rollingstonein) / [link](http://twitter.com/#!/RollingStoneIN) / [link](https://www.youtube.com/channel/UCIAbqfWN38DbAmCDSzDoXYg) | none | announce, sale date | robots.txt: only /wp-login.php,/wp-admin/ disallowed; Crawl-delay 600s (very slow); sitemap https://rollingsto |
| Hollywood Reporter India | [hollywoodreporterindia.com](https://www.hollywoodreporterindia.com) | verified | T2 | none / none / none / none | none | announce | robots.txt: only /search disallowed, no crawl-delay, no AI rules; sitemaps /sitemap.xml and /news_sitemap.xml. |
| Time Out Mumbai / Time Out India | [timeout.com](https://www.timeout.com/mumbai) | verified | T2 | none / none / none / none | none | announce | robots.txt (updated 4 Mar 2026): legacy RSS paths blocked, 'new feeds like /blog/feed.rss remain ALLOWED' (no  |
| The Free Press Journal | [freepressjournal.in](https://www.freepressjournal.in) | verified | T2 | [link](https://www.linkedin.com/company/the-free-press-journal-newspaper) / [link](https://www.instagram.com/freepressjournal/?hl=en) / [link](https://twitter.com/fpjindia?lang=en) / [link](https://www.youtube.com/@TheFreePressJournal) | [link](https://www.freepressjournal.in/stories.rss) | announce | robots.txt: allow-by-default with many path exclusions, no AI rules, no crawl-delay; sitemaps news-sitemap.xml |
| Outlook India | [outlookindia.com](https://www.outlookindia.com) | verified | T2 | [link](https://in.linkedin.com/company/outlook) / [link](https://www.instagram.com/outlookindia/) / [link](https://twitter.com/outlookindia/) / [link](https://www.youtube.com/user/OutlookMagazine) | none | announce | robots.txt: events/magazine-story sections disallowed; GPTBot/PerplexityBot/Claude-Web allowed; sitemaps incl. |
| Telangana Today | [telanganatoday.com](https://telanganatoday.com) | verified | T2 | none / none / none / none | none | announce | robots.txt: category/tag archives disallowed; GPTBot, CCBot, ChatGPT-User blocked; sitemaps /news-sitemap.xml, |
| Deccan Chronicle | [deccanchronicle.com](https://www.deccanchronicle.com) | verified | T2 | none / none / none / none | none | announce | robots.txt: allow-by-default, search/pagination blocked, Googlebot-News allowed, no AI rules; sitemaps /news-s |
| Bollywood Hungama | [bollywoodhungama.com](https://www.bollywoodhungama.com) | verified | T2 | none / none / none / none | [link](https://www.bollywoodhungama.com/rss-feed/) | announce | robots.txt: WordPress paths blocked, GPTBot/CCBot/Google-Extended allowed; sitemap /sitemap_index.xml. RSS pag |

### promoter

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| DNA Entertainment Networks | [dnanetworks.com](https://dnanetworks.com) | verified | T2 | [link](https://www.linkedin.com/company/dna-entertainment-networks/) / [link](https://www.instagram.com/dnanetworkslive/) / none / [link](https://www.youtube.com/channel/UC7v-z-v3tkpBXYSEr6JdSCQ) | none |  | robots.txt lists sitemap.xml, sitemap-posts.xml, sitemap-pages.xml etc.; blocks only wp-admin/cgi-bin. Blog po |

### venue

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Hyderabad International Convention Centre (HICC) | [hicc.com](https://hicc.com/) | verified | T2 | [link](https://www.linkedin.com/company/novotel-hyderabad-convention-centre/) / [link](https://www.instagram.com/novotelhyd?igsh=eWMxOXZobjhrYzVs) / none / [link](https://www.youtube.com/@NovotelHyd) | none |  | robots.txt allows all except /wp-admin/; sitemap https://hicc.com/sitemap_index.xml. No RSS found. Past events |
| TransStadia (EKA Arena, Ahmedabad) | [transstadia.com](https://transstadia.com/) | verified | T2 | none / [link](https://www.instagram.com/transstadia/) / [link](https://twitter.com/SETransStadia) / [link](https://www.youtube.com/channel/UC7FSMpL5vDYxEMCXVBkyb4A) | none |  | robots.txt: User-Agent * Disallow empty (allows all). No sitemap/feed seen. Terms not checked. |
| Science City Kolkata (NCSM) | [sciencecitykolkata.org.in](https://sciencecitykolkata.org.in/) | verified | T2 | none / none / none / none | none |  | robots.txt allows all except /wp-admin/; sitemap https://sciencecitykolkata.org.in/wp-sitemap.xml. No RSS seen |

## Tier 3: discovery leads only (never confirmation)

### music_app

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Songkick | [songkick.com](https://www.songkick.com) | verified | T3 | none / none / none / none | [link](https://www.songkick.com/sitemap.xml) | announce | robots.txt: ~30 bots incl. ClaudeBot/GPTBot-adjacent blocked or delayed (10s crawl-delay for Applebot, bingbot |

### trade_press

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Medianews4u | [medianews4u.com](https://www.medianews4u.com) | verified | T3 | [link](https://linkedin.com/company/medianews4u-com) / none / [link](https://twitter.com/medianews4u) / [link](https://youtube.com/channel/UCDaofriWbdBCsL5PoejItug) | none | announce | robots.txt fetched (evidence); no RSS in page text; Instagram not seen. |

### news

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Siasat Daily | [siasat.com](https://www.siasat.com) | verified | T3 | none / [link](https://instagram.com/siasatdaily/) / [link](https://twitter.com/TheSiasatDaily) / [link](https://youtube.com/user/siasathyderabad) | none | announce | robots.txt: many AI scrapers blocked (Bytespider, Amazonbot, cohere-ai, Diffbot etc.); sitemaps /sitemap_index |

### promoter

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| E-Factor Experiences | [efactorexp.com](https://efactorexp.com) | verified | T3 | [link](https://www.linkedin.com/company/352328) / [link](https://www.instagram.com/efactorexperiences/) / none / none | none |  | NSE SME listed (EFACTOR). Seed efactor.in redirects to unrelated autoteambuilder.com (acquired domain, not use |

### ticketing

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Explara | [explara.com](https://www.explara.com) | verified | T3 | none / none / none / none | none | sale date | robots.txt and terms not fetched. |
| Wowsly | [wowsly.com](https://www.wowsly.com) | verified | T3 | [link](https://www.linkedin.com/company/wowsly-com) / [link](https://www.instagram.com/wowsly.live/) / [link](https://x.com/WowslyConnect) / [link](https://www.youtube.com/@Wowsly_) | none | announce | robots.txt and terms not fetched. |
| KonfHub | [konfhub.com](https://konfhub.com) | verified | T3 | [link](https://www.linkedin.com/company/konfhub/) / [link](https://www.instagram.com/konfhubevents/) / [link](https://twitter.com/konfhub) / [link](https://www.youtube.com/@KonfHubTech) | none | announce | robots/terms not fetched. |
| AllEvents | [allevents.in](https://allevents.in) | verified | T3 | none / none / none / none | none | announce | robots/terms not fetched. |

## Needs human review

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Bandsintown | [bandsintown.com](https://www.bandsintown.com) | needs_human_review | T3 | none / none / none / none | none | announce | Direct WebFetch of city page and /robots.txt returned HTTP 403 (bot-blocked); do not bypass. Public API (rest. |
| Ed Sheeran | [edsheeran.com](https://www.edsheeran.com) | needs_human_review | T1 | none / [link](https://www.instagram.com/teddysphotos/) / [link](https://twitter.com/edsheeran/) / [link](https://www.youtube.com/user/EdSheeran?hl=en-GB&gl=GB) | none | announce | /tour returned Page Not Found; tour is a homepage section (/#tour). robots not fetched. |
| Guns N' Roses | [gunsnroses.com](https://www.gunsnroses.com) | needs_human_review | T1 | none / [link](https://www.instagram.com/gunsnroses/) / [link](https://twitter.com/gunsnroses) / [link](http://www.youtube.com/user/GunsNRosesVEVO) | none | announce | Tour dates load via JavaScript (showed 'Loading tour dates'); not readable by simple fetch. |
| Foo Fighters | [foofighters.com](https://foofighters.com) | needs_human_review | T1 | none / [link](https://www.instagram.com/foofighters/) / [link](https://x.com/foofighters) / none | none | announce | Site describes itself as official; /tour/ path returned 404; socials taken from structured data not footer. |
| Prateek Kuhad | [prateekkuhad.com](https://www.prateekkuhad.com) | needs_human_review | T1 | none / none / none / none | none | announce | Tour link goes to Bandsintown (third-party). Footer has social icons but fetch did not return URLs. |
| T-Series | [tseries.com](https://www.tseries.com) | needs_human_review | T1 | none / [link](header icon present, URL not captured) / [link](header icon present, URL not captured) / [link](header icon present, URL not captured) | none |  | No live-events section; News only. No RSS seen. |
| Divo | [divomusic.com](https://www.divomusic.com) | needs_human_review | T1 | none / none / none / none | none |  | Page returned only the word 'divo'; identity not confirmed. |
| HDFC Bank - Newsroom | [hdfc.bank.in](https://www.hdfc.bank.in/) | needs_human_review | T1 | none / none / none / none | none | announce | hdfcbank.com 301-redirects to hdfc.bank.in. Newsroom page is large (178k chars); only first 100k read, no head |
| RuPay/NPCI, Federal, Yes, IndusInd, AU, RBL bank newsrooms; Bacardi, Red Bull, Jio sponsor pages | [not found on site](not found on site) | needs_human_review | T3 | none / none / none / none | none |  | Not researched in this pass. |
| India Cine Hub - Live Event Permissions (single window) | [indiacinehub.gov.in](https://indiacinehub.gov.in/) | needs_human_review | T1 | none / none / none / none | none |  | Site has a Live Event Permissions teaser and News & Archives menu; no items visible. No evidence of public per |
| Esquire India | [esquireindia.co.in](https://www.esquireindia.co.in) | needs_human_review | T2 | none / none / none / none | none | announce, sale date | robots.txt: only /search disallowed; sitemaps /sitemap.xml, /news_sitemap.xml, /sitemap/sitemap-section.xml. N |
| ELLE India | [elle.in](https://www.elle.in) | needs_human_review | T3 | [link](https://www.linkedin.com/company/elleindia/?originalSubdomain=in) / [link](https://www.instagram.com/elleindia/?hl=en) / [link](https://x.com/elleindia?lang=en) / [link](https://www.youtube.com/channel/UCiP5ZlO1vzp20SHo2pMVo2A) | none |  | robots.txt fetch rate-limited (not checked). No RSS seen. |
| Curly Tales | [curlytales.com](https://curlytales.com) | needs_human_review | T3 | none / none / none / none | none | announce, sale date, early bird, card presale | robots.txt: allow-by-default, /feed/ paths disallowed (no RSS), no AI rules; sitemap /sitemap_index.xml. |
| Hyderabad Times (TOI) | [timesofindia.indiatimes.com](https://timesofindia.indiatimes.com/city/hyderabad) | needs_human_review | T3 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Mumbai Mirror | [mumbaimirror.indiatimes.com](https://mumbaimirror.indiatimes.com) | needs_human_review | T3 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Bangalore Mirror | [bangaloremirror.indiatimes.com](https://bangaloremirror.indiatimes.com) | needs_human_review | T3 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Pune Mirror | [punemirror.com](https://punemirror.com) | needs_human_review | T3 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| NH7 Weekender | [nh7.in](https://www.nh7.in) | needs_human_review | T1 | none / [link](https://instagram.com/nh7dotin) / [link](https://x.com/NH7) / none | none | announce, early bird | Homepage shows 2026 thank-you page, aftermovie and gallery; footer also links Facebook and Snapchat. Social li |
| TM Ventures / TM Talent Management | [tmtalentmanagement.com](https://tmtalentmanagement.com) | needs_human_review | T3 | [link](https://www.linkedin.com/company/tm-talent-management/) / [link](https://www.instagram.com/tmtalentmanagement/) / [link](https://twitter.com/OfficialTMTM) / [link](https://www.youtube.com/@TMtalentmanagementofficial1) | none | announce | Talent-management site, copyright 2017-2023, no events page. Company is TM Ventures (UMG majority stake 2022;  |
| Wizcraft International Entertainment | [wizcraftworld.com](https://www.wizcraftworld.com) | needs_human_review | T3 | [link](https://www.linkedin.com/company/wizcraft-international-entertainment-pvt--ltd-) / [link](https://www.instagram.com/wizcraft_india/) / [link](https://twitter.com/WizcraftIndia) / [link](https://www.youtube.com/user/WizcraftTV) | none |  | Seed wizcraft.com redirects to unrelated bjjgoodies.com (lookalike/hijacked; reject). wizcraftworld.com page s |
| Mahindra Kabira Festival (Teamwork Arts) | [mahindrakabira.com](https://www.mahindrakabira.com) | needs_human_review | T2 | none / none / none / none | none | announce | Fetch returned only a title (JS site). Latest edition evidence found is 2021 (WebSearch). Active status unconf |
| DGTL India | [dgtl-festival.com](https://dgtl-festival.com/) | needs_human_review | T2 | none / none / none / none | none | announce, sale date | Dutch-origin festival; India editions Nov 13-14, 2026 (Mumbai Ballard Pier, Bengaluru Lalit Ashok); India tick |
| TicketGenie | [ticketgenie.in](https://ticketgenie.in) | needs_human_review | T1 | none / none / none / none | none | sale date | Fetch returned only page title; robots.txt also returned only title (unreadable). |
| Townscript | [townscript.com](https://www.townscript.com) | needs_human_review | T1 | none / none / none / none | none | announce, sale date | Fetch showed only 'Getting things ready...' (JS app). robots.txt: no restrictions for most bots; Googlebot/Bin |
| Fever | [feverup.com](https://feverup.com) | needs_human_review | T3 | [link](https://www.linkedin.com/company/fever-up) / [link](https://www.instagram.com/fever_us/) / [link](https://x.com/fever_us) / [link](https://www.youtube.com/c/feverup) | none |  | Not assessed. |
| Bhartiya City (Bhartiya Mall of Bengaluru) | [bhartiyacity.com](https://bhartiyacity.com) | needs_human_review | T2 | none / [link](https://www.instagram.com/bhartiyacity/?hl=en) / [link](https://twitter.com/bhartiya_city?lang=en) / [link](https://www.youtube.com/channel/UCSD8ylu2sOf1yGmwiLkTsbQ) | none | announce | No dedicated events page found; only /explore/ and /blog/. robots.txt and terms not fetched. |
| The Humming Tree, Indiranagar | [thehummingtree.com](https://www.thehummingtree.com) | needs_human_review | T2 | none / [link](http://instagram.com/the_hummingtree/) / none / none | none | announce | Own site is a 'full website coming soon' landing page, no calendar. Events appear on district.in (e.g. https:/ |
| Jio World Convention Centre / Jio World Garden (Jio World Centre), BKC | [jioworldcentre.com](https://www.jioworldcentre.com) | needs_human_review | T1 | none / none / none / none | none |  | jioworldconventioncentre.com 301-redirects to jioworldcentre.com/jio-world-convention-centre; page loaded only |
| Kala Academy Goa | [kalaacademygoa.co.in](https://kalaacademygoa.co.in/) | needs_human_review | T2 | none / none / none / [link](https://www.youtube.com/playlist?list=PLS3OGngXDPsQA3CgSHAWedD4Ae1tY6qxY) | none | announce | robots.txt allows all except /wp-admin/; sitemap https://kalaacademygoa.co.in/wp-sitemap.xml. Events Calendar  |
| Sir Mutha Venkatasubba Rao Concert Hall | [smvrch.com](https://smvrch.com/) | needs_human_review | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |

## Unverified (could not be fetched or confirmed; do not use until checked)

| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |
|---|---|---|---|---|---|---|---|
| Apple Music Concerts (iOS 26.4) | [music.apple.com](https://music.apple.com) | unverified | T3 | none / none / none / none | none | announce | Requires Apple Music app on iOS 26.4; no public API. Artists sync via Bandsintown for Artists (24-48h). Ticket |
| Spotify Live Events feed / Concerts | [open.spotify.com](https://open.spotify.com) | unverified | T3 | none / none / none / none | none | announce | In-app only, personalised; no public events API. Do not scrape. |
| YouTube Music concerts | [music.youtube.com](https://music.youtube.com) | unverified | T3 | none / none / none / none | none | announce | Listings supplied by Bandsintown (exclusive partner per Hypebot Aug 2025); no public API; in-app. |
| Shazam concerts | [shazam.com](https://www.shazam.com) | unverified | T3 | none / none / none / none | none | announce | Concert data comes from Bandsintown; no public API; shown only for touring artists. |
| Gaana | [gaana.com](https://gaana.com) | unverified | T3 | none / none / none / none | none |  | Fetch tool refused gaana.com; not tested. |
| Amazon Music (live events) | [music.amazon.in](https://music.amazon.in) | unverified | T3 | none / none / none / none | none |  | Help page (via search) says Tickets button routes to Bandsintown; no API. |
| Apple Maps concert guides | [maps.apple.com](https://maps.apple.com) | unverified | T3 | none / none / none / none | none |  | No API; guides are editorial per-city. |
| Arijit Singh | none | unverified | T1 | none / none / none / none | none | announce, sale date, card presale | arijitsingh.com fetch failed (socket closed); no official site verified. |
| AP Dhillon | none | unverified | T1 | none / none / none / none | none |  | apdhillon.com DNS failed; no official site verified. |
| Anuv Jain | none | unverified | T1 | none / none / none / none | none |  | anuvjain.com returned 503; not verified. |
| Seedhe Maut | none | unverified | T1 | none / none / none / none | none | announce | No official site found via search. |
| Divine | none | unverified | T1 | none / none / none / none | none |  | Not researched. |
| Raftaar | none | unverified | T1 | none / none / none / none | none |  | Not researched. |
| Ritviz | none | unverified | T1 | none / none / none / none | none |  | ritviz.com DNS failed. |
| Nucleya | none | unverified | T1 | none / none / none / none | none |  | nucleya.com does not resolve. |
| Sony Music India | none | unverified | T1 | none / none / none / none | none |  | sonymusicindia.com did not resolve. |
| Universal Music India | none | unverified | T1 | none / none / none / none | none |  | universalmusic.in fetch failed. |
| Warner Music India | none | unverified | T1 | none / none / none / none | none |  | warnermusic.in did not resolve. |
| Times Music | none | unverified | T1 | none / none / none / none | none |  | Fetch tool refused timesmusic.com. |
| HDFC Bank SmartBuy Offers (presale offers) | [offers.smartbuy.hdfcbank.com](https://offers.smartbuy.hdfcbank.com/) | unverified | T1 | none / none / none / none | none | card presale | Host failed DNS resolution (ENOTFOUND) from this environment; unverified. URL surfaced via web search only. Ch |
| Axis Bank - Press Releases | [axis.bank.in](https://www.axis.bank.in/) | unverified | T1 | none / none / none / none | none | announce | axisbank.com 301 -> axis.bank.in. Press page fetch was blocked by a rate-limited safety check, so not read. UR |
| ICICI Bank - Press Release | [icicibank.com](https://www.icicibank.com/) | unverified | T1 | none / none / none / none | none | announce | icicibank.com 301 -> icici.bank.in; /about-us/media-press-release returned 404 there, so current newsroom URL  |
| SBI Card - Media Center | [sbicard.com](https://www.sbicard.com/) | unverified | T1 | none / none / none / none | none |  | Guessed media URL returned 404; correct page not located. |
| American Express India - Newsroom | [americanexpress.com](https://www.americanexpress.com/in/) | unverified | T1 | none / none / none / none | none | card presale | Fetch failed (parse error: header overflow). No India 2026 Amex presale found in search; an undated blog menti |
| IDFC FIRST Bank - Media | [idfcfirst.bank.in](https://www.idfcfirst.bank.in/) | unverified | T1 | none / none / none / none | none |  | Redirect from idfcfirstbank.com observed; /about-us/media on new domain returned 404. Only a 2025 concert-plan |
| Mastercard India - Press | [mastercard.com](https://www.mastercard.com/in/) | unverified | T1 | none / none / none / none | none |  | HTTP 403 on fetch; blocked, not bypassed. |
| FICCI (M&E Live Events Forum) | [ficci.in](https://ficci.in/) | unverified | T2 | none / none / none / none | none |  | ficci.in returned 403. Forum exists (chair Kunal Khambhati) per trade coverage of FICCI FRAMES 29-30 Sep 2026  |
| EEMA (Event & Entertainment Management Association) | [not found on site](not found on site) | unverified | T2 | none / none / none / none | none |  | Active per exchange4media search result (President elected for 2026-28). Official domain not confirmed; eventm |
| IPRS / PPL India / Novex | [iprs.org](https://www.iprs.org/) | unverified | T3 | none / none / none / none | none |  | iprs.org and pplindia.org returned 403; novexindia.com failed SSL. Unverified; licensing bodies unlikely to an |
| PIB (Press Information Bureau) - I&B releases | [pib.gov.in](https://pib.gov.in/) | unverified | T1 | none / none / none / none | none | announce | Guessed RSS URL (pib.gov.in/RssMain.aspx) returned 403; not recorded as a feed. Existence of a feed unverified |
| Music Business Worldwide | [musicbusinessworldwide.com](https://www.musicbusinessworldwide.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| IQ Magazine | [iqmagazine.com](https://www.iqmagazine.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The Ticketing Business | [theticketingbusiness.com](https://www.theticketingbusiness.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Impact (impactonnet.com) | [impactonnet.com](https://www.impactonnet.com) | unverified | T3 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Daily Jagran (jagran.com) | [jagran.com](https://www.jagran.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| BW Businessworld | [businessworld.in](https://www.businessworld.in) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| PTI (Press Trust of India) | [ptinews.com](https://www.ptinews.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| ANI | [aninews.in](https://www.aninews.in) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| IANS | [ians.in](https://www.ians.in) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The Economic Times | [economictimes.indiatimes.com](https://economictimes.indiatimes.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The Hindu | [thehindu.com](https://www.thehindu.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Hindustan Times | [hindustantimes.com](https://www.hindustantimes.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The Indian Express | [indianexpress.com](https://indianexpress.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Mint (LiveMint) | [livemint.com](https://www.livemint.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Business Standard | [business-standard.com](https://www.business-standard.com) | unverified | T1 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Deccan Herald | [deccanherald.com](https://www.deccanherald.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Mid-day | [mid-day.com](https://www.mid-day.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The Telegraph India | [telegraphindia.com](https://www.telegraphindia.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The Hindu BusinessLine | [thehindubusinessline.com](https://www.thehindubusinessline.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| The New Indian Express | [newindianexpress.com](https://www.newindianexpress.com) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| T2 Online (The Telegraph, Kolkata) | [t2online.in](https://t2online.in) | unverified | T2 | none / none / none / none | none |  | Not checked: fetch blocked or not attempted. |
| Percept Live | [perceptlive.com](https://www.perceptlive.com) | unverified | T2 | none / none / none / none | none | announce | WebFetch failed (socket closed) on perceptlive.com and www.perceptlive.com; root domain unverified. |
| BookMyShow Live | [in.bookmyshow.com](https://in.bookmyshow.com) | unverified | T2 | none / none / none / none | none | announce, sale date | WebFetch refused in-bookmyshow.com (tool blocked). Not fetched; no robots check possible. |
| Lollapalooza India | [lollaindia.com](https://lollaindia.com) | unverified | T1 | none / none / none / none | none | announce, sale date, early bird | lollaindia.com and www.lollaindia.com fetched but returned empty content (likely JS app). robots.txt empty. Se |
| Oranjuice Entertainment | none | unverified | T3 | none / none / none / none | none |  | oranjuice.com fetch failed; no official site found via search; only a 2012 Helter Skelter mention. |
| Teamwork Arts (Jaipur Literature Festival / Jaipur Music Stage) | [teamworkarts.com](https://www.teamworkarts.com) | unverified | T2 | none / none / none / none | none | announce, sale date | teamworkarts.com and jlflitfest.org fetches returned only fragments/title (JS rendered). Dates come from searc |
| VH1 Supersonic | none | unverified | T3 | none / none / none / none | none |  | No official site found. Only a 2024 edition (Medianews4u) and a spammy blog claiming 2026. |
| Enchanted Valley Carnival | none | unverified | T3 | none / none / none / none | none |  | Nothing found in search. |
| Sawai Gandharva Bhimsen Mahotsav (Arya Sangeet Prasarak Mandal) | none | unverified | T3 | none / none / none / none | none | announce | Wikipedia-listed domain sawaigandharvabhimsenmahotsav.com does not resolve (ENOTFOUND). 2025 edition covered b |
| ACTC Events | none | unverified | T3 | none / none / none / none | none |  | No site found. Organised A R Rahman Marakkuma Nenjam 2023 and Ilaiyaraaja Chennai concert (TheNewsMinute/Gulf  |
| Ripple Effect Studios | none | unverified | T3 | none / none / none / none | none |  | No official site found; Diljit Dosanjh Dil-Luminati organiser with Saregama (News Arena). |
| Canvas Laugh Club | none | unverified | T3 | none / none / none / none | none |  | canvaslaughclub.com fetch failed; search sources are 2017-18. |
| Resident Advisor | [ra.co](https://ra.co) | unverified | T1 | none / none / none / none | none | announce, sale date | HTTP 403 on fetch; robots and terms not read. |
| EventsHigh | [eventshigh.com](https://www.eventshigh.com) | unverified | T3 | none / none / none / none | none | announce | Fetch failed with HTTP 530. |
| TicketNew | [ticketnew.com](https://www.ticketnew.com) | unverified | T3 | none / none / none / none | none |  | Homepage fetch showed movie/theatre navigation only. |
| Dreamcast | [dreamcast.in](https://www.dreamcast.in) | unverified | T3 | none / none / none / none | none |  | Not fetched directly; known from search results only. |
| PVR INOX | [pvrcinemas.com](https://www.pvrcinemas.com) | unverified | T2 | none / none / none / none | none |  | Fetch returned empty content. |
| Dice | [dice.fm](https://dice.fm) | unverified | T3 | none / none / none / none | none |  | HTTP 403. |
| Swiggy Scenes | [swiggy.com](https://www.swiggy.com/scenes) | unverified | T2 | none / none / none / none | none | announce | URL returned 404; app-centric. |
| NICE Grounds, Tumkur Road/Madavara | none | unverified | T3 | none / none / none / none | none |  | No official site found; nicegrounds.com does not resolve. Events appear only via promoters/ticketers (Fred aga |
| Terraform / District Arena, Yelahanka | none | unverified | T3 | none / none / none / none | none |  | Search found only third-party listings (e.g. Gorillaz 23 Jan 2027 listed on resale sites). No official domain  |
| Manpho Convention Centre | none | unverified | T3 | none / none / none / none | none |  | Directories suggest manphoconvention.com, but fetch failed: TLS certificate belongs to another domain (boswell |
| KTPO Trade Centre | none | unverified | T3 | none / none / none / none | none |  | ktpo.com connection refused (ECONNREFUSED); no official site verified. |
| Phoenix Marketcity Bengaluru | [phoenixmarketcity.com](https://www.phoenixmarketcity.com/bangalore) | unverified | T2 | none / none / none / none | none |  | URL suggested by search; fetch failed with TLS 'unable to verify the first certificate'. Not verified. |
| Palace Grounds Bengaluru | none | unverified | T3 | none / none / none / none | none |  | Not searched; no official site known. |
| Kanteerava Stadium Bengaluru | none | unverified | T3 | none / none / none / none | none |  | Not searched; government-run, no official events site known. |
| M. Chinnaswamy Stadium / KSCA | none | unverified | T3 | none / none / none / none | none |  | kscacricket.com does not resolve; official KSCA domain not found. Stadium cleared Jan 2026 to host IPL/interna |
| Mehboob Studio, Bandra | none | unverified | T3 | none / none / none / none | none |  | No official site found in search; only third-party coverage. |
| Bandra Fort amphitheatre; MMRDA Grounds (BKC) | none | unverified | T3 | none / none / none / none | none |  | Not researched; government-controlled, no event calendar known. |
| antiSOCIAL (Mumbai Lower Parel / Delhi) | none | unverified | T3 | none / none / none / none | none |  | No official site found; Time Out says schedule is announced on Instagram and sold via Insider. |
| Jawaharlal Nehru Stadium, Delhi (SAI) | none | unverified | T3 | none / none / none / none | none |  | No venue events page found; owned by Sports Authority of India. Diljit Dosanjh 1 Nov 2026 appears on a resale  |
| Indira Gandhi Arena; Talkatora Stadium; Dilli Haat | none | unverified | T3 | none / none / none / none | none |  | Not researched in this pass. |
| Kingdom of Dreams, Gurugram | [kingdomofdreams.in](https://kingdomofdreams.in) | unverified | T2 | none / none / none / none | none |  | Domain only from third-party travel pages; fetch returned only domain text and one attempt was rate-limited by |
| Siri Fort Auditorium, Delhi | none | unverified | T3 | none / none / none / none | none |  | No official site found; sirifortauditorium.com does not resolve. Search gave only travel pages. |
| Hard Rock Cafe / Summer House (Delhi-NCR) | none | unverified | T3 | none / none / none / none | none |  | hardrock.com/cafes/new-delhi/ returned 404. Summer House not researched. |
| Gachibowli Stadium / G.M.C. Balayogi Stadium (SATS) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Shilpakala Vedika | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Ravindra Bharathi | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Lal Bahadur Stadium | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Jawaharlal Nehru Stadium Chennai (SDAT) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| YMCA Nandanam Chennai | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Chennai Trade Centre (TNTPO) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Phoenix Marketcity Pune / Chennai | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Balewadi Stadium Pune | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Salt Lake Stadium / Yuva Bharati Krirangan | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Rabindra Sadan / Nandan / Princep Ghat | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Narendra Modi Stadium (Gujarat Cricket Association) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Sabarmati Riverfront Ahmedabad | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Punjab Cricket Association IS Bindra Stadium Mohali | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Tagore Theatre Chandigarh | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Sector 34 Exhibition Ground Chandigarh | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Jawahar Kala Kendra Jaipur | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Sawai Mansingh Stadium Jaipur | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Indore venues (Holkar Stadium, Rabindra Natya Griha) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Jawaharlal Nehru International Stadium Kochi (GCDA) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Bolgatty Palace Kochi | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Dr Shyama Prasad Mukherjee Stadium Goa / Vagator-Anjuna clubs | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Lucknow venues (Ekana Stadium etc.) | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |
| Bhopal, Guwahati, Shillong, Bhubaneswar, Coimbatore, Mysuru, Visakhapatnam venues | none | unverified | T3 | none / none / none / none | none |  | Not checked: no fetch of robots/terms succeeded. |

## Rejected

| Name | Domain | Reason |
|---|---|---|
| JioSaavn | jiosaavn.com | No concert listings feature found; streaming-only. |
| Karan Aujla | n/a | karanaujla.com is not the artist's site; no official site found. |
| Inc42 | inc42.com | Startup/tech funding publication; no live-entertainment or concert coverage found - out of scope. |
| Helter Skelter | helterskelter.in | Literary magazine; no gigs/news section; no live-show announcements. |
| Fountainhead MKTG | n/a | Corporate experiential agency with no verifiable public site or ticketed-event announcements. |
| Paytm Insider | insider.in | Superseded: insider.in permanently redirects to district.in after the Zomato acquisition. |
| Ticketmaster India | n/a | No evidence Ticketmaster operates in India; search hits are SEO template pages. |
| KyaZoonga | kyazoonga.com | Domain repurposed to an unrelated Japanese site; former Indian ticketer no longer there. Treat as lookalike/hijack risk. |
| nscidome.com (seed guess for NSCI Dome) | nscidome.com | Domain does not resolve; real operator site is domeindia.com |
| Kala Academy Goa (kalaacademygoa.org guess) | kalaacademygoa.org | Redirects to unrelated domain paithalmala.info; not the venue's site. |
