export const SPACE_OBJECTS = {
  Sun: {
    id: 'Sun',
    type: 'star',
    name: 'Sun',
    shortDescription:
      'A glowing G-type star powering the entire system with light and energy.',
    lore:
      'The Sun contains over 99% of the solar system\'s mass and drives planetary climates through its radiation.',
    aliases: ['sun', 'sol'],
  },
  Mercury: {
    id: 'Mercury',
    type: 'planet',
    name: 'Mercury',
    shortDescription:
      'The smallest world, rocky and fast, with a rugged cratered surface.',
    lore:
      'Mercury has extreme day-night temperature swings because it has almost no atmosphere to trap heat.',
    aliases: ['mercury'],
  },
  Venus: {
    id: 'Venus',
    type: 'planet',
    name: 'Venus',
    shortDescription:
      'A dense, cloud-wrapped planet glowing in warm amber tones.',
    lore:
      'Venus rotates very slowly and in the opposite direction of most planets, producing a dramatic sky cycle.',
    aliases: ['venus'],
  },
  Earth: {
    id: 'Earth',
    type: 'planet',
    name: 'Earth',
    shortDescription:
      'An ocean-rich blue world with dynamic clouds and vibrant atmospheric glow.',
    lore:
      'Earth is currently the only known planet to host complex life and stable surface oceans.',
    aliases: ['earth', 'terra', 'home'],
  },
  Moon: {
    id: 'Moon',
    type: 'moon',
    name: 'Moon',
    shortDescription:
      'Earth\'s natural satellite with bright highlands and dark maria plains.',
    lore:
      'The Moon helps stabilize Earth\'s axial tilt and influences tides through gravitational pull.',
    aliases: ['moon', 'luna'],
  },
  Mars: {
    id: 'Mars',
    type: 'planet',
    name: 'Mars',
    shortDescription:
      'A red desert planet with giant volcanoes and deep canyon systems.',
    lore:
      'Mars hosts Olympus Mons, the tallest known volcano in the solar system.',
    aliases: ['mars', 'red planet'],
  },
  Jupiter: {
    id: 'Jupiter',
    type: 'planet',
    name: 'Jupiter',
    shortDescription:
      'A massive gas giant with broad storm bands and dynamic cloud belts.',
    lore:
      'Jupiter\'s Great Red Spot is a long-lived storm system larger than Earth.',
    aliases: ['jupiter'],
  },
  Saturn: {
    id: 'Saturn',
    type: 'planet',
    name: 'Saturn',
    shortDescription:
      'A ringed giant with elegant layered clouds and bright icy bands.',
    lore:
      'Saturn\'s rings are mostly water ice particles ranging from tiny grains to larger chunks.',
    aliases: ['saturn'],
  },
  Uranus: {
    id: 'Uranus',
    type: 'planet',
    name: 'Uranus',
    shortDescription:
      'An icy cyan giant rotating on an unusually tilted axis.',
    lore:
      'Uranus is tilted so far that its seasons are extreme and last for decades.',
    aliases: ['uranus'],
  },
  Neptune: {
    id: 'Neptune',
    type: 'planet',
    name: 'Neptune',
    shortDescription:
      'A deep-blue ice giant with fast winds and dynamic weather systems.',
    lore:
      'Neptune has some of the strongest sustained winds measured in the solar system.',
    aliases: ['neptune'],
  },
  Voyager: {
    id: 'Voyager',
    type: 'spacecraft',
    name: 'Voyager Probe',
    shortDescription:
      'An explorer craft model used here as a guided-travel reference point.',
    lore:
      'The real Voyager missions expanded humanity\'s understanding of outer planets and interstellar space.',
    aliases: ['voyager', 'probe', 'spacecraft', 'ship'],
  },
}

export const PLANET_IDS = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]

export const TOUR_SEQUENCE = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]

export function getObjectKnowledge(objectId) {
  return objectId ? SPACE_OBJECTS[objectId] || null : null
}

export function resolveObjectFromText(rawText) {
  const normalized = (rawText || '').toLowerCase()
  if (!normalized) {
    return null
  }

  return (
    Object.values(SPACE_OBJECTS).find((objectEntry) =>
      objectEntry.aliases.some((alias) => normalized.includes(alias.toLowerCase())),
    ) || null
  )
}
