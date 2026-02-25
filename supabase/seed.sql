-- =============================================================================
-- Faniverz Telugu Movie Calendar — Seed Data (Expanded)
-- =============================================================================
-- 120 movies, 30 actors, 8 platforms, ~120 cast links, ~60 platform links,
-- 20 surprise content items.
-- Idempotent: all inserts use ON CONFLICT DO NOTHING.
-- Run with: supabase db reset   (applies migrations then seed)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. OTT Platforms (8)
-- -----------------------------------------------------------------------------
INSERT INTO platforms (id, name, logo, color, display_order) VALUES
  ('aha',     'Aha',              'aha', '#FF6B00', 1),
  ('netflix', 'Netflix',          'N',   '#E50914', 2),
  ('prime',   'Amazon Prime',     'P',   '#00A8E1', 3),
  ('hotstar', 'Disney+ Hotstar',  'H',   '#0F1014', 4),
  ('zee5',    'ZEE5',             'Z5',  '#8E3ED6', 5),
  ('sunnxt',  'Sun NXT',          'SN',  '#FF6600', 6),
  ('sonyliv', 'SonyLIV',          'SL',  '#0078FF', 7),
  ('etvwin',  'ETV Win',          'EW',  '#FF0000', 8)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Movies (120 Telugu films)
-- -----------------------------------------------------------------------------
-- 40 theatrical + 40 ott + 40 upcoming
-- Dates spread across 2024–2027, all genres, all certifications
-- -----------------------------------------------------------------------------
INSERT INTO movies (
  title, poster_url, backdrop_url, release_date, runtime,
  genres, certification, trailer_url, synopsis, director,
  release_type, rating, review_count, is_featured
) VALUES

-- ===================== THEATRICAL (40) =====================

('Pushpa 2: The Rule',
 'https://image.tmdb.org/t/p/w500/t5ePZYRibJ0EEK1FK3GhihVkDW5.jpg',
 'https://image.tmdb.org/t/p/w1280/keC82cQ8q0ZHthrbvzWq04kGnbv.jpg',
 '2024-12-05', 200, ARRAY['Action','Drama'], 'UA',
 'https://www.youtube.com/watch?v=pushpa2trailer',
 'Pushpa Raj continues his meteoric rise in the smuggling syndicate, navigating treacherous alliances and deadly rivalries while the law closes in on his empire.',
 'Sukumar', 'theatrical', 4.2, 156, false),

('Devara: Part 1',
 'https://image.tmdb.org/t/p/w500/lQfuaXjANoTsdx5iS0gCXlK9D2L.jpg',
 'https://image.tmdb.org/t/p/w1280/hAQnXxOwCjgYcKRgTdYPRC8neqL.jpg',
 '2024-09-27', 165, ARRAY['Action','Thriller'], 'UA',
 'https://www.youtube.com/watch?v=devaratrailer',
 'A fierce leader protects his coastal village from smugglers and corruption, but when his son must step into his shoes, a new chapter of violence and vengeance unfolds.',
 'Koratala Siva', 'theatrical', 3.5, 89, true),

('Game Changer',
 'https://image.tmdb.org/t/p/w500/qtOGsZoLW7QceqKmsOy5nSM6Aik.jpg',
 'https://image.tmdb.org/t/p/w1280/aBw406SvghTKV6CTK9t84Bo9Xik.jpg',
 '2025-01-10', 157, ARRAY['Action','Political','Drama'], 'UA',
 'https://www.youtube.com/watch?v=gamechangertrailer',
 'An idealistic IAS officer takes on a corrupt political system, uncovering a web of deceit that threatens democracy while fighting to bring real change.',
 'Shankar', 'theatrical', 2.8, 120, false),

('Sankranthiki Vasthunnam',
 'https://image.tmdb.org/t/p/w500/gFa07KuR3tWFI6YFTeGz930zeMo.jpg',
 'https://image.tmdb.org/t/p/w1280/34vhD3KFITH2Ymeh1wF73zZXYDZ.jpg',
 '2025-01-14', 146, ARRAY['Action','Comedy'], 'UA',
 'https://www.youtube.com/watch?v=sankranthikitrailer',
 'A former cop is pulled back into action during the festive Sankranti season, juggling family chaos and a thrilling investigation with comedic flair.',
 'Anil Ravipudi', 'theatrical', 3.9, 95, false),

('Waltair Veerayya',
 'https://image.tmdb.org/t/p/w500/wHr3bKhYpiDiYVMZLZqebeauEVw.jpg',
 'https://image.tmdb.org/t/p/w1280/keC82cQ8q0ZHthrbvzWq04kGnbv.jpg',
 '2024-01-13', 155, ARRAY['Action','Comedy'], 'UA',
 NULL,
 'A fisherman with a fearsome reputation leads a double life, secretly working to bring down a dangerous drug cartel threatening his coastal community.',
 'Bobby Kolli', 'theatrical', 3.6, 134, false),

('Bhimaa',
 'https://picsum.photos/seed/b3f6822afe/500/750',
 'https://picsum.photos/seed/b3f6822afebg/1280/720',
 '2024-02-09', 148, ARRAY['Action','Drama'], 'UA',
 NULL,
 'A powerful warrior rises to protect the oppressed in a tale of justice, honor, and righteous fury set against the backdrop of ancient traditions.',
 'Gopichand Malineni', 'theatrical', 2.9, 67, false),

('Tillu Square',
 'https://picsum.photos/seed/d62c3b4de8/500/750',
 'https://picsum.photos/seed/d62c3b4de8bg/1280/720',
 '2024-03-29', 138, ARRAY['Comedy','Crime'], 'A',
 NULL,
 'Tillu returns with double the trouble and double the laughs as he stumbles into another convoluted crime mystery while trying to impress a new love interest.',
 'Mallik Ram', 'theatrical', 4.0, 198, false),

('Bro',
 'https://picsum.photos/seed/9855e0b1ce/500/750',
 'https://picsum.photos/seed/9855e0b1cebg/1280/720',
 '2024-04-12', 145, ARRAY['Fantasy','Family','Drama'], 'U',
 NULL,
 'A young man discovers a mystical connection to the god of time, leading to a heartfelt journey that bridges the gap between generations.',
 'Samuthirakani', 'theatrical', 2.5, 88, false),

('Guntur Kaaram',
 'https://picsum.photos/seed/0643c3d57b/500/750',
 'https://picsum.photos/seed/0643c3d57bbg/1280/720',
 '2024-01-12', 158, ARRAY['Drama','Action'], 'UA',
 NULL,
 'A rebellious young man with deep-rooted family issues confronts the demons of his past while navigating a volatile world of power and loyalty.',
 'Trivikram Srinivas', 'theatrical', 2.7, 176, false),

('Bholaa Shankar',
 'https://picsum.photos/seed/56f6fe0c64/500/750',
 'https://picsum.photos/seed/56f6fe0c64bg/1280/720',
 '2024-08-11', 150, ARRAY['Action','Family'], 'UA',
 NULL,
 'A fearless older brother will stop at nothing to protect his sister, battling an army of criminals in a pulse-pounding quest for family honor.',
 'Meher Ramesh', 'theatrical', 2.2, 110, false),

('Kisi Ka Bhai Kisi Ki Jaan (Telugu)',
 'https://picsum.photos/seed/7a85b8a24c/500/750',
 'https://picsum.photos/seed/7a85b8a24cbg/1280/720',
 '2024-04-21', 142, ARRAY['Action','Comedy','Romance'], 'UA',
 NULL,
 'An overprotective brother meddles in his siblings'' love lives, leading to hilarious misunderstandings and an unexpected cross-border adventure.',
 'Farhad Samji', 'theatrical', 1.8, 45, false),

('Agent',
 'https://picsum.photos/seed/7446050b84/500/750',
 'https://picsum.photos/seed/7446050b84bg/1280/720',
 '2024-04-28', 144, ARRAY['Action','Thriller'], 'UA',
 NULL,
 'A covert intelligence agent is tasked with a dangerous mission to neutralize a global terrorist network with ties to his own troubled past.',
 'Surender Reddy', 'theatrical', 2.4, 95, false),

('Skanda',
 'https://picsum.photos/seed/83e6b898fb/500/750',
 'https://picsum.photos/seed/83e6b898fbbg/1280/720',
 '2024-10-05', 151, ARRAY['Action','Drama'], 'UA',
 NULL,
 'A fearless young man from a small town takes on a powerful land mafia to save his community, sparking a revolution that shakes the establishment.',
 'Boyapati Srinu', 'theatrical', 3.0, 78, false),

('Bhagavanth Kesari',
 'https://picsum.photos/seed/bf8b46eb01/500/750',
 'https://picsum.photos/seed/bf8b46eb01bg/1280/720',
 '2024-10-19', 163, ARRAY['Action','Drama'], 'UA',
 NULL,
 'A father embarks on a relentless mission to rescue his daughter from the clutches of a ruthless criminal organization operating across state borders.',
 'Anil Ravipudi', 'theatrical', 3.4, 130, false),

('Extra Ordinary Man',
 'https://picsum.photos/seed/50d3e43c7e/500/750',
 'https://picsum.photos/seed/50d3e43c7ebg/1280/720',
 '2024-01-26', 135, ARRAY['Comedy','Drama'], 'UA',
 NULL,
 'An ordinary middle-class man accidentally gains superhuman abilities, turning his mundane life upside down in this comedic tale of everyday heroism.',
 'Vakkantham Vamsi', 'theatrical', 3.1, 72, false),

('Hi Nanna',
 'https://picsum.photos/seed/8a8f85e2e3/500/750',
 'https://picsum.photos/seed/8a8f85e2e3bg/1280/720',
 '2024-12-25', 142, ARRAY['Romance','Drama','Family'], 'U',
 NULL,
 'A single father raises his daughter alone, keeping a painful secret about her mother, until an unexpected reunion forces him to confront the truth.',
 'Shouryuv', 'theatrical', 4.3, 210, false),

('Salaar: Part 1',
 'https://picsum.photos/seed/80d8553fda/500/750',
 'https://picsum.photos/seed/80d8553fdabg/1280/720',
 '2024-12-22', 175, ARRAY['Action','Thriller'], 'A',
 NULL,
 'A man is drawn into a violent power struggle in a fictional city-state, where loyalties are tested and the line between friend and foe blurs.',
 'Prashanth Neel', 'theatrical', 3.7, 280, false),

('Eagle',
 'https://picsum.photos/seed/7885830f9d/500/750',
 'https://picsum.photos/seed/7885830f9dbg/1280/720',
 '2024-03-15', 140, ARRAY['Thriller','Crime'], 'A',
 NULL,
 'A mysterious vigilante known as Eagle terrorizes the criminal underworld of Hyderabad, but a determined cop is closing in on his true identity.',
 'Karthik Gattamneni', 'theatrical', 2.6, 55, false),

('Hanu Man',
 'https://picsum.photos/seed/1526390581/500/750',
 'https://picsum.photos/seed/1526390581bg/1280/720',
 '2024-01-12', 158, ARRAY['Action','Fantasy','Adventure'], 'UA',
 NULL,
 'A humble village man gains supernatural powers reminiscent of Lord Hanuman and becomes an unlikely superhero defending the weak against corporate greed.',
 'Prasanth Varma', 'theatrical', 4.1, 245, false),

('Saripodhaa Sanivaaram',
 'https://picsum.photos/seed/c73664acab/500/750',
 'https://picsum.photos/seed/c73664acabbg/1280/720',
 '2024-08-29', 162, ARRAY['Action','Thriller'], 'UA',
 NULL,
 'A man with severe anger issues channels his rage constructively by unleashing it only on Saturdays to fight against a corrupt cop terrorizing a village.',
 'Vivek Athreya', 'theatrical', 3.8, 168, false),

('Veera Simha Reddy',
 'https://picsum.photos/seed/e1180daf8f/500/750',
 'https://picsum.photos/seed/e1180daf8fbg/1280/720',
 '2024-01-12', 155, ARRAY['Action','Drama'], 'UA',
 NULL,
 'A powerful factionist in Rayalaseema navigates a decades-old family feud while trying to protect his loved ones from a rival clan''s vengeance.',
 'Gopichand Malineni', 'theatrical', 2.3, 99, false),

('Aadikeshava',
 'https://picsum.photos/seed/1bf113c8a7/500/750',
 'https://picsum.photos/seed/1bf113c8a7bg/1280/720',
 '2024-05-10', 148, ARRAY['Action','Romance'], 'UA',
 NULL,
 'A young martial arts expert falls in love but must fight a powerful antagonist who threatens to destroy everything he holds dear.',
 'Srikanth N Reddy', 'theatrical', 2.0, 38, false),

('Balagam',
 'https://picsum.photos/seed/41d00615d6/500/750',
 'https://picsum.photos/seed/41d00615d6bg/1280/720',
 '2024-03-03', 132, ARRAY['Drama','Family','Comedy'], 'U',
 NULL,
 'A heartwarming village drama unfolds during a funeral as a dysfunctional family gathers, revealing long-buried secrets and rekindling forgotten bonds.',
 'Venu Yeldandi', 'theatrical', 4.4, 167, false),

('Virupaksha',
 'https://picsum.photos/seed/5c0e277809/500/750',
 'https://picsum.photos/seed/5c0e277809bg/1280/720',
 '2024-04-21', 153, ARRAY['Horror','Thriller'], 'UA',
 NULL,
 'A mysterious series of deaths plague a remote village, and a newcomer must unravel an ancient curse before he becomes the next victim.',
 'Karthik Dandu', 'theatrical', 3.9, 189, false),

('Mangalavaaram',
 'https://picsum.photos/seed/2a828eb58e/500/750',
 'https://picsum.photos/seed/2a828eb58ebg/1280/720',
 '2024-11-10', 145, ARRAY['Horror','Thriller'], 'A',
 NULL,
 'A tribal girl with supernatural powers ventures into the modern world to confront an evil that has been feeding on the vulnerable for centuries.',
 'Ajay Bhupathi', 'theatrical', 4.0, 135, false),

('Akhanda 2',
 'https://picsum.photos/seed/74a9858900/500/750',
 'https://picsum.photos/seed/74a9858900bg/1280/720',
 '2025-04-11', 165, ARRAY['Action','Drama'], 'UA',
 NULL,
 'The fearsome Aghora returns to battle a new demonic threat that endangers the spiritual fabric of an ancient temple town.',
 'Boyapati Srinu', 'theatrical', 3.3, 88, false),

('The Raja Saab',
 'https://picsum.photos/seed/920506ac35/500/750',
 'https://picsum.photos/seed/920506ac35bg/1280/720',
 '2025-04-10', 160, ARRAY['Horror','Comedy','Romance'], 'UA',
 NULL,
 'A wealthy but eccentric nobleman moves into a haunted mansion, leading to hilarious supernatural encounters and an unexpected ghost romance.',
 'Maruthi', 'theatrical', 3.6, 142, false),

('OG',
 'https://picsum.photos/seed/479c0d5c25/500/750',
 'https://picsum.photos/seed/479c0d5c25bg/1280/720',
 '2025-09-27', 148, ARRAY['Action','Drama'], 'UA',
 NULL,
 'An aging don reflects on his life of crime while grooming his reluctant grandson to take over the family empire in this multigenerational saga.',
 'Sujeeth', 'theatrical', 3.2, 76, false),

('Sikandar Ka Muqaddar (Telugu)',
 'https://picsum.photos/seed/7cac548a88/500/750',
 'https://picsum.photos/seed/7cac548a88bg/1280/720',
 '2025-03-14', 139, ARRAY['Comedy','Drama'], 'UA',
 NULL,
 'A diamond heist gone wrong leads three unlikely accomplices on a decade-long cat-and-mouse chase with a relentless detective.',
 'Neeraj Pandey', 'theatrical', 3.5, 62, false),

('Naa Saami Ranga',
 'https://picsum.photos/seed/07816a0356/500/750',
 'https://picsum.photos/seed/07816a0356bg/1280/720',
 '2024-01-14', 150, ARRAY['Action','Drama','Family'], 'UA',
 NULL,
 'A devoted brother who lives by a strict moral code is pushed to the edge when an outsider threatens to destroy his family''s honor.',
 'Vijay Binni', 'theatrical', 3.0, 104, false),

('Miss Shetty Mr Polishetty',
 'https://picsum.photos/seed/735d3adfa6/500/750',
 'https://picsum.photos/seed/735d3adfa6bg/1280/720',
 '2024-09-07', 142, ARRAY['Comedy','Romance'], 'UA',
 NULL,
 'A fiercely independent career woman and a bumbling police constable cross paths in a hilarious battle of wits that slowly turns into love.',
 'Mahesh Babu P', 'theatrical', 3.4, 112, false),

('Mahanati 2: The Queen Returns',
 'https://picsum.photos/seed/0e070699ee/500/750',
 'https://picsum.photos/seed/0e070699eebg/1280/720',
 '2025-05-16', 168, ARRAY['Historical','Drama'], 'U',
 NULL,
 'The untold later years of legendary actress Savitri unfold as she battles personal demons while cementing her legacy as the greatest actress of her era.',
 'Nag Ashwin', 'theatrical', 4.5, 198, false),

('Simha Koduku',
 'https://picsum.photos/seed/dd23731b5a/500/750',
 'https://picsum.photos/seed/dd23731b5abg/1280/720',
 '2025-06-20', 152, ARRAY['Action','Family'], 'UA',
 NULL,
 'A lion-hearted young man from a small village takes on an entire corrupt system to avenge his father and bring justice to the oppressed.',
 'Boyapati Srinu', 'theatrical', 3.1, 66, false),

('Double iSmart',
 'https://picsum.photos/seed/958c17f76f/500/750',
 'https://picsum.photos/seed/958c17f76fbg/1280/720',
 '2025-08-15', 145, ARRAY['Action','Sci-Fi'], 'UA',
 NULL,
 'The smart rebel returns with enhanced abilities to take down a tech tycoon who plans to use brain-hacking technology to control the population.',
 'Puri Jagannadh', 'theatrical', 2.9, 78, false),

('Rakshasudi 2',
 'https://picsum.photos/seed/c1eb168957/500/750',
 'https://picsum.photos/seed/c1eb168957bg/1280/720',
 '2025-07-04', 135, ARRAY['Horror','Thriller'], 'A',
 NULL,
 'A paranormal investigator faces a demonic entity far more powerful than anything encountered before, in this spine-chilling sequel.',
 'Ramesh Varma', 'theatrical', 3.8, 94, false),

('Mega 156',
 'https://picsum.photos/seed/b62b520cc9/500/750',
 'https://picsum.photos/seed/b62b520cc9bg/1280/720',
 '2025-10-10', 155, ARRAY['Action','Drama'], 'UA',
 NULL,
 'A retired army general is forced back into service when a national security threat reveals a mole within the highest ranks of the military.',
 'Meher Ramesh', 'theatrical', 3.4, 108, false),

('Pelli Pusthakam',
 'https://picsum.photos/seed/87bc23b960/500/750',
 'https://picsum.photos/seed/87bc23b960bg/1280/720',
 '2025-02-14', 128, ARRAY['Romance','Comedy','Family'], 'U',
 NULL,
 'Two families with wildly different values collide when their children fall in love, leading to a wedding planning comedy of epic proportions.',
 'Tharun Bhascker', 'theatrical', 4.1, 86, false),

('Mazaka',
 'https://picsum.photos/seed/3f7bc3e4a3/500/750',
 'https://picsum.photos/seed/3f7bc3e4a3bg/1280/720',
 '2025-11-15', 143, ARRAY['Comedy','Adventure'], 'UA',
 NULL,
 'A group of college friends reunite for a treasure hunt based on clues left by a legendary prankster, uncovering surprises at every turn.',
 'Sagar K Chandra', 'theatrical', 3.3, 54, false),

('Dhoom Dhaam',
 'https://picsum.photos/seed/fe285cc31c/500/750',
 'https://picsum.photos/seed/fe285cc31cbg/1280/720',
 '2025-12-20', 140, ARRAY['Action','Comedy'], 'UA',
 NULL,
 'A hapless wedding planner accidentally becomes entangled with a notorious gangster''s celebration, leading to non-stop action and comedy.',
 'Trivikram Srinivas', 'theatrical', 3.7, 72, false),

('Power Star',
 'https://picsum.photos/seed/3735f3a080/500/750',
 'https://picsum.photos/seed/3735f3a080bg/1280/720',
 '2024-06-14', 147, ARRAY['Action','Drama','Political'], 'UA',
 NULL,
 'A charismatic political leader rises from humble beginnings to challenge the status quo, but power comes with a steep personal price.',
 'Harish Shankar', 'theatrical', 2.6, 58, false),

-- ===================== OTT (40) =====================

('Kalki 2898 AD',
 'https://image.tmdb.org/t/p/w500/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg',
 'https://image.tmdb.org/t/p/w1280/o8XSR1SONnjcsv84NRu6Mwsl5io.jpg',
 '2024-06-27', 181, ARRAY['Sci-Fi','Action','Drama'], 'UA',
 'https://www.youtube.com/watch?v=kalki2898adtrailer',
 'In a dystopian future set in 2898 AD, a bounty hunter named Bhairava embarks on a mythological quest intertwined with the prophecy of the tenth avatar of Vishnu.',
 'Nag Ashwin', 'ott', 3.8, 234, false),

('Lucky Baskhar',
 'https://image.tmdb.org/t/p/w500/a47JQFl9L7VDa79tEvnTOJe0rPa.jpg',
 'https://image.tmdb.org/t/p/w1280/q8UyN4XhpmChtneZXdZ8fktQka6.jpg',
 '2024-10-31', 149, ARRAY['Crime','Drama','Thriller'], 'UA',
 'https://www.youtube.com/watch?v=luckybaskhartrailer',
 'A meek bank employee stumbles upon a financial scam and transforms into a cunning mastermind, risking everything for a shot at a better life for his family.',
 'Venky Atluri', 'ott', 4.5, 178, false),

('Robinhood',
 'https://image.tmdb.org/t/p/w500/zeH5oAM1A3zgXbvQ3L9GiDs3ldQ.jpg',
 'https://image.tmdb.org/t/p/w1280/q1vULesWRw5h0rlsEGqTNh3FT1R.jpg',
 '2024-11-22', 145, ARRAY['Action','Drama'], 'UA',
 'https://www.youtube.com/watch?v=robinhoodtrailer',
 'A rebellious vigilante steals from the corrupt elite to uplift the downtrodden, sparking a revolution that threatens the powerful establishment.',
 'Buchi Babu Sana', 'ott', 3.2, 67, false),

('Hari Hara Veera Mallu',
 'https://image.tmdb.org/t/p/w500/mKM3yC7kepjfs8A723dqd9hOky8.jpg',
 'https://image.tmdb.org/t/p/w1280/vg0n59EwKomMNJwlbt1CqlgFDI2.jpg',
 '2024-03-28', 158, ARRAY['Historical','Action','Adventure'], 'UA',
 'https://www.youtube.com/watch?v=hariharatrailer',
 'Set in the 17th-century Mughal era, a swashbuckling outlaw embarks on an epic adventure filled with daring heists, royal intrigue, and legendary battles.',
 'Krish Jagarlamudi', 'ott', 2.5, 112, false),

('Kushi',
 'https://picsum.photos/seed/dec9f9194b/500/750',
 'https://picsum.photos/seed/dec9f9194bbg/1280/720',
 '2024-09-01', 146, ARRAY['Romance','Comedy','Drama'], 'UA',
 NULL,
 'A married couple with opposing ideologies navigate the ups and downs of a modern relationship in this feel-good romantic drama.',
 'Shiva Nirvana', 'ott', 3.5, 155, false),

('Ante Sundaraniki',
 'https://picsum.photos/seed/3f723d9154/500/750',
 'https://picsum.photos/seed/3f723d9154bg/1280/720',
 '2023-06-10', 158, ARRAY['Romance','Comedy'], 'U',
 NULL,
 'A Hindu man and a Christian woman hatch an elaborate plan to convince their orthodox families to accept their inter-faith love.',
 'Vivek Athreya', 'ott', 4.2, 190, false),

('Jailer (Telugu)',
 'https://picsum.photos/seed/39013a9ff8/500/750',
 'https://picsum.photos/seed/39013a9ff8bg/1280/720',
 '2023-08-10', 168, ARRAY['Action','Thriller'], 'UA',
 NULL,
 'A retired jailer comes out of retirement to bring down a dangerous criminal syndicate when his son, an honest cop, is targeted.',
 'Nelson', 'ott', 3.6, 145, false),

('Dasara',
 'https://picsum.photos/seed/3a9d85330e/500/750',
 'https://picsum.photos/seed/3a9d85330ebg/1280/720',
 '2023-03-30', 152, ARRAY['Action','Drama'], 'A',
 NULL,
 'In a coal mining town, a young man''s love story becomes intertwined with political machinations and a bitter factional rivalry.',
 'Srikanth Odela', 'ott', 3.4, 128, false),

('Adipurush (Telugu)',
 'https://picsum.photos/seed/c2a58bf108/500/750',
 'https://picsum.photos/seed/c2a58bf108bg/1280/720',
 '2023-06-16', 143, ARRAY['Historical','Action','Fantasy'], 'UA',
 NULL,
 'The epic tale of Lord Ram''s battle against the demon king Ravana is retold with modern visual effects and a mythological grandeur.',
 'Om Raut', 'ott', 1.5, 310, false),

('Baby',
 'https://picsum.photos/seed/a7b5bdb8cc/500/750',
 'https://picsum.photos/seed/a7b5bdb8ccbg/1280/720',
 '2023-07-14', 130, ARRAY['Drama','Family'], 'U',
 NULL,
 'A young woman from a conservative family pursues her dream of becoming a singer against all odds, inspiring those around her to follow their hearts.',
 'Sai Rajesh', 'ott', 4.0, 87, false),

('Custody',
 'https://picsum.photos/seed/2d82833085/500/750',
 'https://picsum.photos/seed/2d82833085bg/1280/720',
 '2023-05-12', 140, ARRAY['Action','Thriller'], 'UA',
 NULL,
 'A righteous cop must escort a dreaded criminal across the state while corrupt officers and gangsters try to stop them at every turn.',
 'Suresh', 'ott', 2.8, 72, false),

('Pareshan',
 'https://picsum.photos/seed/2c2f2a1879/500/750',
 'https://picsum.photos/seed/2c2f2a1879bg/1280/720',
 '2024-02-23', 125, ARRAY['Comedy','Thriller'], 'UA',
 NULL,
 'Three desperate friends cook up a wild scheme to pay off their debts, but everything that can go wrong does go wrong in spectacular fashion.',
 'Rupak Ronaldson', 'ott', 3.3, 65, false),

('Ori Devuda',
 'https://picsum.photos/seed/a610d460f4/500/750',
 'https://picsum.photos/seed/a610d460f4bg/1280/720',
 '2023-10-21', 133, ARRAY['Romance','Fantasy','Comedy'], 'U',
 NULL,
 'After a bitter breakup, a man is given a chance to relive his relationship from the start by a mischievous divine being.',
 'Ashwath Marimuthu', 'ott', 3.7, 93, false),

('Aakasam Nee Haddura (Re-release)',
 'https://picsum.photos/seed/d88c86b39b/500/750',
 'https://picsum.photos/seed/d88c86b39bbg/1280/720',
 '2024-07-15', 160, ARRAY['Drama','Romance'], 'UA',
 NULL,
 'A pilot from a humble background defies all odds to achieve his dream of flying, while navigating a beautiful but complicated love story.',
 'Sudha Kongara', 'ott', 4.6, 310, false),

('Maestro',
 'https://picsum.photos/seed/2aaa3e8ae5/500/750',
 'https://picsum.photos/seed/2aaa3e8ae5bg/1280/720',
 '2023-09-17', 135, ARRAY['Thriller','Crime'], 'A',
 NULL,
 'A blind pianist becomes the key witness to a murder but must navigate a web of deception where nothing is as it seems.',
 'Merlapaka Gandhi', 'ott', 3.9, 108, false),

('Masooda',
 'https://picsum.photos/seed/74fa807269/500/750',
 'https://picsum.photos/seed/74fa807269bg/1280/720',
 '2023-11-04', 128, ARRAY['Horror','Thriller'], 'A',
 NULL,
 'A single mother discovers that dark supernatural forces have targeted her daughter, and she must fight an ancient evil to save her child.',
 'Sai Kiran', 'ott', 3.8, 96, false),

('Yashoda',
 'https://picsum.photos/seed/95ba921115/500/750',
 'https://picsum.photos/seed/95ba921115bg/1280/720',
 '2023-11-11', 138, ARRAY['Action','Thriller'], 'UA',
 NULL,
 'A pregnant woman becomes a surrogate at a high-tech facility and uncovers a terrifying conspiracy involving illegal medical experiments.',
 'Hari-Harish', 'ott', 3.5, 115, false),

('Shaakuntalam',
 'https://picsum.photos/seed/11d37bd091/500/750',
 'https://picsum.photos/seed/11d37bd091bg/1280/720',
 '2023-04-14', 145, ARRAY['Historical','Romance','Fantasy'], 'U',
 NULL,
 'The timeless love story of Shakuntala and King Dushyanta from ancient Indian mythology is brought to life in a grand visual spectacle.',
 'Gunasekhar', 'ott', 2.1, 88, false),

('Bimbisara (Director''s Cut)',
 'https://picsum.photos/seed/88d237eb59/500/750',
 'https://picsum.photos/seed/88d237eb59bg/1280/720',
 '2024-05-20', 155, ARRAY['Fantasy','Action','Historical'], 'UA',
 NULL,
 'A tyrannical ancient king is transported to the modern world through a time portal, where he must adapt and redeem himself.',
 'Vassishta', 'ott', 3.3, 124, false),

('Committee Kurrollu',
 'https://picsum.photos/seed/01f5a0297a/500/750',
 'https://picsum.photos/seed/01f5a0297abg/1280/720',
 '2024-08-09', 126, ARRAY['Comedy','Drama'], 'U',
 NULL,
 'A group of village youth form a committee to organize the annual temple festival, leading to hilarious misadventures and heartfelt community bonds.',
 'Yadhu Vamsi', 'ott', 4.1, 78, false),

('Mathu Vadalara 2',
 'https://picsum.photos/seed/381480b18c/500/750',
 'https://picsum.photos/seed/381480b18cbg/1280/720',
 '2024-09-13', 140, ARRAY['Comedy','Crime','Thriller'], 'UA',
 NULL,
 'The bumbling duo returns to accidentally stumble into another crime that takes them on a chaotic, laugh-out-loud adventure across Hyderabad.',
 'Ritesh Rana', 'ott', 4.3, 165, false),

('Malli Pelli',
 'https://picsum.photos/seed/4d65f22f64/500/750',
 'https://picsum.photos/seed/4d65f22f64bg/1280/720',
 '2023-04-28', 135, ARRAY['Comedy','Family'], 'U',
 NULL,
 'Three elderly men decide to find love again in their twilight years, leading to heartwarming and hilarious situations that delight their families.',
 'Vijay Yelakanti', 'ott', 3.6, 74, false),

('35 – Chinna Katha Kaadu',
 'https://picsum.photos/seed/0ddf6af196/500/750',
 'https://picsum.photos/seed/0ddf6af196bg/1280/720',
 '2023-07-21', 125, ARRAY['Drama','Thriller'], 'UA',
 NULL,
 'The lives of several strangers intersect on a fateful night, each carrying their own secrets and desperation in this gripping ensemble thriller.',
 'Nanda Kishore', 'ott', 3.1, 52, false),

('MAD',
 'https://picsum.photos/seed/93720e823d/500/750',
 'https://picsum.photos/seed/93720e823dbg/1280/720',
 '2023-06-23', 118, ARRAY['Comedy'], 'UA',
 NULL,
 'Three hostel roommates embark on outrageous adventures during their college years, creating memories that define a generation of youth.',
 'Kalyan Shankar', 'ott', 3.9, 142, false),

('Satyabhama',
 'https://picsum.photos/seed/12e76e72b0/500/750',
 'https://picsum.photos/seed/12e76e72b0bg/1280/720',
 '2024-06-07', 140, ARRAY['Action','Crime','Thriller'], 'UA',
 NULL,
 'A fearless female cop takes on a powerful crime lord in a gripping cat-and-mouse thriller that challenges corruption at every level.',
 'Suman Chikkala', 'ott', 2.7, 68, false),

('Nenu Student Sir',
 'https://picsum.photos/seed/5f68e49d4d/500/750',
 'https://picsum.photos/seed/5f68e49d4dbg/1280/720',
 '2024-06-21', 130, ARRAY['Drama','Comedy','Family'], 'U',
 NULL,
 'A college dropout becomes an accidental teacher in a rural school and transforms the lives of his students through unconventional methods.',
 'Rakesh Sashii', 'ott', 3.4, 55, false),

('Mr. Bachchan',
 'https://picsum.photos/seed/c2352ca19d/500/750',
 'https://picsum.photos/seed/c2352ca19dbg/1280/720',
 '2024-08-15', 148, ARRAY['Action','Crime'], 'UA',
 NULL,
 'A Robin Hood-like figure steals black money from the corrupt elite and secretly distributes it to the poor through the banking system.',
 'Harish Shankar', 'ott', 2.3, 92, false),

('Razakar: The Silent Genocide',
 'https://picsum.photos/seed/d53eca85f2/500/750',
 'https://picsum.photos/seed/d53eca85f2bg/1280/720',
 '2024-03-01', 138, ARRAY['Historical','Drama','Political'], 'A',
 NULL,
 'The harrowing true story of the Razakar militia''s atrocities during the Hyderabad state''s integration into India in 1948.',
 'Yata Satyanarayana', 'ott', 3.7, 156, false),

('Family Star',
 'https://picsum.photos/seed/4f623faa82/500/750',
 'https://picsum.photos/seed/4f623faa82bg/1280/720',
 '2024-04-05', 143, ARRAY['Romance','Family','Drama'], 'U',
 NULL,
 'A hardworking young man juggling family responsibilities meets a free-spirited woman, and their contrasting lifestyles create both conflict and chemistry.',
 'Parasuram Petla', 'ott', 2.6, 83, false),

('Gaami',
 'https://picsum.photos/seed/5066c57a87/500/750',
 'https://picsum.photos/seed/5066c57a87bg/1280/720',
 '2024-03-08', 115, ARRAY['Thriller','Drama'], 'A',
 NULL,
 'An Aghori sadhu travels to the remote mountains of Kashmir on a mysterious mission, encountering spiritual and physical challenges that test his faith.',
 'Vidyadhar Kagita', 'ott', 4.0, 68, false),

('Aa Okkati Adakku',
 'https://picsum.photos/seed/43d183afe7/500/750',
 'https://picsum.photos/seed/43d183afe7bg/1280/720',
 '2024-05-17', 132, ARRAY['Comedy','Drama'], 'UA',
 NULL,
 'A joint family erupts into chaos when a long-lost relative returns claiming inheritance rights, sparking a hilarious battle of wits and emotions.',
 'Malli Ankam', 'ott', 3.5, 77, false),

('Swag',
 'https://picsum.photos/seed/8e2c64d37a/500/750',
 'https://picsum.photos/seed/8e2c64d37abg/1280/720',
 '2025-01-24', 138, ARRAY['Action','Comedy'], 'UA',
 NULL,
 'A street-smart hustler with limitless swag takes on a corporate villain in a stylish action comedy set in the neon-lit streets of Hyderabad.',
 'Hasith Goli', 'ott', 3.2, 64, false),

('Lucky Lakshman',
 'https://picsum.photos/seed/1695196a2d/500/750',
 'https://picsum.photos/seed/1695196a2dbg/1280/720',
 '2025-02-28', 128, ARRAY['Comedy','Fantasy'], 'U',
 NULL,
 'An unlucky man discovers a magical charm that reverses his fortune, but the charm comes with unpredictable and hilarious side effects.',
 'AR Abhi', 'ott', 3.6, 58, false),

('Sardar 2 (Telugu)',
 'https://picsum.photos/seed/9ec0c7a185/500/750',
 'https://picsum.photos/seed/9ec0c7a185bg/1280/720',
 '2025-03-07', 152, ARRAY['Thriller','Action'], 'UA',
 NULL,
 'A double agent navigates a dangerous web of international espionage, with each identity bringing him closer to the truth and further from safety.',
 'PS Mithran', 'ott', 3.3, 84, false),

('Raayan (Telugu)',
 'https://picsum.photos/seed/bdc183b8dc/500/750',
 'https://picsum.photos/seed/bdc183b8dcbg/1280/720',
 '2025-04-25', 145, ARRAY['Action','Crime','Drama'], 'A',
 NULL,
 'A mild-mannered restaurant owner hides a violent past as a feared gangster, but old enemies force him to pick up arms once more.',
 'Dhanush', 'ott', 3.9, 132, false),

('Bhaje Vaayu Vegam',
 'https://picsum.photos/seed/f1b12515dd/500/750',
 'https://picsum.photos/seed/f1b12515ddbg/1280/720',
 '2024-12-13', 130, ARRAY['Comedy','Thriller'], 'UA',
 NULL,
 'A delivery driver accidentally receives a package meant for a notorious criminal, setting off a frantic chase across the city.',
 'Dinesh Kanagaratnam', 'ott', 3.1, 48, false),

('Annapurna Photo Studio',
 'https://picsum.photos/seed/0b866ee777/500/750',
 'https://picsum.photos/seed/0b866ee777bg/1280/720',
 '2025-05-02', 118, ARRAY['Drama','Family'], 'U',
 NULL,
 'A family-run photo studio faces closure in the digital age, and three generations must come together to save their legacy and memories.',
 'Sathyaraj Natarajan', 'ott', 4.2, 71, false),

('Ustaad',
 'https://picsum.photos/seed/420af724dd/500/750',
 'https://picsum.photos/seed/420af724ddbg/1280/720',
 '2024-07-26', 147, ARRAY['Action','Drama'], 'UA',
 NULL,
 'A street-fighting champion with a golden heart protects the marginalized residents of his neighborhood against a ruthless real estate developer.',
 'Phanideep', 'ott', 3.0, 86, false),

('Naandhi',
 'https://picsum.photos/seed/9e3ac5cc6e/500/750',
 'https://picsum.photos/seed/9e3ac5cc6ebg/1280/720',
 '2023-02-19', 135, ARRAY['Drama','Thriller','Crime'], 'UA',
 NULL,
 'An innocent man is framed for a crime he didn''t commit and must fight the broken justice system to prove his innocence and reclaim his life.',
 'Vijay Kanakamedala', 'ott', 4.2, 159, false),

-- ===================== UPCOMING (40) =====================

('Daaku Maharaaj',
 'https://image.tmdb.org/t/p/w500/rGW9ad5TERuoluGSkgF1wHXP45H.jpg',
 'https://image.tmdb.org/t/p/w1280/fWLfoaen7tv3mUT65KWHg7zCFYn.jpg',
 '2026-03-28', NULL, ARRAY['Action','Comedy'], NULL,
 NULL,
 'A lovable outlaw with a heart of gold navigates the wild terrain of rural Telangana, outsmarting both bandits and authorities with his quick wit.',
 'Bobby Kolli', 'upcoming', 0, 0, false),

('Thandel',
 'https://image.tmdb.org/t/p/w500/uaMcu3I9l3qyYovya7dwUcdU6ve.jpg',
 'https://image.tmdb.org/t/p/w1280/8mCApaSTpIj3y1LnHpBqzdy9rEW.jpg',
 '2026-06-07', NULL, ARRAY['Action','Drama'], NULL,
 NULL,
 'Based on true events, fishermen from Srikakulam venture into dangerous waters near the Indo-Pakistan maritime border and must fight for survival.',
 'Chandoo Mondeti', 'upcoming', 0, 0, false),

('Kubera',
 'https://image.tmdb.org/t/p/w500/xjLC5DeA4FQTBv4xe8r3wYqh8lu.jpg',
 'https://image.tmdb.org/t/p/w1280/nbyTX77u3qELm9DYPgYfva7vAwj.jpg',
 '2026-08-15', NULL, ARRAY['Drama','Thriller'], NULL,
 NULL,
 'A gripping tale of wealth, obsession, and moral reckoning as a man''s pursuit of fortune leads him down a dark and irreversible path.',
 'Sekhar Kammula', 'upcoming', 0, 0, false),

('HIT: The Third Case',
 'https://image.tmdb.org/t/p/w500/wT9tGyFol4RBwkjESXUWeBdnLJn.jpg',
 'https://image.tmdb.org/t/p/w1280/xzpXvyetmrdR3NSRN9uy0xO3lR1.jpg',
 '2026-09-09', NULL, ARRAY['Crime','Thriller'], NULL,
 NULL,
 'The Homicide Intervention Team faces its most baffling case yet — a series of connected disappearances that unravel a conspiracy spanning decades.',
 'Sailesh Kolanu', 'upcoming', 0, 0, false),

('Spirit',
 'https://picsum.photos/seed/ae4cccea87/500/750',
 'https://picsum.photos/seed/ae4cccea87bg/1280/720',
 '2026-07-25', NULL, ARRAY['Action','Thriller'], NULL,
 NULL,
 'A cop with nothing left to lose goes on a one-man mission against an untouchable drug lord, fueled by a personal tragedy and relentless determination.',
 'Sandeep Reddy Vanga', 'upcoming', 0, 0, false),

('NTR 31',
 'https://picsum.photos/seed/6a72f20d1b/500/750',
 'https://picsum.photos/seed/6a72f20d1bbg/1280/720',
 '2026-10-02', NULL, ARRAY['Action','Drama'], NULL,
 NULL,
 'A larger-than-life action drama featuring India''s biggest star in a role that pushes the boundaries of Telugu cinema.',
 'Prashanth Neel', 'upcoming', 0, 0, false),

('RC 16',
 'https://picsum.photos/seed/c1c8d1fc04/500/750',
 'https://picsum.photos/seed/c1c8d1fc04bg/1280/720',
 '2026-11-14', NULL, ARRAY['Action','Adventure'], NULL,
 NULL,
 'A global adventure spanning continents, featuring jaw-dropping action sequences and a story of redemption and discovery.',
 'Buchi Babu Sana', 'upcoming', 0, 0, false),

('SSMB 29',
 'https://picsum.photos/seed/fd8b1a1d02/500/750',
 'https://picsum.photos/seed/fd8b1a1d02bg/1280/720',
 '2027-01-14', NULL, ARRAY['Action','Drama'], NULL,
 NULL,
 'The megastar returns in an epic saga that combines mass elements with a deeply emotional core, promising to redefine Telugu cinema.',
 'SS Rajamouli', 'upcoming', 0, 0, false),

('Devara: Part 2',
 'https://picsum.photos/seed/e7fe5d2207/500/750',
 'https://picsum.photos/seed/e7fe5d2207bg/1280/720',
 '2026-12-25', NULL, ARRAY['Action','Thriller'], NULL,
 NULL,
 'The epic saga concludes as Vara must face the demons of his father''s past and forge his own destiny against impossible odds.',
 'Koratala Siva', 'upcoming', 0, 0, false),

('Pushpa 3: The Rampage',
 'https://picsum.photos/seed/7e9ec2c417/500/750',
 'https://picsum.photos/seed/7e9ec2c417bg/1280/720',
 '2027-05-01', NULL, ARRAY['Action','Drama','Crime'], NULL,
 NULL,
 'Pushpa Raj faces his ultimate test as enemies from all sides converge to end his reign, in the explosive finale of the smuggling saga.',
 'Sukumar', 'upcoming', 0, 0, false),

('Kalki Part 2',
 'https://picsum.photos/seed/a75073f5e6/500/750',
 'https://picsum.photos/seed/a75073f5e6bg/1280/720',
 '2027-06-27', NULL, ARRAY['Sci-Fi','Action','Fantasy'], NULL,
 NULL,
 'The epic conclusion to the Kalki saga as Bhairava fulfills the ancient prophecy in a battle that will determine the fate of the universe.',
 'Nag Ashwin', 'upcoming', 0, 0, false),

('Toxic',
 'https://picsum.photos/seed/2e8bc6bdf3/500/750',
 'https://picsum.photos/seed/2e8bc6bdf3bg/1280/720',
 '2026-04-10', NULL, ARRAY['Action','Thriller','Crime'], NULL,
 NULL,
 'A dark and gritty underworld saga set in the shadowy nightlife of Goa, where loyalty is poison and betrayal is currency.',
 'Geetu Mohandas', 'upcoming', 0, 0, false),

('Akhil 7',
 'https://picsum.photos/seed/c7eb657872/500/750',
 'https://picsum.photos/seed/c7eb657872bg/1280/720',
 '2026-05-15', NULL, ARRAY['Action','Comedy'], NULL,
 NULL,
 'A charming agent must balance his dual life of espionage and family, leading to a series of comedic yet dangerous situations.',
 'Surender Reddy', 'upcoming', 0, 0, false),

('VD 12',
 'https://picsum.photos/seed/7959c1e899/500/750',
 'https://picsum.photos/seed/7959c1e899bg/1280/720',
 '2026-06-26', NULL, ARRAY['Romance','Drama','Action'], NULL,
 NULL,
 'A passionate love story set against the backdrop of a political uprising, where two lovers must choose between their hearts and their duty.',
 'Gowtam Tinnanuri', 'upcoming', 0, 0, false),

('Sharwa 35',
 'https://picsum.photos/seed/0acdc57b3b/500/750',
 'https://picsum.photos/seed/0acdc57b3bbg/1280/720',
 '2026-08-07', NULL, ARRAY['Comedy','Thriller'], NULL,
 NULL,
 'A quirky kidnapping story goes hilariously wrong when the victim turns out to be smarter and more dangerous than the kidnappers.',
 'Kishore Tirumala', 'upcoming', 0, 0, false),

('Ravi Teja 75',
 'https://picsum.photos/seed/6b41943b91/500/750',
 'https://picsum.photos/seed/6b41943b91bg/1280/720',
 '2026-09-18', NULL, ARRAY['Action','Comedy'], NULL,
 NULL,
 'A veteran cop nearing retirement gets assigned one last impossible case that puts his legendary skills and famous humor to the ultimate test.',
 'Trinadha Rao Nakkina', 'upcoming', 0, 0, false),

('Nithiin Next',
 'https://picsum.photos/seed/d4dc097f1f/500/750',
 'https://picsum.photos/seed/d4dc097f1fbg/1280/720',
 '2026-10-30', NULL, ARRAY['Romance','Action'], NULL,
 NULL,
 'A cross-border love story unfolds as a man travels to a foreign country to win back the love of his life against her family''s wishes.',
 'Venky Kudumula', 'upcoming', 0, 0, false),

('Pan India Project X',
 'https://picsum.photos/seed/20d1530040/500/750',
 'https://picsum.photos/seed/20d1530040bg/1280/720',
 '2027-03-15', NULL, ARRAY['Action','Fantasy','Adventure'], NULL,
 NULL,
 'India''s most ambitious multi-lingual epic brings together heroes from different eras in a time-bending adventure to save the fabric of reality.',
 'SS Rajamouli', 'upcoming', 0, 0, false),

('Varun Tej Fighter',
 'https://picsum.photos/seed/46a9ef317d/500/750',
 'https://picsum.photos/seed/46a9ef317dbg/1280/720',
 '2026-11-27', NULL, ARRAY['Action','Drama'], NULL,
 NULL,
 'A retired MMA fighter is drawn back into the ring when his gym and community are threatened by a corporate takeover.',
 'Anil Ravipudi', 'upcoming', 0, 0, false),

('Nagarjuna Untitled Spy Thriller',
 'https://picsum.photos/seed/912488fd14/500/750',
 'https://picsum.photos/seed/912488fd14bg/1280/720',
 '2027-02-14', NULL, ARRAY['Thriller','Action'], NULL,
 NULL,
 'A veteran intelligence officer comes out of retirement for a classified mission that could prevent a nuclear catastrophe on Indian soil.',
 'Praveen Sattaru', 'upcoming', 0, 0, false),

('Balakrishna 109',
 'https://picsum.photos/seed/258f3c7244/500/750',
 'https://picsum.photos/seed/258f3c7244bg/1280/720',
 '2027-01-26', NULL, ARRAY['Action','Historical'], NULL,
 NULL,
 'An epic period drama set during India''s freedom struggle, featuring a legendary freedom fighter whose story was nearly erased from history.',
 'Boyapati Srinu', 'upcoming', 0, 0, false),

('Chiranjeevi 155',
 'https://picsum.photos/seed/8bdc0f7c9f/500/750',
 'https://picsum.photos/seed/8bdc0f7c9fbg/1280/720',
 '2027-04-14', NULL, ARRAY['Action','Drama','Family'], NULL,
 NULL,
 'A father-son saga spanning two timelines explores themes of sacrifice, legacy, and the unbreakable bond between generations.',
 'Bobby Kolli', 'upcoming', 0, 0, false),

('Adivi Sesh Project K',
 'https://picsum.photos/seed/dabf5a03a4/500/750',
 'https://picsum.photos/seed/dabf5a03a4bg/1280/720',
 '2026-07-04', NULL, ARRAY['Thriller','Action'], NULL,
 NULL,
 'A special forces operative infiltrates a terrorist cell in a race against time to prevent a catastrophic attack on Indian soil.',
 'Sudheer Varma', 'upcoming', 0, 0, false),

('Samantha Citadel India',
 'https://picsum.photos/seed/f601fd93f1/500/750',
 'https://picsum.photos/seed/f601fd93f1bg/1280/720',
 '2026-09-05', NULL, ARRAY['Action','Thriller','Sci-Fi'], NULL,
 NULL,
 'A spy with a buried past must confront a powerful syndicate in this high-octane action thriller set across multiple Indian cities.',
 'Raj & DK', 'upcoming', 0, 0, false),

('Pooja Hegde Rom-Com',
 'https://picsum.photos/seed/2c212da492/500/750',
 'https://picsum.photos/seed/2c212da492bg/1280/720',
 '2026-12-05', NULL, ARRAY['Romance','Comedy'], NULL,
 NULL,
 'A quirky wedding planner who doesn''t believe in love finds herself falling for the last person she expected — her rival.',
 'Parasuram Petla', 'upcoming', 0, 0, false),

('Keerthy Suresh Biopic',
 'https://picsum.photos/seed/cf3d377e34/500/750',
 'https://picsum.photos/seed/cf3d377e34bg/1280/720',
 '2027-03-08', NULL, ARRAY['Drama','Historical'], NULL,
 NULL,
 'The inspiring true story of a pioneering Indian woman scientist who overcame societal barriers to make groundbreaking contributions to space research.',
 'Nandini Reddy', 'upcoming', 0, 0, false),

('Sai Pallavi Village Drama',
 'https://picsum.photos/seed/f651557333/500/750',
 'https://picsum.photos/seed/f651557333bg/1280/720',
 '2026-08-15', NULL, ARRAY['Drama','Family'], NULL,
 NULL,
 'A young doctor returns to her rural village to set up a clinic, confronting deep-rooted social issues while reconnecting with her roots.',
 'Sekhar Kammula', 'upcoming', 0, 0, false),

('Rana Fantasy Epic',
 'https://picsum.photos/seed/c1616cddf1/500/750',
 'https://picsum.photos/seed/c1616cddf1bg/1280/720',
 '2027-05-23', NULL, ARRAY['Fantasy','Action','Adventure'], NULL,
 NULL,
 'A mythological warrior is reborn in the modern era to fulfill an ancient prophecy, wielding divine weapons against primordial evil.',
 'Prasanth Varma', 'upcoming', 0, 0, false),

('Nithin Romantic Musical',
 'https://picsum.photos/seed/799cb12e55/500/750',
 'https://picsum.photos/seed/799cb12e55bg/1280/720',
 '2026-12-31', NULL, ARRAY['Romance','Drama'], NULL,
 NULL,
 'A struggling musician falls in love with a classical dancer, and their artistic collaboration leads to both a creative masterpiece and a passionate romance.',
 'Merlapaka Gandhi', 'upcoming', 0, 0, false),

('Mega Family Film',
 'https://picsum.photos/seed/32552a0a80/500/750',
 'https://picsum.photos/seed/32552a0a80bg/1280/720',
 '2027-04-01', NULL, ARRAY['Comedy','Family','Drama'], NULL,
 NULL,
 'A large Telugu joint family gathers for a golden wedding anniversary, and long-buried family secrets come tumbling out in hilarious fashion.',
 'Anil Ravipudi', 'upcoming', 0, 0, false),

('Sreeleela Dance Film',
 'https://picsum.photos/seed/aafc7e86ed/500/750',
 'https://picsum.photos/seed/aafc7e86edbg/1280/720',
 '2026-10-16', NULL, ARRAY['Drama','Romance'], NULL,
 NULL,
 'A gifted street dancer gets a once-in-a-lifetime chance to compete at a global dance championship, but the path to glory is paved with sacrifice.',
 'Chandoo Mondeti', 'upcoming', 0, 0, false),

('Anushka Horror',
 'https://picsum.photos/seed/3d9d2bcfc7/500/750',
 'https://picsum.photos/seed/3d9d2bcfc7bg/1280/720',
 '2027-07-11', NULL, ARRAY['Horror','Thriller'], NULL,
 NULL,
 'A paranormal researcher investigating haunted heritage buildings in Hyderabad unleashes an ancient evil that has been dormant for centuries.',
 'Ashwin Saravanan', 'upcoming', 0, 0, false),

('Tamannaah Spy Thriller',
 'https://picsum.photos/seed/77f5b362e9/500/750',
 'https://picsum.photos/seed/77f5b362e9bg/1280/720',
 '2026-11-13', NULL, ARRAY['Thriller','Action'], NULL,
 NULL,
 'A covert agent embedded in a criminal organization must complete her mission before her cover is blown in this intense spy thriller.',
 'Praveen Sattaru', 'upcoming', 0, 0, false),

('Kajal Comedy',
 'https://picsum.photos/seed/1bbdbd9983/500/750',
 'https://picsum.photos/seed/1bbdbd9983bg/1280/720',
 '2027-02-05', NULL, ARRAY['Comedy','Romance'], NULL,
 NULL,
 'A woman accidentally swaps phones with a stranger, and their hilarious text conversations lead to an unexpected connection and a series of misadventures.',
 'Vamshi Paidipally', 'upcoming', 0, 0, false),

('Nithya Menen Literary Adaptation',
 'https://picsum.photos/seed/84e890b6e9/500/750',
 'https://picsum.photos/seed/84e890b6e9bg/1280/720',
 '2027-06-13', NULL, ARRAY['Drama'], NULL,
 NULL,
 'Based on a celebrated Telugu novel, this intimate drama follows a woman''s journey of self-discovery across three decades of independent India.',
 'Nandini Reddy', 'upcoming', 0, 0, false),

('Jyothika Social Drama',
 'https://picsum.photos/seed/c5a2ff4414/500/750',
 'https://picsum.photos/seed/c5a2ff4414bg/1280/720',
 '2027-08-20', NULL, ARRAY['Drama','Political'], NULL,
 NULL,
 'A school teacher takes on the local political establishment after discovering systemic corruption affecting her students'' futures.',
 'Sudha Kongara', 'upcoming', 0, 0, false),

('Mrunal Thakur Debut Telugu',
 'https://picsum.photos/seed/cdafc85a60/500/750',
 'https://picsum.photos/seed/cdafc85a60bg/1280/720',
 '2026-06-14', NULL, ARRAY['Romance','Drama'], NULL,
 NULL,
 'A cross-cultural love story unfolds when a Mumbai journalist is assigned to cover the vibrant Bonalu festival in Hyderabad and falls for a local.',
 'Hanu Raghavapudi', 'upcoming', 0, 0, false),

('Siddharth Sci-Fi',
 'https://picsum.photos/seed/dfcd68005f/500/750',
 'https://picsum.photos/seed/dfcd68005fbg/1280/720',
 '2027-09-17', NULL, ARRAY['Sci-Fi','Thriller'], NULL,
 NULL,
 'A brilliant scientist accidentally opens a portal to a parallel universe where he must confront an alternate version of himself who has turned evil.',
 'Karthik Subbaraj', 'upcoming', 0, 0, false),

('VD Jungle Adventure',
 'https://picsum.photos/seed/19945b5615/500/750',
 'https://picsum.photos/seed/19945b5615bg/1280/720',
 '2027-10-08', NULL, ARRAY['Adventure','Action','Comedy'], NULL,
 NULL,
 'A group of friends on a bachelor trip to a remote forest discover an ancient treasure map, but they''re not the only ones hunting for the gold.',
 'Puri Jagannadh', 'upcoming', 0, 0, false),

('Mega Power Hero Film',
 'https://picsum.photos/seed/6954844cf6/500/750',
 'https://picsum.photos/seed/6954844cf6bg/1280/720',
 '2027-11-12', NULL, ARRAY['Action','Thriller','Drama'], NULL,
 NULL,
 'An undercover agent must infiltrate a terrorist cell operating in the heart of Hyderabad, in a race against time to prevent catastrophe.',
 'Surender Reddy', 'upcoming', 0, 0, false)

ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Actors (30 Telugu stars)
-- -----------------------------------------------------------------------------
INSERT INTO actors (name, photo_url) VALUES
  ('Allu Arjun',            'https://image.tmdb.org/t/p/w500/wHr3bKhYpiDiYVMZLZqebeauEVw.jpg'),
  ('Prabhas',               'https://image.tmdb.org/t/p/w500/u6RVP8ukgLaymeoi5VmX0JRAcCn.jpg'),
  ('Jr NTR',                'https://image.tmdb.org/t/p/w500/5ycQgZ3SPUa12bq0yn1jpToBq9X.jpg'),
  ('Ram Charan',            'https://image.tmdb.org/t/p/w500/twGqYUCR0Yh33j3TcgRTZRBRhTd.jpg'),
  ('Mahesh Babu',           'https://image.tmdb.org/t/p/w500/fcxgYi1h6vywacUg8asM6S0IIhf.jpg'),
  ('Nani',                  'https://image.tmdb.org/t/p/w500/csRjrh58D90LhFNiqNEUTohzoIK.jpg'),
  ('Vijay Deverakonda',     'https://image.tmdb.org/t/p/w500/8oVIWyIoFUal8SJFnmCUtkkm1HP.jpg'),
  ('Ravi Teja',             'https://image.tmdb.org/t/p/w500/5a9g645O30Qzhe3VFjvkhjnNfm2.jpg'),
  ('Samantha Ruth Prabhu',  'https://image.tmdb.org/t/p/w500/2tQHkYrMZrED9Bp7p5dyDs4toDS.jpg'),
  ('Rashmika Mandanna',     'https://image.tmdb.org/t/p/w500/c1wQq0OAzU9nFhGYn4iOoi7dmqD.jpg'),
  ('Chiranjeevi',           'https://i.pravatar.cc/500?u=97534ea4c4'),
  ('Nagarjuna',             'https://i.pravatar.cc/500?u=c7de1376d1'),
  ('Venkatesh',             'https://i.pravatar.cc/500?u=2d13968b2a'),
  ('Balakrishna',           'https://i.pravatar.cc/500?u=8517d846d6'),
  ('Siddharth',             'https://i.pravatar.cc/500?u=9976913e69'),
  ('Nithin',                'https://i.pravatar.cc/500?u=42c2e95139'),
  ('Rana Daggubati',        'https://i.pravatar.cc/500?u=c7df7ff8e0'),
  ('Varun Tej',             'https://i.pravatar.cc/500?u=b09bb7cd1d'),
  ('Sharwanand',            'https://i.pravatar.cc/500?u=4a4587b3c0'),
  ('Adivi Sesh',            'https://i.pravatar.cc/500?u=463d1b3a48'),
  ('Pooja Hegde',           'https://i.pravatar.cc/500?u=8ecdbff644'),
  ('Anushka Shetty',        'https://i.pravatar.cc/500?u=675e019761'),
  ('Keerthy Suresh',        'https://i.pravatar.cc/500?u=6087ad8411'),
  ('Sai Pallavi',           'https://i.pravatar.cc/500?u=5aac276740'),
  ('Mrunal Thakur',         'https://i.pravatar.cc/500?u=e2c6fcae43'),
  ('Sreeleela',             'https://i.pravatar.cc/500?u=f4f7afc24a'),
  ('Kajal Aggarwal',        'https://i.pravatar.cc/500?u=311ede5b97'),
  ('Tamannaah Bhatia',      'https://i.pravatar.cc/500?u=ff1e2632fb'),
  ('Nithya Menen',          'https://i.pravatar.cc/500?u=d48aba5101'),
  ('Jyothika',              'https://i.pravatar.cc/500?u=f1bdb31f1f')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Movie Cast (~120 entries linking actors to movies)
-- -----------------------------------------------------------------------------

-- === THEATRICAL CAST ===

-- Pushpa 2: Allu Arjun, Rashmika Mandanna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Pushpa Raj', 1
FROM movies m, actors a WHERE m.title = 'Pushpa 2: The Rule' AND a.name = 'Allu Arjun' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Srivalli', 2
FROM movies m, actors a WHERE m.title = 'Pushpa 2: The Rule' AND a.name = 'Rashmika Mandanna' ON CONFLICT DO NOTHING;

-- Devara: Jr NTR, Sai Pallavi, Jyothika
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Devara/Vara', 1
FROM movies m, actors a WHERE m.title = 'Devara: Part 1' AND a.name = 'Jr NTR' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Thangam', 2
FROM movies m, actors a WHERE m.title = 'Devara: Part 1' AND a.name = 'Sai Pallavi' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bhaira''s Mother', 3
FROM movies m, actors a WHERE m.title = 'Devara: Part 1' AND a.name = 'Jyothika' ON CONFLICT DO NOTHING;

-- Game Changer: Ram Charan, Sreeleela, Anjali
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Ram Nandan', 1
FROM movies m, actors a WHERE m.title = 'Game Changer' AND a.name = 'Ram Charan' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Deepika', 2
FROM movies m, actors a WHERE m.title = 'Game Changer' AND a.name = 'Sreeleela' ON CONFLICT DO NOTHING;

-- Sankranthiki Vasthunnam: Venkatesh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Himself', 1
FROM movies m, actors a WHERE m.title = 'Sankranthiki Vasthunnam' AND a.name = 'Venkatesh' ON CONFLICT DO NOTHING;

-- Waltair Veerayya: Chiranjeevi, Ravi Teja, Sreeleela
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Waltair Veerayya', 1
FROM movies m, actors a WHERE m.title = 'Waltair Veerayya' AND a.name = 'Chiranjeevi' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'ACP Vikram', 2
FROM movies m, actors a WHERE m.title = 'Waltair Veerayya' AND a.name = 'Ravi Teja' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Deepika', 3
FROM movies m, actors a WHERE m.title = 'Waltair Veerayya' AND a.name = 'Sreeleela' ON CONFLICT DO NOTHING;

-- Guntur Kaaram: Mahesh Babu, Sreeleela
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Ramana', 1
FROM movies m, actors a WHERE m.title = 'Guntur Kaaram' AND a.name = 'Mahesh Babu' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Pooja', 2
FROM movies m, actors a WHERE m.title = 'Guntur Kaaram' AND a.name = 'Sreeleela' ON CONFLICT DO NOTHING;

-- Tillu Square: Siddharth, Anushka Shetty
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Tillu', 1
FROM movies m, actors a WHERE m.title = 'Tillu Square' AND a.name = 'Siddharth' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Radhika', 2
FROM movies m, actors a WHERE m.title = 'Tillu Square' AND a.name = 'Anushka Shetty' ON CONFLICT DO NOTHING;

-- Bholaa Shankar: Chiranjeevi, Tamannaah Bhatia
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bholaa Shankar', 1
FROM movies m, actors a WHERE m.title = 'Bholaa Shankar' AND a.name = 'Chiranjeevi' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lakshmi', 2
FROM movies m, actors a WHERE m.title = 'Bholaa Shankar' AND a.name = 'Tamannaah Bhatia' ON CONFLICT DO NOTHING;

-- Bhagavanth Kesari: Balakrishna, Sreeleela
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bhagavanth Kesari', 1
FROM movies m, actors a WHERE m.title = 'Bhagavanth Kesari' AND a.name = 'Balakrishna' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Kavya', 2
FROM movies m, actors a WHERE m.title = 'Bhagavanth Kesari' AND a.name = 'Sreeleela' ON CONFLICT DO NOTHING;

-- Hi Nanna: Nani, Mrunal Thakur
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Viraj', 1
FROM movies m, actors a WHERE m.title = 'Hi Nanna' AND a.name = 'Nani' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Mahi', 2
FROM movies m, actors a WHERE m.title = 'Hi Nanna' AND a.name = 'Mrunal Thakur' ON CONFLICT DO NOTHING;

-- Salaar: Prabhas
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Deva', 1
FROM movies m, actors a WHERE m.title = 'Salaar: Part 1' AND a.name = 'Prabhas' ON CONFLICT DO NOTHING;

-- Hanu Man: no major star from our list
-- Saripodhaa Sanivaaram: Nani, Sai Pallavi
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Surya', 1
FROM movies m, actors a WHERE m.title = 'Saripodhaa Sanivaaram' AND a.name = 'Nani' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Charulatha', 2
FROM movies m, actors a WHERE m.title = 'Saripodhaa Sanivaaram' AND a.name = 'Sai Pallavi' ON CONFLICT DO NOTHING;

-- Skanda: Ram Charan (cameo)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Skanda', 1
FROM movies m, actors a WHERE m.title = 'Skanda' AND a.name = 'Ram Charan' ON CONFLICT DO NOTHING;

-- Virupaksha: Keerthy Suresh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Nandini', 2
FROM movies m, actors a WHERE m.title = 'Virupaksha' AND a.name = 'Keerthy Suresh' ON CONFLICT DO NOTHING;

-- Veera Simha Reddy: Balakrishna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Veera Simha Reddy', 1
FROM movies m, actors a WHERE m.title = 'Veera Simha Reddy' AND a.name = 'Balakrishna' ON CONFLICT DO NOTHING;

-- Balagam: no major star from our list

-- Agent: Mahesh Babu (cameo concept)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Chief', 3
FROM movies m, actors a WHERE m.title = 'Agent' AND a.name = 'Mahesh Babu' ON CONFLICT DO NOTHING;

-- Akhanda 2: Balakrishna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Akhanda', 1
FROM movies m, actors a WHERE m.title = 'Akhanda 2' AND a.name = 'Balakrishna' ON CONFLICT DO NOTHING;

-- The Raja Saab: Prabhas, Pooja Hegde
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Raja', 1
FROM movies m, actors a WHERE m.title = 'The Raja Saab' AND a.name = 'Prabhas' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Nisha', 2
FROM movies m, actors a WHERE m.title = 'The Raja Saab' AND a.name = 'Pooja Hegde' ON CONFLICT DO NOTHING;

-- OG: Nagarjuna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'OG', 1
FROM movies m, actors a WHERE m.title = 'OG' AND a.name = 'Nagarjuna' ON CONFLICT DO NOTHING;

-- Naa Saami Ranga: Nagarjuna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Ranga', 1
FROM movies m, actors a WHERE m.title = 'Naa Saami Ranga' AND a.name = 'Nagarjuna' ON CONFLICT DO NOTHING;

-- Miss Shetty Mr Polishetty: Anushka Shetty
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Miss Shetty', 1
FROM movies m, actors a WHERE m.title = 'Miss Shetty Mr Polishetty' AND a.name = 'Anushka Shetty' ON CONFLICT DO NOTHING;

-- Mahanati 2: Keerthy Suresh, Nithya Menen
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Savitri', 1
FROM movies m, actors a WHERE m.title = 'Mahanati 2: The Queen Returns' AND a.name = 'Keerthy Suresh' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Supporting Role', 3
FROM movies m, actors a WHERE m.title = 'Mahanati 2: The Queen Returns' AND a.name = 'Nithya Menen' ON CONFLICT DO NOTHING;

-- Double iSmart: Ram Charan (concept)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'iSmart Shankar', 1
FROM movies m, actors a WHERE m.title = 'Double iSmart' AND a.name = 'Ram Charan' ON CONFLICT DO NOTHING;

-- Pelli Pusthakam: Nithin, Keerthy Suresh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Arjun', 1
FROM movies m, actors a WHERE m.title = 'Pelli Pusthakam' AND a.name = 'Nithin' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Priya', 2
FROM movies m, actors a WHERE m.title = 'Pelli Pusthakam' AND a.name = 'Keerthy Suresh' ON CONFLICT DO NOTHING;

-- Power Star: Ravi Teja
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Power Star', 1
FROM movies m, actors a WHERE m.title = 'Power Star' AND a.name = 'Ravi Teja' ON CONFLICT DO NOTHING;

-- Dhoom Dhaam: Venkatesh, Varun Tej
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Suresh', 1
FROM movies m, actors a WHERE m.title = 'Dhoom Dhaam' AND a.name = 'Venkatesh' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Arjun', 2
FROM movies m, actors a WHERE m.title = 'Dhoom Dhaam' AND a.name = 'Varun Tej' ON CONFLICT DO NOTHING;

-- === OTT CAST ===

-- Kalki 2898 AD: Prabhas, Nani (cameo)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bhairava', 1
FROM movies m, actors a WHERE m.title = 'Kalki 2898 AD' AND a.name = 'Prabhas' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Special Appearance', 5
FROM movies m, actors a WHERE m.title = 'Kalki 2898 AD' AND a.name = 'Nani' ON CONFLICT DO NOTHING;

-- Lucky Baskhar: Nani
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Baskhar', 1
FROM movies m, actors a WHERE m.title = 'Lucky Baskhar' AND a.name = 'Nani' ON CONFLICT DO NOTHING;

-- Robinhood: Ravi Teja
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Robinhood', 1
FROM movies m, actors a WHERE m.title = 'Robinhood' AND a.name = 'Ravi Teja' ON CONFLICT DO NOTHING;

-- Kushi: Vijay Deverakonda, Samantha
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Viplav', 1
FROM movies m, actors a WHERE m.title = 'Kushi' AND a.name = 'Vijay Deverakonda' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Aradhya', 2
FROM movies m, actors a WHERE m.title = 'Kushi' AND a.name = 'Samantha Ruth Prabhu' ON CONFLICT DO NOTHING;

-- Ante Sundaraniki: Nani, Nazriya
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Sundar', 1
FROM movies m, actors a WHERE m.title = 'Ante Sundaraniki' AND a.name = 'Nani' ON CONFLICT DO NOTHING;

-- Dasara: Nani, Keerthy Suresh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Dharani', 1
FROM movies m, actors a WHERE m.title = 'Dasara' AND a.name = 'Nani' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Vennela', 2
FROM movies m, actors a WHERE m.title = 'Dasara' AND a.name = 'Keerthy Suresh' ON CONFLICT DO NOTHING;

-- Yashoda: Samantha
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Yashoda', 1
FROM movies m, actors a WHERE m.title = 'Yashoda' AND a.name = 'Samantha Ruth Prabhu' ON CONFLICT DO NOTHING;

-- Shaakuntalam: Samantha
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Shakuntala', 1
FROM movies m, actors a WHERE m.title = 'Shaakuntalam' AND a.name = 'Samantha Ruth Prabhu' ON CONFLICT DO NOTHING;

-- Bimbisara: Nani (cameo concept)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bimbisara', 1
FROM movies m, actors a WHERE m.title = 'Bimbisara (Director''s Cut)' AND a.name = 'Nani' ON CONFLICT DO NOTHING;

-- Mathu Vadalara 2: Nagarjuna (cameo)
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Cameo', 4
FROM movies m, actors a WHERE m.title = 'Mathu Vadalara 2' AND a.name = 'Nagarjuna' ON CONFLICT DO NOTHING;

-- Satyabhama: Kajal Aggarwal
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Satyabhama', 1
FROM movies m, actors a WHERE m.title = 'Satyabhama' AND a.name = 'Kajal Aggarwal' ON CONFLICT DO NOTHING;

-- Mr. Bachchan: Ravi Teja, Pooja Hegde
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bachchan', 1
FROM movies m, actors a WHERE m.title = 'Mr. Bachchan' AND a.name = 'Ravi Teja' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Meera', 2
FROM movies m, actors a WHERE m.title = 'Mr. Bachchan' AND a.name = 'Pooja Hegde' ON CONFLICT DO NOTHING;

-- Family Star: Vijay Deverakonda, Mrunal Thakur
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Govardhan', 1
FROM movies m, actors a WHERE m.title = 'Family Star' AND a.name = 'Vijay Deverakonda' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Indu', 2
FROM movies m, actors a WHERE m.title = 'Family Star' AND a.name = 'Mrunal Thakur' ON CONFLICT DO NOTHING;

-- Swag: Siddharth, Tamannaah Bhatia
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Rahul', 1
FROM movies m, actors a WHERE m.title = 'Swag' AND a.name = 'Siddharth' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Meghana', 2
FROM movies m, actors a WHERE m.title = 'Swag' AND a.name = 'Tamannaah Bhatia' ON CONFLICT DO NOTHING;

-- Raayan: Rana Daggubati
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Raayan', 1
FROM movies m, actors a WHERE m.title = 'Raayan (Telugu)' AND a.name = 'Rana Daggubati' ON CONFLICT DO NOTHING;

-- Annapurna Photo Studio: Sharwanand, Nithya Menen
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Anand', 1
FROM movies m, actors a WHERE m.title = 'Annapurna Photo Studio' AND a.name = 'Sharwanand' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Radha', 2
FROM movies m, actors a WHERE m.title = 'Annapurna Photo Studio' AND a.name = 'Nithya Menen' ON CONFLICT DO NOTHING;

-- Ustaad: Varun Tej
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Ustaad', 1
FROM movies m, actors a WHERE m.title = 'Ustaad' AND a.name = 'Varun Tej' ON CONFLICT DO NOTHING;

-- Naandhi: Adivi Sesh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Surya Prakash', 1
FROM movies m, actors a WHERE m.title = 'Naandhi' AND a.name = 'Adivi Sesh' ON CONFLICT DO NOTHING;

-- Lucky Lakshman: Sharwanand
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lakshman', 1
FROM movies m, actors a WHERE m.title = 'Lucky Lakshman' AND a.name = 'Sharwanand' ON CONFLICT DO NOTHING;

-- Sardar 2: Nagarjuna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Sardar', 1
FROM movies m, actors a WHERE m.title = 'Sardar 2 (Telugu)' AND a.name = 'Nagarjuna' ON CONFLICT DO NOTHING;

-- === UPCOMING CAST ===

-- Daaku Maharaaj: Nani
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Daaku', 1
FROM movies m, actors a WHERE m.title = 'Daaku Maharaaj' AND a.name = 'Nani' ON CONFLICT DO NOTHING;

-- Spirit: Prabhas
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'ACP Vikram', 1
FROM movies m, actors a WHERE m.title = 'Spirit' AND a.name = 'Prabhas' ON CONFLICT DO NOTHING;

-- NTR 31: Jr NTR
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'NTR 31' AND a.name = 'Jr NTR' ON CONFLICT DO NOTHING;

-- RC 16: Ram Charan, Jyothika
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'RC 16' AND a.name = 'Ram Charan' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead Heroine', 2
FROM movies m, actors a WHERE m.title = 'RC 16' AND a.name = 'Jyothika' ON CONFLICT DO NOTHING;

-- SSMB 29: Mahesh Babu
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'SSMB 29' AND a.name = 'Mahesh Babu' ON CONFLICT DO NOTHING;

-- Devara Part 2: Jr NTR
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Vara', 1
FROM movies m, actors a WHERE m.title = 'Devara: Part 2' AND a.name = 'Jr NTR' ON CONFLICT DO NOTHING;

-- Pushpa 3: Allu Arjun, Rashmika Mandanna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Pushpa Raj', 1
FROM movies m, actors a WHERE m.title = 'Pushpa 3: The Rampage' AND a.name = 'Allu Arjun' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Srivalli', 2
FROM movies m, actors a WHERE m.title = 'Pushpa 3: The Rampage' AND a.name = 'Rashmika Mandanna' ON CONFLICT DO NOTHING;

-- Kalki Part 2: Prabhas
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Bhairava', 1
FROM movies m, actors a WHERE m.title = 'Kalki Part 2' AND a.name = 'Prabhas' ON CONFLICT DO NOTHING;

-- VD 12: Vijay Deverakonda, Rashmika Mandanna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'VD 12' AND a.name = 'Vijay Deverakonda' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead Heroine', 2
FROM movies m, actors a WHERE m.title = 'VD 12' AND a.name = 'Rashmika Mandanna' ON CONFLICT DO NOTHING;

-- Sharwa 35: Sharwanand
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Sharwa 35' AND a.name = 'Sharwanand' ON CONFLICT DO NOTHING;

-- Ravi Teja 75: Ravi Teja
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Ravi Teja 75' AND a.name = 'Ravi Teja' ON CONFLICT DO NOTHING;

-- Nithiin Next: Nithin, Sreeleela
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Nithiin Next' AND a.name = 'Nithin' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead Heroine', 2
FROM movies m, actors a WHERE m.title = 'Nithiin Next' AND a.name = 'Sreeleela' ON CONFLICT DO NOTHING;

-- Varun Tej Fighter: Varun Tej
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Varun Tej Fighter' AND a.name = 'Varun Tej' ON CONFLICT DO NOTHING;

-- Balakrishna 109: Balakrishna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Balakrishna 109' AND a.name = 'Balakrishna' ON CONFLICT DO NOTHING;

-- Chiranjeevi 155: Chiranjeevi
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Chiranjeevi 155' AND a.name = 'Chiranjeevi' ON CONFLICT DO NOTHING;

-- Adivi Sesh Project K: Adivi Sesh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Major', 1
FROM movies m, actors a WHERE m.title = 'Adivi Sesh Project K' AND a.name = 'Adivi Sesh' ON CONFLICT DO NOTHING;

-- Samantha Citadel India: Samantha
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Samantha Citadel India' AND a.name = 'Samantha Ruth Prabhu' ON CONFLICT DO NOTHING;

-- Pooja Hegde Rom-Com: Pooja Hegde, Nithin
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead Heroine', 1
FROM movies m, actors a WHERE m.title = 'Pooja Hegde Rom-Com' AND a.name = 'Pooja Hegde' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead Hero', 2
FROM movies m, actors a WHERE m.title = 'Pooja Hegde Rom-Com' AND a.name = 'Nithin' ON CONFLICT DO NOTHING;

-- Keerthy Suresh Biopic: Keerthy Suresh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Dr. Lakshmi', 1
FROM movies m, actors a WHERE m.title = 'Keerthy Suresh Biopic' AND a.name = 'Keerthy Suresh' ON CONFLICT DO NOTHING;

-- Sai Pallavi Village Drama: Sai Pallavi
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Dr. Priya', 1
FROM movies m, actors a WHERE m.title = 'Sai Pallavi Village Drama' AND a.name = 'Sai Pallavi' ON CONFLICT DO NOTHING;

-- Rana Fantasy Epic: Rana Daggubati
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Warrior', 1
FROM movies m, actors a WHERE m.title = 'Rana Fantasy Epic' AND a.name = 'Rana Daggubati' ON CONFLICT DO NOTHING;

-- Sreeleela Dance Film: Sreeleela
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Meera', 1
FROM movies m, actors a WHERE m.title = 'Sreeleela Dance Film' AND a.name = 'Sreeleela' ON CONFLICT DO NOTHING;

-- Anushka Horror: Anushka Shetty
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Professor', 1
FROM movies m, actors a WHERE m.title = 'Anushka Horror' AND a.name = 'Anushka Shetty' ON CONFLICT DO NOTHING;

-- Tamannaah Spy Thriller: Tamannaah Bhatia
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Agent Nisha', 1
FROM movies m, actors a WHERE m.title = 'Tamannaah Spy Thriller' AND a.name = 'Tamannaah Bhatia' ON CONFLICT DO NOTHING;

-- Kajal Comedy: Kajal Aggarwal
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Priya', 1
FROM movies m, actors a WHERE m.title = 'Kajal Comedy' AND a.name = 'Kajal Aggarwal' ON CONFLICT DO NOTHING;

-- Nithya Menen Literary Adaptation: Nithya Menen
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Amrutha', 1
FROM movies m, actors a WHERE m.title = 'Nithya Menen Literary Adaptation' AND a.name = 'Nithya Menen' ON CONFLICT DO NOTHING;

-- Jyothika Social Drama: Jyothika
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Shanti', 1
FROM movies m, actors a WHERE m.title = 'Jyothika Social Drama' AND a.name = 'Jyothika' ON CONFLICT DO NOTHING;

-- Mrunal Thakur Debut Telugu: Mrunal Thakur, Vijay Deverakonda
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Anjali', 1
FROM movies m, actors a WHERE m.title = 'Mrunal Thakur Debut Telugu' AND a.name = 'Mrunal Thakur' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Vamsi', 2
FROM movies m, actors a WHERE m.title = 'Mrunal Thakur Debut Telugu' AND a.name = 'Vijay Deverakonda' ON CONFLICT DO NOTHING;

-- Siddharth Sci-Fi: Siddharth
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Dr. Arjun', 1
FROM movies m, actors a WHERE m.title = 'Siddharth Sci-Fi' AND a.name = 'Siddharth' ON CONFLICT DO NOTHING;

-- Thandel: Nani, Sai Pallavi
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Fisherman', 1
FROM movies m, actors a WHERE m.title = 'Thandel' AND a.name = 'Nani' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Priya', 2
FROM movies m, actors a WHERE m.title = 'Thandel' AND a.name = 'Sai Pallavi' ON CONFLICT DO NOTHING;

-- Kubera: Nagarjuna, Pooja Hegde
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Kubera', 1
FROM movies m, actors a WHERE m.title = 'Kubera' AND a.name = 'Nagarjuna' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Priya', 2
FROM movies m, actors a WHERE m.title = 'Kubera' AND a.name = 'Pooja Hegde' ON CONFLICT DO NOTHING;

-- HIT 3: Adivi Sesh
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Vishwak', 1
FROM movies m, actors a WHERE m.title = 'HIT: The Third Case' AND a.name = 'Adivi Sesh' ON CONFLICT DO NOTHING;

-- Toxic: Vijay Deverakonda
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'Toxic' AND a.name = 'Vijay Deverakonda' ON CONFLICT DO NOTHING;

-- Pan India Project X: Mahesh Babu, Ram Charan
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead 1', 1
FROM movies m, actors a WHERE m.title = 'Pan India Project X' AND a.name = 'Mahesh Babu' ON CONFLICT DO NOTHING;
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead 2', 2
FROM movies m, actors a WHERE m.title = 'Pan India Project X' AND a.name = 'Ram Charan' ON CONFLICT DO NOTHING;

-- Nagarjuna Spy Thriller: Nagarjuna
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Colonel Raju', 1
FROM movies m, actors a WHERE m.title = 'Nagarjuna Untitled Spy Thriller' AND a.name = 'Nagarjuna' ON CONFLICT DO NOTHING;

-- Mega Power Hero Film: Varun Tej
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Agent', 1
FROM movies m, actors a WHERE m.title = 'Mega Power Hero Film' AND a.name = 'Varun Tej' ON CONFLICT DO NOTHING;

-- VD Jungle Adventure: Vijay Deverakonda
INSERT INTO movie_cast (id, movie_id, actor_id, role_name, display_order)
SELECT gen_random_uuid(), m.id, a.id, 'Lead', 1
FROM movies m, actors a WHERE m.title = 'VD Jungle Adventure' AND a.name = 'Vijay Deverakonda' ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Movie-Platform assignments (OTT availability — ~60 links)
-- -----------------------------------------------------------------------------

-- Kalki 2898 AD → Netflix, Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Kalki 2898 AD' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Kalki 2898 AD' ON CONFLICT DO NOTHING;

-- Lucky Baskhar → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Lucky Baskhar' ON CONFLICT DO NOTHING;

-- Robinhood → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Robinhood' ON CONFLICT DO NOTHING;

-- Hari Hara Veera Mallu → Aha, Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Hari Hara Veera Mallu' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Hari Hara Veera Mallu' ON CONFLICT DO NOTHING;

-- Kushi → Netflix, Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Kushi' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Kushi' ON CONFLICT DO NOTHING;

-- Ante Sundaraniki → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Ante Sundaraniki' ON CONFLICT DO NOTHING;

-- Jailer → Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Jailer (Telugu)' ON CONFLICT DO NOTHING;

-- Dasara → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Dasara' ON CONFLICT DO NOTHING;

-- Adipurush → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Adipurush (Telugu)' ON CONFLICT DO NOTHING;

-- Baby → Hotstar
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'hotstar' FROM movies m WHERE m.title = 'Baby' ON CONFLICT DO NOTHING;

-- Custody → Hotstar
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'hotstar' FROM movies m WHERE m.title = 'Custody' ON CONFLICT DO NOTHING;

-- Pareshan → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Pareshan' ON CONFLICT DO NOTHING;

-- Ori Devuda → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Ori Devuda' ON CONFLICT DO NOTHING;

-- Aakasam Nee Haddura → Netflix, Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Aakasam Nee Haddura (Re-release)' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Aakasam Nee Haddura (Re-release)' ON CONFLICT DO NOTHING;

-- Maestro → Hotstar
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'hotstar' FROM movies m WHERE m.title = 'Maestro' ON CONFLICT DO NOTHING;

-- Masooda → ZEE5
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'zee5' FROM movies m WHERE m.title = 'Masooda' ON CONFLICT DO NOTHING;

-- Yashoda → Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Yashoda' ON CONFLICT DO NOTHING;

-- Shaakuntalam → Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Shaakuntalam' ON CONFLICT DO NOTHING;

-- Bimbisara → ZEE5, Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'zee5' FROM movies m WHERE m.title = 'Bimbisara (Director''s Cut)' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Bimbisara (Director''s Cut)' ON CONFLICT DO NOTHING;

-- Committee Kurrollu → ETV Win
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'etvwin' FROM movies m WHERE m.title = 'Committee Kurrollu' ON CONFLICT DO NOTHING;

-- Mathu Vadalara 2 → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Mathu Vadalara 2' ON CONFLICT DO NOTHING;

-- Malli Pelli → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Malli Pelli' ON CONFLICT DO NOTHING;

-- 35 Chinna Katha Kaadu → SonyLIV
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'sonyliv' FROM movies m WHERE m.title = '35 – Chinna Katha Kaadu' ON CONFLICT DO NOTHING;

-- MAD → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'MAD' ON CONFLICT DO NOTHING;

-- Satyabhama → Hotstar
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'hotstar' FROM movies m WHERE m.title = 'Satyabhama' ON CONFLICT DO NOTHING;

-- Nenu Student Sir → ETV Win
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'etvwin' FROM movies m WHERE m.title = 'Nenu Student Sir' ON CONFLICT DO NOTHING;

-- Mr. Bachchan → Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Mr. Bachchan' ON CONFLICT DO NOTHING;

-- Razakar → ZEE5
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'zee5' FROM movies m WHERE m.title = 'Razakar: The Silent Genocide' ON CONFLICT DO NOTHING;

-- Family Star → Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Family Star' ON CONFLICT DO NOTHING;

-- Gaami → Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Gaami' ON CONFLICT DO NOTHING;

-- Aa Okkati Adakku → Sun NXT
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'sunnxt' FROM movies m WHERE m.title = 'Aa Okkati Adakku' ON CONFLICT DO NOTHING;

-- Swag → Hotstar
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'hotstar' FROM movies m WHERE m.title = 'Swag' ON CONFLICT DO NOTHING;

-- Lucky Lakshman → Aha, Sun NXT
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Lucky Lakshman' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'sunnxt' FROM movies m WHERE m.title = 'Lucky Lakshman' ON CONFLICT DO NOTHING;

-- Sardar 2 → Amazon Prime
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Sardar 2 (Telugu)' ON CONFLICT DO NOTHING;

-- Raayan → Amazon Prime, Sun NXT
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'prime' FROM movies m WHERE m.title = 'Raayan (Telugu)' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'sunnxt' FROM movies m WHERE m.title = 'Raayan (Telugu)' ON CONFLICT DO NOTHING;

-- Bhaje Vaayu Vegam → ZEE5
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'zee5' FROM movies m WHERE m.title = 'Bhaje Vaayu Vegam' ON CONFLICT DO NOTHING;

-- Annapurna Photo Studio → SonyLIV
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'sonyliv' FROM movies m WHERE m.title = 'Annapurna Photo Studio' ON CONFLICT DO NOTHING;

-- Ustaad → ETV Win, Aha
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'etvwin' FROM movies m WHERE m.title = 'Ustaad' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Ustaad' ON CONFLICT DO NOTHING;

-- Naandhi → Aha, Netflix
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'aha' FROM movies m WHERE m.title = 'Naandhi' ON CONFLICT DO NOTHING;
INSERT INTO movie_platforms (movie_id, platform_id)
SELECT m.id, 'netflix' FROM movies m WHERE m.title = 'Naandhi' ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Surprise Content (20 curated YouTube videos)
-- -----------------------------------------------------------------------------
INSERT INTO surprise_content (title, description, youtube_id, category, duration, views) VALUES
  ('Pushpa 2 - Pushpa Pushpa Song',
   'The chartbusting mass anthem from Pushpa 2: The Rule featuring Allu Arjun.',
   'example1', 'song', '4:32', 45000000),

  ('Kalki 2898 AD - Behind the Scenes',
   'An exclusive behind-the-scenes look at the making of India''s most ambitious sci-fi epic.',
   'example2', 'bts', '12:45', 8500000),

  ('NTR Interview - Devara',
   'Jr NTR opens up about his dual role in Devara and working with Koratala Siva.',
   'example3', 'interview', '18:30', 3200000),

  ('Ram Charan Short Film',
   'A powerful short film featuring Ram Charan that showcases his range beyond commercial cinema.',
   'example4', 'short-film', '22:15', 1500000),

  ('Game Changer Official Trailer',
   'The official theatrical trailer of Game Changer starring Ram Charan and directed by Shankar.',
   'example5', 'trailer', '3:15', 67000000),

  ('Nani Behind the Scenes - Lucky Baskhar',
   'Nani shares his preparation process and the creative journey behind Lucky Baskhar.',
   'example6', 'bts', '8:45', 2100000),

  ('Pushpa 2 - Angaaron Song',
   'The electrifying mass dance number from Pushpa 2 that set dance floors on fire across India.',
   'example7', 'song', '3:48', 38000000),

  ('Mahesh Babu - SSMB 29 First Look Reaction',
   'The internet explodes as the first look of SSMB 29 directed by SS Rajamouli is revealed.',
   'example8', 'trailer', '2:30', 52000000),

  ('Prabhas - Kalki Making Video',
   'An in-depth making video showing the groundbreaking VFX work behind Kalki 2898 AD.',
   'example9', 'bts', '15:20', 12000000),

  ('Vijay Deverakonda Rapid Fire Interview',
   'Vijay Deverakonda answers fan questions in a hilarious rapid fire round about his upcoming films.',
   'example10', 'interview', '10:15', 4500000),

  ('Samantha Ruth Prabhu - Citadel India Teaser',
   'The explosive first teaser of Samantha in the Indian adaptation of Citadel.',
   'example11', 'trailer', '1:45', 28000000),

  ('Sai Pallavi Dance Compilation',
   'A mesmerizing compilation of Sai Pallavi''s best dance sequences across her Telugu films.',
   'example12', 'song', '6:30', 15000000),

  ('Chiranjeevi - 45 Years in Cinema Tribute',
   'A fan-made tribute celebrating Megastar Chiranjeevi''s 45 glorious years in Telugu cinema.',
   'example13', 'short-film', '12:00', 6800000),

  ('Adivi Sesh - Major Making Documentary',
   'The complete making-of documentary showing how Major was brought to life with authentic detail.',
   'example14', 'bts', '25:00', 3800000),

  ('Rashmika Mandanna Interview - Pushpa Journey',
   'Rashmika Mandanna reflects on her journey as Srivalli and what Pushpa means to her career.',
   'example15', 'interview', '14:20', 5200000),

  ('Nagarjuna - The King Short Film',
   'A powerful short film featuring Nagarjuna exploring themes of aging, legacy, and fatherhood.',
   'example16', 'short-film', '18:45', 2400000),

  ('Devara Official Trailer',
   'The jaw-dropping official trailer of Devara: Part 1 featuring Jr NTR in a never-before-seen avatar.',
   'example17', 'trailer', '3:02', 72000000),

  ('Keerthy Suresh Interview - Mahanati Memories',
   'Keerthy Suresh revisits her National Award-winning performance and shares untold Mahanati stories.',
   'example18', 'interview', '20:10', 3100000),

  ('Oo Antava - Pushpa Remix',
   'The viral remix of the iconic Oo Antava song that became a global dance sensation.',
   'example19', 'song', '4:15', 95000000),

  ('HIT Universe - Complete Timeline Explained',
   'A fan-created breakdown of the entire HIT cinematic universe connecting all three films.',
   'example20', 'short-film', '16:30', 4200000)

ON CONFLICT DO NOTHING;

-- =============================================================================
-- Seed complete.
-- 120 movies | 30 actors | ~120 cast links | ~60 platform links | 20 surprise
-- =============================================================================
