import type { ModelName } from './Assets';
import { MISSIONS, completedInTier, isMissionLocked } from './Missions';

// Story text for Knights of Tomar (see v5/Knights_of_Tomar_Story_and_Implementation.md), kept
// apart from the game logic. The game has no save system, so "once only" means once per session.

// One screen of the story panel: a title and one or two short paragraphs.
export interface StoryPage {
  title: string;
  lines: string[];
}

// Shown the first time the player enters any map of a row (index 0 = tier 1, maps A B C).
export const TIER_INTROS: StoryPage[] = [
  {
    title: 'The First Signs',
    lines: ['The Order\'s visions grow restless. Even the familiar lands around Tomar no longer feel safe.'],
  },
  {
    title: 'The Restless Dead',
    lines: ['The darkness reaches the old Templar lands. Forgotten soldiers rise, and the dead refuse to rest.'],
  },
  {
    title: 'The Name in the Storm',
    lines: ['The corruption has reached the coast. Amid the wrecks and gathering storms, one name returns: Adamastor.'],
  },
  {
    title: 'The Last Warning',
    lines: ['The sea rages and the sky darkens. Adamastor has awakened; the visions are becoming real.'],
  },
];

export const CAPITAO = 'Capitão da Ordem';

// The Capitão's story lines, in story order. Each is said once, the next time the player talks to
// him after it becomes available.
const CAPTAIN_LINES: { id: string; available: () => boolean; lines: string[] }[] = [
  {
    id: 'first',
    available: () => true,
    lines: [
      '"Our brothers have seen Portugal in ruins. Something is stirring beyond Tomar."',
      '"Go, investigate these disturbances, and return with what you learn."',
    ],
  },
  {
    id: 'afterTier1',
    available: () => completedInTier(1) > 0,
    lines: [
      '"These creatures should not roam so close to Tomar."',
      '"Search the old Templar lands. We must learn how far the darkness has spread."',
    ],
  },
  {
    id: 'afterTier2',
    available: () => completedInTier(2) > 0,
    lines: [
      '"Even the knights of Trancoso cannot rest. This is no ordinary haunting."',
      '"Follow the disturbances toward the coast. The answer may lie there."',
    ],
  },
  {
    // After the Tier 3 introduction has revealed the name.
    id: 'name',
    available: () => storyState.seenTierIntros.includes(2),
    lines: [
      '"Adamastor. The name belongs to an ancient terror of the sea."',
      '"Keep moving. We cannot allow the visions to become our fate."',
    ],
  },
  {
    // Once the Adamastor mission is unlocked.
    id: 'final',
    available: () => !isMissionLocked(MISSIONS.find((mission) => mission.name === 'Adamastor')!),
    lines: [
      '"The darkness is no longer approaching. It is here."',
      '"Whatever awaits you at the end, Portugal depends on your courage."',
    ],
  },
];

// Short text before and after each boss fight, by mission name.
export const BOSS_STORY: Record<string, { title: string; encounter: string; victory?: string }> = {
  'The Captain of Cabo da Roca': {
    title: 'Capitão do Cabo da Roca',
    encounter: 'The ghostly captain still claims these waters.',
    victory: 'The captain falls. For a moment, the waves grow quiet.',
  },
  'The Mapinguari': {
    title: 'Mapinguari',
    encounter: 'A beast from beyond the familiar world bars your path.',
    victory: 'The beast is defeated. The darkness ahead remains unexplained.',
  },
  // Adamastor's victory is the ending.
  'Adamastor': {
    title: 'Adamastor',
    encounter: 'The giant has awakened. The prophecy can no longer be prevented—only survived.',
  },
};

export const ENDING: StoryPage[] = [
  {
    title: 'Victory',
    lines: [
      'Adamastor falls. The storm begins to break, and the darkness retreats from the shore.',
      'Portugal survives. But the ruined land, the silent villages, and the restless dead remain.',
    ],
  },
  {
    title: 'End of Story',
    lines: ['The darkness has passed. Its scars remain.'],
  },
];

export interface LoreEntry {
  title: string;
  text: string;
}

// Readable inscriptions on props, per row of maps. The n-th prop of that model in the row gets the
// n-th entry, and it can be read on every map of the row. Tier 1 has none.
export const LORE: Partial<Record<ModelName, LoreEntry[]>>[] = [
  {},
  {
    lantern_standing: [
      { title: 'Pilgrim\'s Mark', text: 'Keep the light to your left. The lower passage does not lead home.' },
      { title: 'The Old Road', text: 'If you hear marching after sundown, leave the road to the dead.' },
    ],
  },
  {
    crypt: [
      { title: 'The Drowned Oath', text: 'Here lie those who followed the black sails. The sea returned their bodies, but not their peace.' },
    ],
    gravestone: [
      { title: 'The Forgotten Knight', text: 'He stood his ground when the forest fell silent.' },
      { title: 'No Safe Harbor', text: 'The waves took his ship. The darkness took his rest.' },
    ],
    lantern_standing: [
      { title: 'A Traveler\'s Note', text: 'The air grows colder toward the sea. Do not follow voices in the fog.' },
    ],
  },
  {
    crypt: [
      { title: 'The Last Watch', text: 'We watched the horizon until the horizon vanished. May those who follow turn back.' },
      { title: 'A Knight Without a Name', text: 'He crossed the darkness so that others might see dawn. His name was lost; his oath remains.' },
    ],
    shrine_candles: [
      { title: 'A Prayer Against the Storm', text: 'Let this flame endure where the sun cannot. Guide the living through the night.' },
      { title: 'For Those at Sea', text: 'For the lost, a light. For the living, a way home.' },
    ],
    gravestone: [
      { title: 'The Final Warning', text: 'We mistook the first storm for the worst.' },
      { title: 'Here Fell a Brother', text: 'His sword broke. His oath did not.' },
    ],
    post_skull: [
      { title: 'Edge of the Storm', text: 'Beyond this point, even the wind speaks in warnings.' },
      { title: 'The Captain\'s Claim', text: 'All who land here belong to the tide.' },
      { title: 'No Return', text: 'Those who crossed this line did not come back.' },
    ],
  },
];

// What the player has already seen this session.
export const storyState = {
  // Rows (0 = tier 1) whose introduction was dismissed.
  seenTierIntros: [] as number[],
  saidCaptainLines: [] as string[],
};

// The Capitão's next story page, or null if he has nothing new to say. If several lines became
// available since the last talk, only the latest is said (the earlier ones are skipped).
export function takeCaptainLine(): StoryPage | null {
  const available = CAPTAIN_LINES.filter(
    (line) => line.available() && !storyState.saidCaptainLines.includes(line.id),
  );
  if (available.length === 0) {
    return null;
  }
  for (const line of available) {
    storyState.saidCaptainLines.push(line.id);
  }
  return { title: CAPITAO, lines: available[available.length - 1].lines };
}
