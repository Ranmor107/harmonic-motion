import type { NormalizedScore } from '../domain/score'
import { parseMidi } from '../midi/parser'
import preludeUrl from './assets/bach-prelude-bwv846.mid?url'
import inventionUrl from './assets/bach-invention-bwv772.mid?url'
import canonUrl from './assets/pachelbel-canon.mid?url'
import rondoUrl from './assets/mozart-rondo-alla-turca.mid?url'
import eliseUrl from './assets/beethoven-fur-elise.mid?url'

export interface BuiltinScore {
  id: string
  filename: string
  score: NormalizedScore
}

const publicDomain = { label: 'Public Domain', url: 'https://www.mutopiaproject.org/legal.html' }

export const BUILTIN_SCORES = [
  { id: 'builtin-bach-prelude', filename: 'bach-prelude-bwv846.mid', title: '巴赫 · C大调前奏曲 BWV846',
    url: preludeUrl, credit: 'Tobias Erbsland', sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=5', license: publicDomain },
  { id: 'builtin-bach-invention', filename: 'bach-invention-bwv772.mid', title: '巴赫 · 二部创意曲第一号 BWV772',
    url: inventionUrl, credit: 'jeff covey', sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=40',
    license: { label: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' } },
  { id: 'builtin-pachelbel-canon', filename: 'pachelbel-canon.mid', title: '帕赫贝尔 · D大调卡农',
    url: canonUrl, credit: 'Michael Fischer v. Mollard', sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2047',
    license: { label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' } },
  { id: 'builtin-mozart-rondo', filename: 'mozart-rondo-alla-turca.mid', title: '莫扎特 · 土耳其进行曲 KV331',
    url: rondoUrl, credit: 'Rune Zedeler and Chris Sawer', sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=108', license: publicDomain },
  { id: 'builtin-beethoven-elise', filename: 'beethoven-fur-elise.mid', title: '贝多芬 · 致爱丽丝 WoO59',
    url: eliseUrl, credit: 'Stelios Samelis', sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931', license: publicDomain },
] as const

export function isBuiltinSessionId(id: string) {
  return BUILTIN_SCORES.some(entry => entry.id === id)
}

export async function loadBuiltinScores(): Promise<BuiltinScore[]> {
  return Promise.all(BUILTIN_SCORES.map(async entry => {
    const response = await fetch(entry.url)
    if (!response.ok) throw new Error(`Could not load ${entry.title}.`)
    const parsed = parseMidi(await response.arrayBuffer(), entry.filename)
    return { id: entry.id, filename: entry.filename,
      score: { ...parsed, metadata: { ...parsed.metadata, title: entry.title } } }
  }))
}
