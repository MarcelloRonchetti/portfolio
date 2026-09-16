// Portfolio data — Marcello Ronchetti, fotografo di sport e motorsport.

export type Route =
  | 'cover'
  | 'gallery'
  | 'story'
  | 'contact'

export const DATA = {
  identity: {
    name: 'Marcello Ronchetti',
    role: 'Fotografo — Sport & Motorsport',
    location: 'Modena, Italia',
    email: 'ronchettimarcello@gmail.com',
    instagram: { handle: '@marc.roads', url: 'https://www.instagram.com/marc.roads/' },
    tiktok: { handle: '@marc.roads', url: 'https://www.tiktok.com/@marc.roads' },
  },

  gallery: {
    title: 'Galleria',
    intro: 'Raccolte da circuiti, eventi e viaggi.',
  },
}
