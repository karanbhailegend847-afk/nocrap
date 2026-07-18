const ROAST_ADJECTIVES = [
  'Limp', 'Flaccid', 'Chronic', 'Relapsed', 'Gooning', 'Brainrotted', 'WeakWilled', 
  'Clueless', 'Overstimulated', 'Crusty', 'Sweaty', 'Pixelated', 'Shameless', 
  'SleepDeprived', 'Simping', 'Unemployed', 'BasementDwelling', 'SoftDick', 
  'WankTired', 'ErectileBroken', 'DopamineSlut', 'InstantGratification', 'CoomerBrain',
  'NoSelfControl', 'SpankHappy', 'LotionAddict', 'NoStreak', 'Limbless', 'RelapseProne'
];

const ROAST_NOUNS = [
  'Coomer', 'Wanker', 'Gooner', 'Spanker', 'DopamineJunkie', 'ScreenSlut', 
  'CouchPotato', 'StreakResetter', 'Disappointment', 'Failure', 'Softie', 
  'Jerkoff', 'Fapstronaut', 'TissueWaster', 'LotionHoarder', 'NoStreakAndy', 
  'DopamineCoomer', 'Masturbator', 'InternetZombie', 'LotionSponge', 'GloveWanker',
  'SockStainer', 'BasementTroll'
];

export function generateRoastUsername() {
  const adj = ROAST_ADJECTIVES[Math.floor(Math.random() * ROAST_ADJECTIVES.length)];
  const noun = ROAST_NOUNS[Math.floor(Math.random() * ROAST_NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900); // 3 digit number
  return `${adj}${noun}${num}`;
}
