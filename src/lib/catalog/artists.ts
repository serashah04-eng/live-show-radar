export type Origin = "indian_indie" | "bollywood" | "international" | "other";

export interface CatalogArtist {
  name: string;
  origin: Origin;
  genres: string[]; // genre slugs from genres.ts
  aliases: string[];
}

// A catalogue of well-known artists so people can PICK instead of typing. Being listed here says nothing
// about whether an artist has shows: only the discovery sources and their evidence do that.
// Row format: Name | origin (i=Indian indie, b=Bollywood/film, n=international, o=other) | genres | aliases
const ROWS = `
Prateek Kuhad|i|indie-folk,singer-songwriter,indie|
Anuv Jain|i|indie-pop,singer-songwriter,indie|
When Chai Met Toast|i|indie-pop,indie|WCMT
The Local Train|i|indie-rock,rock|TLT
Peter Cat Recording Co|i|indie,jazz|Peter Cat;Peter Cat Recording Company
Lifafa|i|indie-pop,alternative|
Parvaaz|i|indie-rock,alternative|
Raghu Dixit Project|i|folk-fusion,rock|Raghu Dixit
Indian Ocean|i|folk-fusion,rock|
Avial|i|folk-fusion,rock|
Thaikkudam Bridge|i|folk-fusion,indie|
Swarathma|i|folk-fusion,rock|
Agam|i|classical-fusion,rock|
Dualist Inquiry|i|electronic,indie|
Taba Chake|i|indie-folk,singer-songwriter|
The F16s|i|indie-rock,rock|
Pineapple Express|i|rock,indie-rock|
Ankur Tewari|i|singer-songwriter,indie|
Dhruv Visvanath|i|singer-songwriter,indie|
Sid Sriram|i|rnb,south-indian-film,singer-songwriter|
Zaeden|i|electronic,indie-pop|
Ritviz|i|electronic,indie-pop|
Nucleya|i|electronic,edm|
Lost Stories|i|edm,electronic|
Skyharbor|i|metal|
Bloodywood|i|metal,folk-fusion|
Kryptos|i|metal|
Gutslit|i|metal|
Demonic Resurrection|i|metal|
Shaa'ir + Func|i|rock,indie-rock|Shaair and Func
Hanumankind|i|hip-hop|
Seedhe Maut|i|hip-hop|
Divine|i|hip-hop|
Raftaar|i|hip-hop|
KR$NA|i|hip-hop|Krsna;Krishna
Prabh Deep|i|hip-hop|
Kaam Bhaari|i|hip-hop|
MC Stan|i|hip-hop|
Emiway Bantai|i|hip-hop|
Brodha V|i|hip-hop|
Yashraj|i|hip-hop,pop|
Naezy|i|hip-hop|
Badshah|b|hip-hop,bollywood,pop|
Yo Yo Honey Singh|b|hip-hop,punjabi-pop,bollywood|Honey Singh
Diljit Dosanjh|b|punjabi-pop,bollywood|
AP Dhillon|i|punjabi-pop,hip-hop|
Karan Aujla|i|punjabi-pop,hip-hop|
Guru Randhawa|b|punjabi-pop,bollywood|
Nooran Sisters|o|sufi-ghazal,punjabi-pop,folk-fusion|
Mame Khan|o|folk-fusion,sufi-ghazal|
Jasleen Royal|b|bollywood,indie-pop|
Arijit Singh|b|bollywood|
Shreya Ghoshal|b|bollywood|
Sunidhi Chauhan|b|bollywood|
Vishal Mishra|b|bollywood|
Armaan Malik|b|bollywood,pop|
Jubin Nautiyal|b|bollywood|
Darshan Raval|b|bollywood,pop|
Neha Kakkar|b|bollywood,pop|
A. R. Rahman|b|bollywood,south-indian-film,classical-fusion|AR Rahman;A R Rahman
Pritam|b|bollywood|
Vishal-Shekhar|b|bollywood|Vishal and Shekhar
Shankar-Ehsaan-Loy|b|bollywood|Shankar Ehsaan Loy
Shankar Mahadevan|b|bollywood,classical-fusion|
Sonu Nigam|b|bollywood|
Mohit Chauhan|b|bollywood,indie-folk|
Sachin-Jigar|b|bollywood|Sachin Jigar
Amit Trivedi|b|bollywood,indie|
B Praak|b|bollywood|
Dhvani Bhanushali|b|bollywood,pop|
Asees Kaur|b|bollywood|
Papon|b|bollywood,folk-fusion|
Shaan|b|bollywood,pop|
Kailash Kher|b|bollywood,sufi-ghazal,folk-fusion|
Hariharan|b|bollywood,sufi-ghazal|
Udit Narayan|b|bollywood|
Alka Yagnik|b|bollywood|
Monali Thakur|b|bollywood|
Palak Muchhal|b|bollywood|
Harshdeep Kaur|b|bollywood,sufi-ghazal|
Mika Singh|b|bollywood,punjabi-pop|
Sukhwinder Singh|b|bollywood,sufi-ghazal|
Benny Dayal|b|bollywood,pop|
Shilpa Rao|b|bollywood|
Nikhil D'Souza|b|bollywood,pop|
Rekha Bhardwaj|b|bollywood,sufi-ghazal|
Ankit Tiwari|b|bollywood|
Anirudh Ravichander|b|south-indian-film,pop|Anirudh
Yuvan Shankar Raja|b|south-indian-film|
Devi Sri Prasad|b|south-indian-film|DSP
Thaman S|b|south-indian-film|
Harris Jayaraj|b|south-indian-film|
Ilaiyaraaja|b|south-indian-film,classical-fusion|
Zakir Hussain|o|hindustani-classical,classical-fusion|
Anoushka Shankar|o|hindustani-classical,classical-fusion|
Hariprasad Chaurasia|o|hindustani-classical|
Amjad Ali Khan|o|hindustani-classical|
Shubha Mudgal|o|hindustani-classical,sufi-ghazal|
Ranjani-Gayatri|o|carnatic|Ranjani Gayatri
T M Krishna|o|carnatic|TM Krishna
Ghulam Ali|o|sufi-ghazal|
Coldplay|n|pop,alternative,international|
Ed Sheeran|n|pop,singer-songwriter,international|
Maroon 5|n|pop,international|
Imagine Dragons|n|rock,pop,international|
Dua Lipa|n|pop,international|
The Weeknd|n|rnb,pop,international|
Taylor Swift|n|pop,international|
Billie Eilish|n|pop,alternative,international|
Bruno Mars|n|pop,funk-soul,international|
Post Malone|n|hip-hop,pop,international|
Kendrick Lamar|n|hip-hop,international|
Travis Scott|n|hip-hop,international|
Bryan Adams|n|rock,international|
Enrique Iglesias|n|pop,latin,international|
Shakira|n|latin,pop,international|
Bad Bunny|n|latin,hip-hop,international|
Justin Bieber|n|pop,international|
Shawn Mendes|n|pop,international|
Harry Styles|n|pop,international|
Olivia Rodrigo|n|pop,international|
Charlie Puth|n|pop,international|
Lewis Capaldi|n|pop,singer-songwriter,international|
Sam Smith|n|pop,funk-soul,international|
Hozier|n|indie-folk,blues,international|
Mumford & Sons|n|indie-folk,international|
Lauv|n|pop,international|
Sigrid|n|pop,international|
Lorde|n|pop,alternative,international|
Aurora|n|pop,ambient,international|
John Legend|n|rnb,funk-soul,international|
Akon|n|rnb,hip-hop,international|
Jason Derulo|n|pop,rnb,international|
Sean Paul|n|reggae,hip-hop,international|
Kali Uchis|n|rnb,latin,international|
Anderson .Paak|n|funk-soul,rnb,hip-hop,international|Anderson Paak
Khruangbin|n|funk-soul,psychedelic,international|
Jacob Collier|n|jazz,international|
Cigarettes After Sex|n|indie,ambient,international|
Boy Pablo|n|indie-pop,international|
Mac DeMarco|n|indie,international|
Vampire Weekend|n|indie-rock,international|
The 1975|n|indie-pop,alternative,international|
Arctic Monkeys|n|indie-rock,rock,international|
Tame Impala|n|psychedelic,indie,international|
Radiohead|n|alternative,rock,international|
Linkin Park|n|rock,metal,international|
Green Day|n|rock,punk,international|
Foo Fighters|n|rock,international|
Guns N' Roses|n|hard-rock,rock,international|Guns N Roses
Metallica|n|metal,international|
Iron Maiden|n|metal,international|
Martin Garrix|n|edm,international|
Alan Walker|n|edm,international|
Zedd|n|edm,international|
Calvin Harris|n|edm,international|
David Guetta|n|edm,international|
Marshmello|n|edm,international|
The Chainsmokers|n|edm,pop,international|
Afrojack|n|edm,international|
Tiesto|n|edm,international|Tiësto
Kygo|n|edm,international|
Swedish House Mafia|n|edm,techno-house,international|
Armin van Buuren|n|edm,techno-house,international|
Diplo|n|edm,electronic,international|
Skrillex|n|edm,electronic,international|
Fred again..|n|electronic,techno-house,international|Fred again
Above & Beyond|n|electronic,edm,international|
Eric Prydz|n|techno-house,international|
Charlotte de Witte|n|techno-house,international|
Peggy Gou|n|techno-house,international|
Black Coffee|n|techno-house,electronic,international|
BTS|n|kpop,pop,international|
BLACKPINK|n|kpop,international|
Stray Kids|n|kpop,international|
TWICE|n|kpop,international|
`;

const ORIGIN: Record<string, Origin> = { i: "indian_indie", b: "bollywood", n: "international", o: "other" };

export const ARTIST_CATALOG: CatalogArtist[] = ROWS.trim()
  .split("\n")
  .map((line) => {
    const [name, o, genres, aliases] = line.split("|");
    return {
      name: name.trim(),
      origin: ORIGIN[o],
      genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
      aliases: (aliases ?? "").split(";").map((a) => a.trim()).filter(Boolean),
    };
  });
