import type { CommitteeMember } from './committee'

// Explicit presentation names for the current council. Unknown names remain intact;
// names are not safely shortened by dropping words across naming traditions.
const displayNames: Record<string, string> = {
  'Muhammad Shafi Ilham Bin Kamaruddin': 'Ilham Kamaruddin',
  'Sri Afiqah Aliah Binti Saiful Azlan': 'Sri Afiqah Aliah',
  'Isaac David Poh Young Jie': 'Isaac Poh',
  'Nurul Iffah Binti Izwandy': 'Nurul Iffah',
  'Kuan Ren Tan': 'Kuan Ren Tan',
  'Shen Yang Ng': 'Shen Yang Ng',
  'Iman Amani Binti Azmi': 'Iman Amani',
  'Dexter Lee Chu Xuan': 'Dexter Lee',
  'Nur Qashrina Maisarah Binti Zuhaidin': 'Qashrina Maisarah',
  'Muhammad Ameer Nazreen': 'Ameer Nazreen',
  'Murfiqah Binti Musthafa': 'Murfiqah Musthafa',
  'Nur Ariana Binti Faizalhary': 'Nur Ariana',
  'Tan Ye Jing': 'Tan Ye Jing',
  'Amber Ong Sze Qi': 'Amber Ong',
  'Aireen Hana Binti Kamarul Irliza': 'Aireen Hana',
  'Syed Ahmad Fahmi Bin Syed Nizam': 'Syed Fahmi',
  'Jin Hong Pang': 'Jin Hong Pang',
  'Raihanah Husna Binti Shahidan': 'Raihanah Husna',
  'Yap Brandon Hui Hong': 'Brandon Yap',
  'Nur Alya Najma Binti Mohd Zuhar': 'Alya Najma',
  'Ken Vachira Angsana': 'Ken Vachira',
  'Muhammad Imranrazin Bin Imizan': 'Imranrazin Imizan',
  'Nur Aryssa Binti Marzuki': 'Nur Aryssa',
  'Nadya Binti Khalid': 'Nadya Khalid',
  'Nur Adlina Fatisya Binti Ahmad Fadzli': 'Adlina Fatisya',
  'Koay Zhan Er': 'Koay Zhan Er',
  'Angelina Alexander': 'Angelina Alexander',
  'Delaila Binti Abdul Razak': 'Delaila Abdul Razak',
  'Puteri Nurin Aisya Binti Ainul Hasni': 'Puteri Nurin Aisya',
  'Khadijah Binti Ahmad Ariff': 'Khadijah Ahmad Ariff',
}

export function getCommitteeDisplayName(member: Pick<CommitteeMember, 'name'>) {
  const name = member.name.trim().replace(/\s+/g, ' ')
  return displayNames[name] || name
}

export function getCommitteeInitials(member: Pick<CommitteeMember, 'name'>) {
  const words = getCommitteeDisplayName(member).split(/\s+/).filter(Boolean)
  return [words[0], words.length > 1 ? words[words.length - 1] : '']
    .map(word => Array.from(word || '')[0] || '').join('').toLocaleUpperCase() || 'M'
}

export function isCommitteePlaceholder(src?: string) {
  if (!src) return true
  try {
    const path = new URL(src, 'https://www.masca.org.au').pathname
    return /(?:^|\/)(?:committee-placeholder\.(?:png|svg|webp)|placeholder\.svg)$/i.test(path)
  } catch { return false }
}
