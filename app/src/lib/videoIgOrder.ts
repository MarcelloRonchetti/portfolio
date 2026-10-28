// Visual order of the videos, transcribed from the reels walkthrough Marcello
// recorded on 2026-10-29 (screencast 00-16-24) — newest first.
//
// VIDEO_PINNED is sticky: it stays FIRST no matter what (it's the reel he
// pins on his profile), even when new uploads arrive. A video not in the
// list ranks right after the pinned one (new uploads surface there, newest
// first) and before the rest of the list. Keys are the display titles
// produced by cleanTitle() — if a file is renamed on Drive its title changes
// and it falls in the "new" tier until this list is updated.
export const VIDEO_PINNED = 'Maserati GT2'

export const VIDEO_IG_ORDER: readonly string[] = [
  'BMW Diba F36',
  'Bizzarrini 5300 GT Corsa',
  'Ferrari F430',
  'Audi Sport',
  'Mclaren 720S',
  'Lotus Elises V4',
  'Lotus Elise S',
  'Ferrari',
  'Porsche Carrera Black V',
  'Blackpantherferrari',
  'Toyota GR86',
  'BMW M4 Comp',
  'Toyota GR86 Lilla',
  'Toyota Red',
  'Ferrasrmercedes 190E',
  'Velside VCF',
  'Alfa Romeo Giulia',
  'Ferrari No Monster',
  // Not walked in the screencast (older reels) — reorder freely.
  '2Old Ferrari V3',
  'The Green Beast V3',
  'The Green Beast V1',
  'Vintage',
  'Volkswagen Type 2 T1',
  'Vac',
  'Ferrari 8',
  'Bellissima',
  'Porsche 911 ST V3',
  'Porsche 911 ST',
  'E36 Drift',
  'Toyota G86',
  'Gym Street V2',
  'Gym Powerlifting V2',
  'Cintura WF V2',
  'WF Parallele',
]
