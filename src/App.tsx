import { Fragment, useEffect, useRef, useState, createContext, useContext } from 'react'

// --- Theme context ---
const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} })
const useTheme = () => useContext(ThemeCtx)

// Helper: value differs by theme
function tv(dark: string, light: string) {
  return (isDark: boolean) => (isDark ? dark : light)
}

type Surah = {
  id: number
  name: string
  nameLatin: string
  verses: number
  meaning: string
  revelation: string
}

type QuranListResponse = {
  status: boolean
  data: Array<{
    number: number
    name: string
    name_arabic?: string
    name_latin: string
    arabic?: string
    arab?: string
    number_of_ayahs: number
    translation: string
    revelation: string
    description: string
    audio_url: string
  }>
}

type DailyAyah = {
  arabic: string
  translation: string
  ref: string
}

type QuranDetailAyah = {
  number?: number
  ayah_number?: number
  arab?: string
  arabic?: string
  text?: string
  translation?: string
  audio_url?: string
}

type QuranDetailData = {
  number: number
  name: string
  name_arabic?: string
  name_latin: string
  arabic?: string
  arab?: string
  number_of_ayahs: number
  translation: string
  revelation: string
  audio_url?: string
  ayahs?: QuranDetailAyah[]
  verses?: QuranDetailAyah[]
  ayat?: QuranDetailAyah[]
}

type QuranDetailResponse = {
  status: boolean
  data: QuranDetailData
  pagination?: {
    current_page?: number
    last_page?: number
    next_page_url?: string | null
    has_more_pages?: boolean
  }
  meta?: {
    current_page?: number
    last_page?: number
  }
}

type DetailVerse = {
  num: number
  arabic: string
  translation: string
}

type QuranJuzAyah = QuranDetailAyah & {
  surah_number?: number
  surah?: Partial<QuranDetailData>
}

type QuranJuzData = {
  number?: number
  juz?: number
  juz_number?: number
  verses_count?: number
  total_ayahs?: number
  ayahs?: QuranJuzAyah[]
  verses?: QuranJuzAyah[]
  ayat?: QuranJuzAyah[]
}

type QuranJuzResponse = {
  status: boolean
  data: QuranJuzData | QuranJuzAyah[]
  pagination?: QuranDetailResponse['pagination']
  meta?: QuranDetailResponse['meta'] & {
    total?: number
    total_ayahs?: number
  }
}

type JuzVerse = DetailVerse & {
  order: number
  surahId: number
  surahName: string
  surahArabic: string
  totalVerses: number
  audioUrl?: string
}

type SurahDetail = {
  surah: Surah
  verses: DetailVerse[]
  audioUrl?: string
}

type JuzDetail = {
  id: number
  verses: JuzVerse[]
  totalVerses: number
}

type CachedSurahDetail = {
  detail: SurahDetail
  page: number
  hasMore: boolean
  cachedAt: string
}

type CachedJuzDetail = {
  detail: JuzDetail
  page: number
  hasMore: boolean
  cachedAt: string
}

type SavedBookmark = {
  id: string
  surahId: number
  surahName: string
  surahArabic: string
  verse: number
  text: string
  translation: string
  savedAt: string
}

type LastRead = {
  surahId: number
  surahName: string
  surahArabic: string
  verse: number
  totalVerses: number
  updatedAt: string
}

type FavoriteSurah = {
  id: number
  name: string
  nameLatin: string
  verses: number
  meaning: string
  revelation: string
  savedAt: string
}

type JuzItem = {
  id: number
  name: string
}

type RandomAyahResponse = {
  status: boolean
  data: {
    arab: string
    translation: string
    ayah_number: number
    surah_number: number
    surah: {
      name?: string
      name_latin: string
    }
  }
}

type PageId = 'home' | 'surahs' | 'juz' | 'bookmarks' | 'settings'

const pages: Array<{ id: PageId; path: string }> = [
  { id: 'home', path: '/' },
  { id: 'surahs', path: '/surah' },
  { id: 'juz', path: '/juz' },
  { id: 'bookmarks', path: '/tersimpan' },
  { id: 'settings', path: '/pengaturan' },
]

const juzList: JuzItem[] = Array.from({ length: 30 }, (_, index) => {
  const number = index + 1

  return {
    id: number,
    name: `Juz ${number}`,
  }
})

const juzVerseCounts: Record<number, number> = {
  1: 148,
  2: 111,
  3: 126,
  4: 131,
  5: 124,
  6: 110,
  7: 149,
  8: 142,
  9: 159,
  10: 127,
  11: 151,
  12: 170,
  13: 154,
  14: 227,
  15: 185,
  16: 269,
  17: 190,
  18: 202,
  19: 339,
  20: 171,
  21: 178,
  22: 169,
  23: 357,
  24: 175,
  25: 246,
  26: 195,
  27: 399,
  28: 137,
  29: 431,
  30: 564,
}

const themeStorageKey = 'holy-quran-theme'
const bookmarksStorageKey = 'holy-quran-bookmarks'
const lastReadStorageKey = 'holy-quran-last-read'
const favoriteSurahsStorageKey = 'holy-quran-favorite-surahs'
const surahDetailCacheStorageKey = 'holy-quran-surah-detail-cache'
const juzDetailCacheStorageKey = 'holy-quran-juz-detail-cache'

function getPageFromPath(pathname: string): PageId {
  if (/^\/surah\/\d+$/.test(pathname)) {
    return 'surahs'
  }

  if (/^\/juz\/\d+$/.test(pathname)) {
    return 'juz'
  }

  return pages.find((page) => page.path === pathname)?.id ?? 'home'
}

function getSurahIdFromPath(pathname: string) {
  const match = pathname.match(/^\/surah\/(\d+)$/)
  return match ? Number(match[1]) : null
}

function getJuzIdFromPath(pathname: string) {
  const match = pathname.match(/^\/juz\/(\d+)$/)
  const juzId = match ? Number(match[1]) : null

  return juzId && juzId >= 1 && juzId <= 30 ? juzId : null
}

function getAyahFromSearch(search: string) {
  const ayah = Number(new URLSearchParams(search).get('ayah'))
  return Number.isFinite(ayah) && ayah > 0 ? ayah : null
}

function getInitialTheme() {
  return window.localStorage.getItem(themeStorageKey) === 'dark'
}

function getSavedBookmarks(): SavedBookmark[] {
  try {
    const value = window.localStorage.getItem(bookmarksStorageKey)
    return value ? JSON.parse(value) as SavedBookmark[] : []
  } catch {
    return []
  }
}

function getLastRead(): LastRead | null {
  try {
    const value = window.localStorage.getItem(lastReadStorageKey)
    return value ? JSON.parse(value) as LastRead : null
  } catch {
    return null
  }
}

function getFavoriteSurahs(): FavoriteSurah[] {
  try {
    const value = window.localStorage.getItem(favoriteSurahsStorageKey)
    return value ? JSON.parse(value) as FavoriteSurah[] : []
  } catch {
    return []
  }
}

function getSurahDetailCache() {
  try {
    const value = window.localStorage.getItem(surahDetailCacheStorageKey)
    return value ? JSON.parse(value) as Record<string, CachedSurahDetail> : {}
  } catch {
    return {}
  }
}

function getJuzDetailCache() {
  try {
    const value = window.localStorage.getItem(juzDetailCacheStorageKey)
    return value ? JSON.parse(value) as Record<string, CachedJuzDetail> : {}
  } catch {
    return {}
  }
}

function getCachedSurahDetail(surahId: number) {
  const cacheKey = String(surahId)
  const cachedDetails = getSurahDetailCache()
  const cachedDetail = cachedDetails[cacheKey] ?? null

  if (!cachedDetail) {
    return null
  }

  if (!hasContiguousVersesFromStart(cachedDetail.detail.verses)) {
    delete cachedDetails[cacheKey]
    window.localStorage.setItem(surahDetailCacheStorageKey, JSON.stringify(cachedDetails))
    return null
  }

  return cachedDetail
}

function getCachedJuzDetail(juzId: number) {
  const cacheKey = String(juzId)
  const cachedDetails = getJuzDetailCache()
  const cachedDetail = cachedDetails[cacheKey] ?? null

  if (!cachedDetail) {
    return null
  }

  if (!hasContiguousJuzVersesFromStart(cachedDetail.detail.verses)) {
    delete cachedDetails[cacheKey]
    window.localStorage.setItem(juzDetailCacheStorageKey, JSON.stringify(cachedDetails))
    return null
  }

  const totalVerses = juzVerseCounts[juzId] || cachedDetail.detail.totalVerses || cachedDetail.detail.verses.length
  const normalizedCache = {
    ...cachedDetail,
    detail: {
      ...cachedDetail.detail,
      totalVerses,
    },
    hasMore: cachedDetail.detail.verses.length < totalVerses,
  }

  if (normalizedCache.hasMore !== cachedDetail.hasMore || normalizedCache.detail.totalVerses !== cachedDetail.detail.totalVerses) {
    cachedDetails[cacheKey] = normalizedCache
    window.localStorage.setItem(juzDetailCacheStorageKey, JSON.stringify(cachedDetails))
  }

  return normalizedCache
}

function saveCachedSurahDetail(surahId: number, cache: Omit<CachedSurahDetail, 'cachedAt'>) {
  const cachedDetails = getSurahDetailCache()

  cachedDetails[String(surahId)] = {
    ...cache,
    cachedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(surahDetailCacheStorageKey, JSON.stringify(cachedDetails))
}

function saveCachedJuzDetail(juzId: number, cache: Omit<CachedJuzDetail, 'cachedAt'>) {
  const cachedDetails = getJuzDetailCache()

  cachedDetails[String(juzId)] = {
    ...cache,
    cachedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(juzDetailCacheStorageKey, JSON.stringify(cachedDetails))
}

function saveFavoriteSurahs(favorites: FavoriteSurah[]) {
  window.localStorage.setItem(favoriteSurahsStorageKey, JSON.stringify(favorites))
}

function saveLastRead(lastRead: LastRead) {
  window.localStorage.setItem(lastReadStorageKey, JSON.stringify(lastRead))
}

function saveBookmarks(bookmarks: SavedBookmark[]) {
  window.localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarks))
}

function getBookmarkId(surahId: number, verse: number) {
  return `${surahId}:${verse}`
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function toArabicNumber(value: number) {
  return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
}

function formatAudioTime(value: number) {
  if (!Number.isFinite(value)) {
    return '0:00'
  }

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function isArabicText(value?: string) {
  return /[\u0600-\u06FF]/.test(value ?? '')
}

function getSurahArabicName(surah: { name: string; name_arabic?: string; arabic?: string; arab?: string }) {
  const candidates = [surah.name, surah.name_arabic, surah.arabic, surah.arab]

  return candidates.find(isArabicText) ?? surah.name
}

function mapDetailSurah(data: QuranDetailData): Surah {
  return {
    id: data.number,
    name: getSurahArabicName(data),
    nameLatin: data.name_latin,
    verses: data.number_of_ayahs,
    meaning: data.translation,
    revelation: data.revelation,
  }
}

function mapDetailVerses(data: QuranDetailData): DetailVerse[] {
  const verses = data.ayahs ?? data.verses ?? data.ayat ?? []

  return verses.map((ayah, index) => ({
    num: ayah.ayah_number ?? ayah.number ?? index + 1,
    arabic: ayah.arab ?? ayah.arabic ?? ayah.text ?? '',
    translation: ayah.translation ?? '',
  }))
}

function getJuzAyahs(data: QuranJuzResponse['data']) {
  if (Array.isArray(data)) {
    return data
  }

  return data.ayahs ?? data.verses ?? data.ayat ?? []
}

function getJuzTotalVerses(response: QuranJuzResponse, ayahCount: number, juzId?: number) {
  const responseJuzId = Array.isArray(response.data)
    ? null
    : response.data.number ?? response.data.juz ?? response.data.juz_number ?? null

  if (juzId && juzVerseCounts[juzId]) {
    return juzVerseCounts[juzId]
  }

  if (responseJuzId && juzVerseCounts[responseJuzId]) {
    return juzVerseCounts[responseJuzId]
  }

  if (Array.isArray(response.data)) {
    return response.meta?.total ?? response.meta?.total_ayahs ?? ayahCount
  }

  return response.data.verses_count ?? response.data.total_ayahs ?? response.meta?.total ?? response.meta?.total_ayahs ?? ayahCount
}

function mapJuzVerses(data: QuranJuzResponse['data'], startOrder: number): JuzVerse[] {
  return getJuzAyahs(data).map((ayah, index) => {
    const surah = ayah.surah
    const surahId = ayah.surah_number ?? surah?.number ?? 0
    const surahName = surah?.name_latin ?? `Surah ${surahId || '-'}`
    const surahArabic = surah ? getSurahArabicName({
      name: surah.name ?? surahName,
      name_arabic: surah.name_arabic,
      arabic: surah.arabic,
      arab: surah.arab,
    }) : ''

    return {
      order: startOrder + index,
      surahId,
      surahName,
      surahArabic,
      totalVerses: surah?.number_of_ayahs ?? 0,
      num: ayah.ayah_number ?? ayah.number ?? index + 1,
      arabic: ayah.arab ?? ayah.arabic ?? ayah.text ?? '',
      translation: ayah.translation ?? '',
      audioUrl: ayah.audio_url,
    }
  })
}

function mergeUniqueVerses(currentVerses: DetailVerse[], nextVerses: DetailVerse[]) {
  const versesByNumber = new Map(currentVerses.map((verse) => [verse.num, verse]))

  nextVerses.forEach((verse) => {
    versesByNumber.set(verse.num, verse)
  })

  return Array.from(versesByNumber.values()).sort((a, b) => a.num - b.num)
}

function mergeUniqueJuzVerses(currentVerses: JuzVerse[], nextVerses: JuzVerse[]) {
  const versesByKey = new Map(currentVerses.map((verse) => [`${verse.surahId}:${verse.num}`, verse]))

  nextVerses.forEach((verse) => {
    versesByKey.set(`${verse.surahId}:${verse.num}`, verse)
  })

  return Array.from(versesByKey.values()).sort((a, b) => a.order - b.order)
}

function hasContiguousVersesFromStart(verses: DetailVerse[]) {
  if (verses.length === 0) {
    return false
  }

  const verseNumbers = Array.from(new Set(verses.map((verse) => verse.num))).sort((a, b) => a - b)

  return verseNumbers.length === verses.length && verseNumbers.every((verseNumber, index) => verseNumber === index + 1)
}

function hasContiguousJuzVersesFromStart(verses: JuzVerse[]) {
  if (verses.length === 0) {
    return false
  }

  const verseOrders = Array.from(new Set(verses.map((verse) => verse.order))).sort((a, b) => a - b)

  return verseOrders.length === verses.length && verseOrders.every((order, index) => order === index + 1)
}

function canAppendVerses(currentVerses: DetailVerse[], nextVerses: DetailVerse[]) {
  if (nextVerses.length === 0) {
    return true
  }

  const currentVerseNumbers = new Set(currentVerses.map((verse) => verse.num))
  const newVerses = nextVerses
    .filter((verse) => !currentVerseNumbers.has(verse.num))
    .sort((a, b) => a.num - b.num)

  if (newVerses.length === 0) {
    return true
  }

  const nextExpectedVerse = currentVerses.length + 1

  return newVerses[0].num === nextExpectedVerse
}

function canAppendJuzVerses(currentVerses: JuzVerse[], nextVerses: JuzVerse[]) {
  if (nextVerses.length === 0) {
    return true
  }

  const currentVerseKeys = new Set(currentVerses.map((verse) => `${verse.surahId}:${verse.num}`))
  const newVerses = nextVerses
    .filter((verse) => !currentVerseKeys.has(`${verse.surahId}:${verse.num}`))
    .sort((a, b) => a.order - b.order)

  if (newVerses.length === 0) {
    return true
  }

  const nextExpectedOrder = currentVerses.length + 1

  return newVerses[0].order === nextExpectedOrder
}

function hasMoreDetailPages(response: QuranDetailResponse | QuranJuzResponse, loadedVerses: number, totalVerses: number) {
  if (typeof response.pagination?.has_more_pages === 'boolean') {
    return response.pagination.has_more_pages
  }

  const currentPage = response.pagination?.current_page ?? response.meta?.current_page
  const lastPage = response.pagination?.last_page ?? response.meta?.last_page

  if (currentPage && lastPage) {
    return currentPage < lastPage
  }

  if (response.pagination?.next_page_url) {
    return true
  }

  return loadedVerses < totalVerses
}

const fallbackDailyAyah: DailyAyah = {
  arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
  translation: 'Barang siapa bertakwa kepada Allah, niscaya Dia akan membukakan jalan keluar baginya.',
  ref: 'At-Talaq 65:2',
}

// --- Icons ---
function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" strokeLinecap="round" />
    </svg>
  )
}

function IconBook({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}

function IconBookmark({ active, filled }: { active?: boolean; filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active || filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

function IconPlay({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3l14 9-14 9V3z" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEye({ off = false }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  )
}

function IconSpeaker({ off = false }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9v6h4l5 4V5L8 9H4z" strokeLinecap="round" strokeLinejoin="round" />
      {!off && <path d="M16 9.5a4 4 0 010 5M18.5 7a7 7 0 010 10" strokeLinecap="round" />}
      {off && <path d="M17 9l4 4m0-4l-4 4" strokeLinecap="round" />}
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--primary)' }}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

function IconFavorite({ filled }: { filled: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" strokeLinejoin="round" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

// --- Screens ---

function HomeScreen({ onReadSurah }: { onReadSurah: (id: number, ayah?: number) => void }) {
  const { dark } = useTheme()
  const [dailyAyah, setDailyAyah] = useState<DailyAyah>(fallbackDailyAyah)
  const [ayahLoading, setAyahLoading] = useState(true)
  const [ayahError, setAyahError] = useState(false)
  const [lastRead, setLastRead] = useState<LastRead | null>(getLastRead)
  const [favoriteSurahs, setFavoriteSurahs] = useState<FavoriteSurah[]>(getFavoriteSurahs)
  const todayLabel = getTodayLabel()
  const continueProgress = lastRead ? Math.min(100, (lastRead.verse / lastRead.totalVerses) * 100) : 0

  useEffect(() => {
    const controller = new AbortController()

    async function loadDailyAyah() {
      try {
        setAyahLoading(true)
        setAyahError(false)

        const response = await fetch('https://api.myquran.com/v3/quran/random', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Gagal memuat ayat acak')
        }

        const result = (await response.json()) as RandomAyahResponse

        if (!result.status || !result.data) {
          throw new Error('Response ayat acak tidak valid')
        }

        setDailyAyah({
          arabic: result.data.arab,
          translation: result.data.translation,
          ref: `${result.data.surah.name_latin} ${result.data.surah_number}:${result.data.ayah_number}`,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setAyahError(true)
        setDailyAyah(fallbackDailyAyah)
      } finally {
        if (!controller.signal.aborted) {
          setAyahLoading(false)
        }
      }
    }

    loadDailyAyah()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const syncHomeStorage = () => {
      setLastRead(getLastRead())
      setFavoriteSurahs(getFavoriteSurahs())
    }

    window.addEventListener('focus', syncHomeStorage)
    window.addEventListener('storage', syncHomeStorage)

    return () => {
      window.removeEventListener('focus', syncHomeStorage)
      window.removeEventListener('storage', syncHomeStorage)
    }
  }, [])

  return (
    <div className="animate-fade-in pb-28">
      {/* Header */}
      <div className="relative overflow-hidden pattern-bg px-6 pt-12 pb-10">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--header-gradient)' }} />
        <p className="arabic-text" style={{ color: 'var(--muted-fg)', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
          السلام عليكم
        </p>
        <h1 className="serif-heading" style={{ color: 'var(--fg)', fontSize: '24px', fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
          Assalamualaikum
        </h1>
        <p style={{ color: 'var(--muted-fg)', fontSize: '13px' }}>{todayLabel}</p>

        {/* Daily Ayah Card */}
        <div
          className="mt-6 rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: dark
              ? 'linear-gradient(135deg, #1a3d32 0%, #0f2a22 100%)'
              : 'linear-gradient(135deg, #fffbef 0%, #fdf5dc 100%)',
            border: '1px solid rgba(201,168,76,0.25)',
          }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10" style={{ background: 'radial-gradient(circle, var(--primary), transparent)' }} />
          <p style={{ color: 'var(--primary)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>
            {ayahLoading ? 'Memuat Ayat' : 'Ayat Hari Ini'}
          </p>
          <p className="arabic-text" style={{ fontSize: '20px', color: 'var(--fg)', marginBottom: 12, lineHeight: 2 }}>
            {dailyAyah.arabic}
          </p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '13px', lineHeight: 1.7, marginBottom: 10, fontStyle: 'italic' }}>
            "{dailyAyah.translation}"
          </p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>
            {dailyAyah.ref}{ayahError ? ' · Cadangan offline' : ''}
          </p>
        </div>
      </div>

      {/* Continue Reading */}
      <div className="px-6 mt-6">
        <p className="serif-heading" style={{ color: 'var(--fg)', fontSize: '16px', fontWeight: 600, marginBottom: 14 }}>
          Lanjut Membaca
        </p>
        <button
          onClick={() => onReadSurah(lastRead?.surahId ?? 1, lastRead?.verse)}
          className="w-full text-left rounded-xl p-4 flex items-center gap-4"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <span className="arabic-text" style={{ color: 'var(--primary)', fontSize: '15px', lineHeight: 1 }}>{toArabicNumber(lastRead?.surahId ?? 1)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: 'var(--fg)', fontWeight: 500, fontSize: '14px', marginBottom: 2 }}>{lastRead?.surahName ?? 'Mulai membaca'}</p>
            <p style={{ color: 'var(--muted-fg)', fontSize: '12px' }}>
              {lastRead ? `Ayat ${lastRead.verse} dari ${lastRead.totalVerses}` : 'Mulai dari Al-Fatihah'}
            </p>
            <div className="mt-2 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--muted-bg)' }}>
              <div style={{ width: `${continueProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 9999 }} />
            </div>
          </div>
          <span style={{ color: 'var(--muted-fg)' }}><IconChevronLeft /></span>
        </button>
      </div>

      {/* Quick Access */}
      <div className="px-6 mt-7">
        <p className="serif-heading" style={{ color: 'var(--fg)', fontSize: '16px', fontWeight: 600, marginBottom: 14 }}>
          Akses Cepat
        </p>
        {favoriteSurahs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {favoriteSurahs.map((item) => (
            <button
              key={item.id}
              onClick={() => onReadSurah(item.id)}
              className="rounded-xl p-4 text-left"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              <p style={{ color: 'var(--fg)', fontWeight: 500, fontSize: '13px', marginBottom: 2 }}>{item.nameLatin}</p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{item.meaning} · {item.verses} ayat</p>
            </button>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted-fg)', fontSize: '13px', lineHeight: 1.7 }}>Tambahkan surah favorit dari halaman Surah.</p>
        )}
      </div>

    </div>
  )
}

function SurahListScreen({
  onReadSurah,
  surahList,
  onLoadSurahs,
}: {
  onReadSurah: (id: number) => void
  surahList: Surah[]
  onLoadSurahs: (surahs: Surah[]) => void
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(surahList.length === 0)
  const [loadError, setLoadError] = useState(false)
  const [favoriteSurahs, setFavoriteSurahs] = useState<FavoriteSurah[]>(getFavoriteSurahs)
  const totalAyahs = surahList.reduce((sum, surah) => sum + surah.verses, 0)
  const favoriteIds = new Set(favoriteSurahs.map((surah) => surah.id))
  const filtered = surahList.filter(
    (s) =>
      s.nameLatin.toLowerCase().includes(query.toLowerCase()) ||
      s.name.includes(query) ||
      s.meaning.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadSurahs() {
      try {
        setLoading(true)
        setLoadError(false)

        const response = await fetch('https://api.myquran.com/v3/quran', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Gagal memuat daftar surah')
        }

        const result = (await response.json()) as QuranListResponse

        if (!result.status || !Array.isArray(result.data)) {
          throw new Error('Response daftar surah tidak valid')
        }

        onLoadSurahs(result.data.map((surah) => ({
          id: surah.number,
          name: getSurahArabicName(surah),
          nameLatin: surah.name_latin,
          verses: surah.number_of_ayahs,
          meaning: surah.translation,
          revelation: surah.revelation,
        })))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setLoadError(true)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadSurahs()

    return () => controller.abort()
  }, [onLoadSurahs])

  function toggleFavoriteSurah(surah: Surah) {
    const alreadyFavorite = favoriteIds.has(surah.id)
    const nextFavorites = alreadyFavorite
      ? favoriteSurahs.filter((favorite) => favorite.id !== surah.id)
      : [
          {
            ...surah,
            savedAt: new Date().toISOString(),
          },
          ...favoriteSurahs,
        ]

    saveFavoriteSurahs(nextFavorites)
    setFavoriteSurahs(nextFavorites)
  }

  return (
    <div className="animate-fade-in pb-28">
      <div className="px-6 pt-12 pb-5">
        <h1 className="serif-heading" style={{ color: 'var(--fg)', fontSize: '24px', fontWeight: 600, marginBottom: 4 }}>
          Surah
        </h1>
        <p style={{ color: 'var(--muted-fg)', fontSize: '13px', marginBottom: 16 }}>
          {loading ? 'Memuat daftar surah...' : `${surahList.length} surah · ${totalAyahs.toLocaleString('id-ID')} ayat`}
          {loadError ? ' · Gagal memuat dari API' : ''}
        </p>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
        >
          <span style={{ color: 'var(--muted-fg)' }}><IconSearch /></span>
          <input
            type="text"
            placeholder="Cari surah atau arti..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--fg)',
              fontSize: '14px',
              width: '100%',
              fontFamily: 'Inter',
            }}
          />
        </div>
      </div>

      <div className="px-4">
        {filtered.map((s, i) => (
          <div
            key={s.id}
            className="w-full text-left flex items-center gap-4 px-3 py-4"
            style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <button
              onClick={() => onReadSurah(s.id)}
              className="flex flex-1 items-center gap-4 text-left min-w-0"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--secondary-bg)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>{s.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: 'var(--fg)', fontWeight: 500, fontSize: '14px', marginBottom: 2 }}>{s.nameLatin}</p>
                <p style={{ color: 'var(--muted-fg)', fontSize: '12px' }}>{s.meaning} · {s.verses} ayat · {s.revelation}</p>
              </div>
            </button>
            <button
              onClick={() => toggleFavoriteSurah(s)}
              aria-label={favoriteIds.has(s.id) ? 'Hapus dari favorit' : 'Tambah ke favorit'}
              title={favoriteIds.has(s.id) ? 'Hapus dari favorit' : 'Tambah ke favorit'}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              style={{ color: favoriteIds.has(s.id) ? 'var(--primary)' : 'var(--muted-fg)' }}
            >
              <IconFavorite filled={favoriteIds.has(s.id)} />
            </button>
          </div>
        ))}
        {loadError && filtered.length === 0 && (
          <p style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>Daftar surah belum bisa dimuat.</p>
        )}
        {!loadError && filtered.length === 0 && (
          <p style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>Surah tidak ditemukan.</p>
        )}
      </div>
    </div>
  )
}

function JuzListScreen({ onReadJuz }: { onReadJuz: (id: number) => void }) {
  return (
    <div className="animate-fade-in pb-28">
      <div className="px-6 pt-12 pb-5">
        <h1 className="serif-heading" style={{ color: 'var(--fg)', fontSize: '24px', fontWeight: 600, marginBottom: 4 }}>
          Juz
        </h1>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-5 gap-3">
          {juzList.map((juz) => (
            <button
              key={juz.id}
              onClick={() => onReadJuz(juz.id)}
              className="aspect-square rounded-xl flex items-center justify-center"
              style={{
                background: 'var(--secondary-bg)',
                border: '1px solid var(--border)',
                color: 'var(--primary)',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              {juz.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function JuzSurahSeparator({ verse, compact = false }: { verse: JuzVerse; compact?: boolean }) {
  return (
    <div
      className="my-6 rounded-2xl px-5 py-4 text-center"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
      }}
    >
      {verse.surahArabic && (
        <p className="arabic-text" style={{ color: 'var(--primary)', fontSize: compact ? '18px' : '22px', lineHeight: 1.6, marginBottom: verse.surahId === 9 ? 0 : 6 }}>
          {verse.surahArabic}
        </p>
      )}
      {verse.surahId !== 9 && (
        <p className="arabic-text" style={{ color: 'var(--fg)', fontSize: compact ? '18px' : '22px', lineHeight: 1.8 }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      )}
    </div>
  )
}

function JuzDetailScreen({ juzId, onBack, onReadJuz }: { juzId: number; onBack: () => void; onReadJuz: (id: number) => void }) {
  const { dark, toggle } = useTheme()
  const juzRootRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const visibleAyahsRef = useRef<Set<number>>(new Set())
  const lastObservedOrderRef = useRef<number | null>(null)
  const scrollRestoreRef = useRef<number | null>(null)
  const nextPageRequestedRef = useRef(false)
  const [arabicFontSize, setArabicFontSize] = useState(26)
  const [showTranslation, setShowTranslation] = useState(true)
  const [showPlayer, setShowPlayer] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeVerse, setActiveVerse] = useState<string | null>(null)
  const [audioVerseKey, setAudioVerseKey] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => new Set(getSavedBookmarks().map((bookmark) => bookmark.id)))
  const [detail, setDetail] = useState<JuzDetail | null>(null)
  const [detailPage, setDetailPage] = useState(1)
  const [hasMoreVerses, setHasMoreVerses] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadMoreErrorPage, setLoadMoreErrorPage] = useState<number | null>(null)
  const [retryLoadMoreKey, setRetryLoadMoreKey] = useState(0)

  useEffect(() => {
    const cachedDetail = getCachedJuzDetail(juzId)

    setDetail(cachedDetail?.detail ?? null)
    setDetailPage(cachedDetail?.page ?? 1)
    setHasMoreVerses(cachedDetail?.hasMore ?? true)
    setLoading(!cachedDetail)
    setActiveVerse(null)
    setAudioVerseKey(null)
    visibleAyahsRef.current = new Set()
    lastObservedOrderRef.current = null
    scrollRestoreRef.current = null
    nextPageRequestedRef.current = false
    setLoadMoreErrorPage(null)
    setRetryLoadMoreKey(0)
  }, [juzId])

  useEffect(() => {
    const cachedDetail = getCachedJuzDetail(juzId)

    if (cachedDetail && detailPage <= cachedDetail.page) {
      setLoading(false)
      setLoadingMore(false)
      setLoadError(false)
      setLoadMoreErrorPage(null)
      nextPageRequestedRef.current = false
      return
    }

    const controller = new AbortController()

    async function loadJuzDetail() {
      try {
        if (detailPage > 1 && juzRootRef.current) {
          scrollRestoreRef.current = juzRootRef.current.scrollTop
        }

        setLoading(detailPage === 1)
        setLoadingMore(detailPage > 1)
        setLoadError(false)
        setLoadMoreErrorPage(null)

        const response = await fetch(`https://api.myquran.com/v3/quran/juz/${juzId}${detailPage > 1 ? `?page=${detailPage}` : ''}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Gagal memuat detail juz')
        }

        const result = (await response.json()) as QuranJuzResponse

        if (!result.status || !result.data) {
          throw new Error('Response detail juz tidak valid')
        }

        setDetail((currentDetail) => {
          if (detailPage === 1 || !currentDetail) {
            const nextVerses = mapJuzVerses(result.data, 1)
            const totalVerses = getJuzTotalVerses(result, nextVerses.length, juzId)
            const nextDetail = {
              id: juzId,
              verses: nextVerses,
              totalVerses,
            }
            const nextHasMore = hasMoreDetailPages(result, nextDetail.verses.length, totalVerses)

            setHasMoreVerses(nextHasMore)
            saveCachedJuzDetail(juzId, { detail: nextDetail, page: detailPage, hasMore: nextHasMore })
            return nextDetail
          }

          const nextVerses = mapJuzVerses(result.data, currentDetail.verses.length + 1)

          if (!canAppendJuzVerses(currentDetail.verses, nextVerses)) {
            setLoadMoreErrorPage(detailPage)
            setHasMoreVerses(true)
            return currentDetail
          }

          const mergedVerses = mergeUniqueJuzVerses(currentDetail.verses, nextVerses)
          const totalVerses = currentDetail.totalVerses || getJuzTotalVerses(result, mergedVerses.length, juzId)
          const nextHasMore = nextVerses.length > 0 && hasMoreDetailPages(result, mergedVerses.length, totalVerses)
          const nextDetail = {
            ...currentDetail,
            verses: mergedVerses,
            totalVerses,
          }

          setHasMoreVerses(nextHasMore)
          saveCachedJuzDetail(juzId, { detail: nextDetail, page: detailPage, hasMore: nextHasMore })
          return nextDetail
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (detailPage === 1) {
          setLoadError(true)
          setDetail(null)
        } else {
          setLoadMoreErrorPage(detailPage)
          setHasMoreVerses(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
          nextPageRequestedRef.current = false
        }
      }
    }

    loadJuzDetail()

    return () => controller.abort()
  }, [juzId, detailPage, retryLoadMoreKey])

  useEffect(() => {
    if (scrollRestoreRef.current === null || !juzRootRef.current) {
      return
    }

    const scrollTop = scrollRestoreRef.current
    scrollRestoreRef.current = null

    window.requestAnimationFrame(() => {
      if (juzRootRef.current) {
        juzRootRef.current.scrollTop = scrollTop
      }
    })
  }, [detail?.verses.length])

  useEffect(() => {
    if (!detail || !juzRootRef.current) {
      return
    }

    visibleAyahsRef.current = new Set()
    lastObservedOrderRef.current = null

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const order = Number((entry.target as HTMLElement).dataset.order)

          if (!order) {
            return
          }

          if (entry.isIntersecting) {
            visibleAyahsRef.current.add(order)
          } else {
            visibleAyahsRef.current.delete(order)
          }
        })

        const visibleOrders = Array.from(visibleAyahsRef.current)

        if (visibleOrders.length === 0) {
          return
        }

        const lastVisibleOrder = Math.max(...visibleOrders)

        if (lastObservedOrderRef.current === lastVisibleOrder) {
          return
        }

        const verse = detail.verses.find((item) => item.order === lastVisibleOrder)

        if (!verse || !verse.surahId) {
          return
        }

        lastObservedOrderRef.current = lastVisibleOrder
        setAudioVerseKey(`${verse.surahId}:${verse.num}`)
        saveLastRead({
          surahId: verse.surahId,
          surahName: verse.surahName,
          surahArabic: verse.surahArabic,
          verse: verse.num,
          totalVerses: verse.totalVerses || verse.num,
          updatedAt: new Date().toISOString(),
        })
      },
      {
        root: juzRootRef.current,
        threshold: 0.1,
      }
    )

    detail.verses.forEach((verse) => {
      const element = document.getElementById(`juz-ayah-${verse.order}`)

      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [detail, showTranslation])

  useEffect(() => {
    const root = juzRootRef.current

    if (!root || loading || loadingMore || !hasMoreVerses || loadMoreErrorPage) {
      return
    }

    function handleScroll() {
      const distanceToBottom = root.scrollHeight - root.scrollTop - root.clientHeight

      if (distanceToBottom < 240 && !nextPageRequestedRef.current) {
        nextPageRequestedRef.current = true
        setDetailPage((page) => page + 1)
      }
    }

    root.addEventListener('scroll', handleScroll)

    return () => root.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasMoreVerses, loadMoreErrorPage, detail?.verses.length])

  const selectedAudioVerse = detail?.verses.find((verse) => `${verse.surahId}:${verse.num}` === audioVerseKey)
  const fallbackAudioVerse = detail?.verses.find((verse) => verse.audioUrl)
  const audioVerse = selectedAudioVerse ?? fallbackAudioVerse
  const audioUrl = audioVerse?.audioUrl
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    audioRef.current?.pause()
    audioRef.current?.load()
  }, [audioUrl])

  useEffect(() => {
    if (!showPlayer) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [showPlayer])

  async function toggleAudio() {
    const audio = audioRef.current

    if (!audio || !audioUrl) {
      return
    }

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  function toggleBookmark(verse: JuzVerse) {
    const bookmarkId = getBookmarkId(verse.surahId, verse.num)
    const savedBookmarks = getSavedBookmarks()
    const alreadySaved = savedBookmarks.some((bookmark) => bookmark.id === bookmarkId)
    const nextBookmarks = alreadySaved
      ? savedBookmarks.filter((bookmark) => bookmark.id !== bookmarkId)
      : [
          {
            id: bookmarkId,
            surahId: verse.surahId,
            surahName: verse.surahName,
            surahArabic: verse.surahArabic,
            verse: verse.num,
            text: verse.arabic,
            translation: verse.translation,
            savedAt: new Date().toISOString(),
          },
          ...savedBookmarks,
        ]

    saveBookmarks(nextBookmarks)
    setBookmarked(new Set(nextBookmarks.map((bookmark) => bookmark.id)))
  }

  function openVerse(verse: JuzVerse) {
    const verseKey = `${verse.surahId}:${verse.num}`

    setActiveVerse(activeVerse === verseKey ? null : verseKey)
    setAudioVerseKey(verseKey)

    if (verse.surahId) {
      saveLastRead({
        surahId: verse.surahId,
        surahName: verse.surahName,
        surahArabic: verse.surahArabic,
        verse: verse.num,
        totalVerses: verse.totalVerses || verse.num,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  const updateArabicFontSize = (nextSize: number) => setArabicFontSize(Math.min(40, Math.max(18, nextSize)))

  return (
    <div ref={juzRootRef} className="animate-fade-in min-h-screen" style={{ background: 'var(--bg)', height: '100vh', overflowY: 'auto' }}>
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-4"
        style={{
          background: dark ? 'rgba(13,31,26,0.95)' : 'rgba(250,247,240,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button onClick={onBack} style={{ color: 'var(--muted-fg)' }}>
          <IconChevronLeft />
        </button>
        <div className="text-center">
          <p style={{ color: 'var(--fg)', fontWeight: 600, fontSize: '15px', fontFamily: 'Lora, serif' }}>Juz {juzId}</p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>
            {detail ? `${detail.verses.length}${detail.totalVerses ? ` dari ${detail.totalVerses}` : ''} ayat` : 'Memuat ayat'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPlayer(!showPlayer)}
            aria-label={showPlayer ? 'Sembunyikan pemutar audio' : 'Tampilkan pemutar audio'}
            title={showPlayer ? 'Sembunyikan pemutar audio' : 'Tampilkan pemutar audio'}
            style={{
              color: showPlayer ? 'var(--primary)' : 'var(--muted-fg)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: showPlayer ? 'rgba(201,168,76,0.1)' : 'transparent',
            }}
          >
            <IconSpeaker off={!showPlayer} />
          </button>
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            aria-label={showTranslation ? 'Sembunyikan terjemahan' : 'Tampilkan terjemahan'}
            title={showTranslation ? 'Sembunyikan terjemahan' : 'Tampilkan terjemahan'}
            style={{
              color: showTranslation ? 'var(--primary)' : 'var(--muted-fg)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: showTranslation ? 'rgba(201,168,76,0.1)' : 'transparent',
            }}
          >
            <IconEye off={!showTranslation} />
          </button>
          <button
            onClick={toggle}
            aria-label={dark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
            title={dark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
            style={{
              color: 'var(--muted-fg)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: 'transparent',
            }}
          >
            {dark ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>

      {loading || loadError || !detail ? (
        <div className="px-6 py-12 text-center">
          <p className="serif-heading" style={{ color: 'var(--fg)', fontSize: '20px', fontWeight: 600, marginBottom: 8 }}>
            {loading ? 'Memuat detail juz' : 'Detail juz belum bisa dimuat'}
          </p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '13px', lineHeight: 1.7 }}>
            {loading ? 'Mengambil data ayat dari API MyQuran.' : 'Silakan kembali ke daftar juz dan coba buka lagi.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-5 py-3">
            <span style={{ color: 'var(--muted-fg)', fontSize: '12px', fontWeight: 500 }}>Ukuran font Arab</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateArabicFontSize(arabicFontSize - 2)}
                aria-label="Perkecil font Arab"
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-fg)',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                −
              </button>
              <input
                type="number"
                min={18}
                max={40}
                step={2}
                value={arabicFontSize}
                onChange={(event) => updateArabicFontSize(Number(event.target.value))}
                aria-label="Ukuran font Arab"
                style={{
                  width: 54,
                  height: 30,
                  borderRadius: 6,
                  background: 'var(--input-bg)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => updateArabicFontSize(arabicFontSize + 2)}
                aria-label="Perbesar font Arab"
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  color: 'var(--primary)',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                +
              </button>
            </div>
          </div>

          <div className={showPlayer ? 'px-3 pb-36' : 'px-3 pb-8'}>
            {!showTranslation ? (
              <div
                className="arabic-text"
                style={{
                  color: 'var(--fg)',
                  fontSize: `${arabicFontSize}px`,
                  lineHeight: 2.4,
                  padding: '18px 8px 28px',
                  textAlign: 'justify',
                }}
              >
                {detail.verses.map((verse, index) => {
                  const previousVerse = detail.verses[index - 1]
                  const showSurahSeparator = previousVerse && previousVerse.surahId !== verse.surahId

                  return (
                    <Fragment key={`${verse.surahId}:${verse.num}`}>
                      {showSurahSeparator && <JuzSurahSeparator verse={verse} compact />}
                      <span
                        id={`juz-ayah-${verse.order}`}
                        data-order={verse.order}
                        onClick={() => openVerse(verse)}
                        style={{ cursor: 'pointer', background: activeVerse === `${verse.surahId}:${verse.num}` ? 'var(--verse-hover)' : 'transparent' }}
                      >
                        {verse.arabic}{' '}
                        <span
                          style={{
                            color: 'var(--primary)',
                            fontSize: `${Math.max(12, arabicFontSize * 0.5)}px`,
                            margin: '0 6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ﴿{toArabicNumber(verse.num)}﴾
                        </span>{' '}
                      </span>
                    </Fragment>
                  )
                })}
              </div>
            ) : (
              detail.verses.map((verse, index) => {
                const previousVerse = detail.verses[index - 1]
                const showSurahSeparator = previousVerse && previousVerse.surahId !== verse.surahId

                return (
                  <Fragment key={`${verse.surahId}:${verse.num}`}>
                    {showSurahSeparator && <JuzSurahSeparator verse={verse} />}
                    <button
                      id={`juz-ayah-${verse.order}`}
                      data-order={verse.order}
                      onClick={() => openVerse(verse)}
                      className="w-full text-left"
                      style={{
                        background: activeVerse === `${verse.surahId}:${verse.num}` ? 'var(--verse-hover)' : 'transparent',
                        border: `1px solid ${activeVerse === `${verse.surahId}:${verse.num}` ? 'var(--verse-border)' : 'transparent'}`,
                        borderRadius: 12,
                        padding: '10px',
                        marginBottom: 4,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}
                          >
                            <span className="arabic-text" style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>{toArabicNumber(verse.num)}</span>
                          </div>
                          <span style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{verse.surahName}</span>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleBookmark(verse)
                          }}
                          style={{ color: bookmarked.has(getBookmarkId(verse.surahId, verse.num)) ? 'var(--primary)' : 'var(--muted-fg)' }}
                        >
                          <IconBookmark filled={bookmarked.has(getBookmarkId(verse.surahId, verse.num))} />
                        </button>
                      </div>
                      <p className="arabic-text" style={{ fontSize: `${arabicFontSize}px`, color: 'var(--fg)', marginBottom: 16, lineHeight: 2.1 }}>
                        {verse.arabic}
                      </p>
                      <p style={{ color: 'var(--muted-fg)', fontSize: '13px', lineHeight: 1.8, fontStyle: 'italic' }}>
                        {verse.translation}
                      </p>
                    </button>
                  </Fragment>
                )
              })
            )}
            {loadingMore && (
              <p style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '18px 0', fontSize: '12px' }}>Memuat ayat berikutnya...</p>
            )}
            {loadMoreErrorPage && (
              <div className="px-2 py-6 text-center">
                <p style={{ color: 'var(--muted-fg)', fontSize: '12px', lineHeight: 1.7, marginBottom: 12 }}>
                  Halaman {loadMoreErrorPage} belum berhasil dimuat. Ayat berikutnya tidak akan dilanjutkan dulu agar urutan ayat tetap lengkap.
                </p>
                <button
                  onClick={() => setRetryLoadMoreKey((key) => key + 1)}
                  className="rounded-lg px-4 py-2"
                  style={{
                    background: 'rgba(201,168,76,0.12)',
                    border: '1px solid rgba(201,168,76,0.35)',
                    color: 'var(--primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Coba muat lagi
                </button>
              </div>
            )}
            {!hasMoreVerses && !loadingMore && !loadMoreErrorPage && (
              <div
                className="mt-6 rounded-2xl p-5"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                }}
              >
                <p className="serif-heading" style={{ color: 'var(--fg)', fontSize: '17px', fontWeight: 600, marginBottom: 6 }}>
                  {juzId < 30 ? 'Lanjut ke Juz Berikutnya' : 'Khatam 30 Juz'}
                </p>
                <p style={{ color: 'var(--muted-fg)', fontSize: '12px', lineHeight: 1.7, marginBottom: 14 }}>
                  {juzId < 30 ? `Kamu sudah sampai akhir Juz ${juzId}.` : 'Kamu sudah sampai akhir Juz 30.'}
                </p>
                {juzId < 30 ? (
                  <button
                    onClick={() => onReadJuz(juzId + 1)}
                    className="w-full rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      color: 'var(--primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <span>Juz {juzId + 1}</span>
                    <span style={{ transform: 'rotate(180deg)' }}><IconChevronLeft /></span>
                  </button>
                ) : (
                  <button
                    onClick={onBack}
                    className="w-full rounded-xl px-4 py-3"
                    style={{
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      color: 'var(--primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Kembali ke daftar Juz
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {showPlayer && !loading && !loadError && detail && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm"
          style={{
            background: 'var(--player-bg)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border)',
            padding: '16px 24px 28px',
          }}
        >
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onEnded={() => setPlaying(false)}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ color: 'var(--fg)', fontSize: '13px', fontWeight: 500 }}>
                Juz {juzId}{audioVerse ? ` — ${audioVerse.surahName}:${audioVerse.num}` : ''}
              </p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '11px', marginTop: 1 }}>
                {audioUrl ? 'Audio tersedia' : 'Audio belum tersedia'}
              </p>
            </div>
            <button
              onClick={toggleAudio}
              disabled={!audioUrl}
              className="pulse-gold w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: audioUrl ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--muted-bg)',
                color: audioUrl ? 'var(--primary-fg)' : 'var(--muted-fg)',
                opacity: audioUrl ? 1 : 0.6,
              }}
            >
              <IconPlay playing={playing} />
            </button>
          </div>
          <div className="rounded-full overflow-hidden mb-2" style={{ height: 3, background: 'var(--muted-bg)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 9999 }} />
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{formatAudioTime(currentTime)}</span>
            <span style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{formatAudioTime(duration)}</span>
          </div>
        </div>
      )}
      </div>
  )
}

function ReadingScreen({ surahId, onBack, onReadSurah }: { surahId: number; onBack: () => void; onReadSurah: (id: number) => void }) {
  const { dark, toggle } = useTheme()
  const readingRootRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const visibleAyahsRef = useRef<Set<number>>(new Set())
  const lastObservedAyahRef = useRef<number | null>(null)
  const scrollRestoreRef = useRef<number | null>(null)
  const initialTargetScrolledRef = useRef(false)
  const nextPageRequestedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => new Set(getSavedBookmarks().map((bookmark) => bookmark.id)))
  const [arabicFontSize, setArabicFontSize] = useState(26)
  const [showTranslation, setShowTranslation] = useState(true)
  const [showPlayer, setShowPlayer] = useState(true)
  const [activeVerse, setActiveVerse] = useState<number | null>(null)
  const [detail, setDetail] = useState<SurahDetail | null>(null)
  const [detailPage, setDetailPage] = useState(1)
  const [hasMoreVerses, setHasMoreVerses] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadMoreErrorPage, setLoadMoreErrorPage] = useState<number | null>(null)
  const [retryLoadMoreKey, setRetryLoadMoreKey] = useState(0)

  useEffect(() => {
    const cachedDetail = getCachedSurahDetail(surahId)

    setDetail(cachedDetail?.detail ?? null)
    setDetailPage(cachedDetail?.page ?? 1)
    setHasMoreVerses(cachedDetail?.hasMore ?? true)
    setLoading(!cachedDetail)
    setActiveVerse(null)
    visibleAyahsRef.current = new Set()
    lastObservedAyahRef.current = null
    scrollRestoreRef.current = null
    initialTargetScrolledRef.current = false
    nextPageRequestedRef.current = false
    setLoadMoreErrorPage(null)
    setRetryLoadMoreKey(0)
  }, [surahId])

  useEffect(() => {
    const cachedDetail = getCachedSurahDetail(surahId)

    if (cachedDetail && detailPage <= cachedDetail.page) {
      setLoading(false)
      setLoadingMore(false)
      setLoadError(false)
      setLoadMoreErrorPage(null)
      nextPageRequestedRef.current = false
      return
    }

    const controller = new AbortController()

    async function loadSurahDetail() {
      try {
        if (detailPage > 1 && readingRootRef.current) {
          scrollRestoreRef.current = readingRootRef.current.scrollTop
        }

        setLoading(detailPage === 1)
        setLoadingMore(detailPage > 1)
        setLoadError(false)
        setLoadMoreErrorPage(null)

        const response = await fetch(`https://api.myquran.com/v3/quran/${surahId}${detailPage > 1 ? `?page=${detailPage}` : ''}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Gagal memuat detail surah')
        }

        const result = (await response.json()) as QuranDetailResponse

        if (!result.status || !result.data) {
          throw new Error('Response detail surah tidak valid')
        }

        const nextSurah = mapDetailSurah(result.data)
        const nextVerses = mapDetailVerses(result.data)

        setDetail((currentDetail) => {
          if (detailPage === 1 || !currentDetail) {
            const nextDetail = {
              surah: nextSurah,
              verses: nextVerses,
              audioUrl: result.data.audio_url,
            }
            const nextHasMore = hasMoreDetailPages(result, nextDetail.verses.length, nextSurah.verses)

            setHasMoreVerses(nextHasMore)
            saveCachedSurahDetail(surahId, { detail: nextDetail, page: detailPage, hasMore: nextHasMore })
            return nextDetail
          }

          if (!canAppendVerses(currentDetail.verses, nextVerses)) {
            setLoadMoreErrorPage(detailPage)
            setHasMoreVerses(true)
            return currentDetail
          }

          const mergedVerses = mergeUniqueVerses(currentDetail.verses, nextVerses)
          const nextHasMore = nextVerses.length > 0 && hasMoreDetailPages(result, mergedVerses.length, currentDetail.surah.verses)
          const nextDetail = {
            ...currentDetail,
            verses: mergedVerses,
          }

          setHasMoreVerses(nextHasMore)
          saveCachedSurahDetail(surahId, { detail: nextDetail, page: detailPage, hasMore: nextHasMore })
          return nextDetail
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (detailPage === 1) {
          setLoadError(true)
          setDetail(null)
        } else {
          setLoadMoreErrorPage(detailPage)
          setHasMoreVerses(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
          nextPageRequestedRef.current = false
        }
      }
    }

    loadSurahDetail()

    return () => controller.abort()
  }, [surahId, detailPage, retryLoadMoreKey])

  useEffect(() => {
    const targetAyah = getAyahFromSearch(window.location.search)

    if (detail) {
      saveLastReadForVerse(targetAyah ?? 1)

      if (!targetAyah || initialTargetScrolledRef.current) {
        return
      }

      initialTargetScrolledRef.current = true
      setActiveVerse(targetAyah)
      window.requestAnimationFrame(() => {
        document.getElementById(`ayah-${targetAyah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }, [detail, surahId])

  useEffect(() => {
    if (scrollRestoreRef.current === null || !readingRootRef.current) {
      return
    }

    const scrollTop = scrollRestoreRef.current
    scrollRestoreRef.current = null

    window.requestAnimationFrame(() => {
      if (readingRootRef.current) {
        readingRootRef.current.scrollTop = scrollTop
      }
    })
  }, [detail?.verses.length])

  useEffect(() => {
    if (!detail || !readingRootRef.current) {
      return
    }

    visibleAyahsRef.current = new Set()
    lastObservedAyahRef.current = null

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ayah = Number((entry.target as HTMLElement).dataset.ayah)

          if (!ayah) {
            return
          }

          if (entry.isIntersecting) {
            visibleAyahsRef.current.add(ayah)
          } else {
            visibleAyahsRef.current.delete(ayah)
          }
        })

        const visibleAyahs = Array.from(visibleAyahsRef.current)

        if (visibleAyahs.length === 0) {
          return
        }

        const lastVisibleAyah = Math.max(...visibleAyahs)

        if (lastObservedAyahRef.current === lastVisibleAyah) {
          return
        }

        lastObservedAyahRef.current = lastVisibleAyah
        saveLastReadForVerse(lastVisibleAyah)
      },
      {
        root: readingRootRef.current,
        threshold: 0.1,
      }
    )

    detail.verses.forEach((verse) => {
      const element = document.getElementById(`ayah-${verse.num}`)

      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [detail, showTranslation])

  useEffect(() => {
    const root = readingRootRef.current

    if (!root || loading || loadingMore || !hasMoreVerses || loadMoreErrorPage) {
      return
    }

    function handleScroll() {
      const distanceToBottom = root.scrollHeight - root.scrollTop - root.clientHeight

      if (distanceToBottom < 240 && !nextPageRequestedRef.current) {
        nextPageRequestedRef.current = true
        setDetailPage((page) => page + 1)
      }
    }

    root.addEventListener('scroll', handleScroll)

    return () => root.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasMoreVerses, loadMoreErrorPage, detail?.verses.length])

  const audioUrl = detail?.audioUrl

  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    audioRef.current?.pause()
    audioRef.current?.load()
  }, [audioUrl])

  useEffect(() => {
    if (!showPlayer) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [showPlayer])

  async function toggleAudio() {
    const audio = audioRef.current

    if (!audio || !audioUrl) {
      return
    }

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  function toggleBookmark(verse: DetailVerse) {
    const bookmarkId = getBookmarkId(surahId, verse.num)
    const savedBookmarks = getSavedBookmarks()
    const alreadySaved = savedBookmarks.some((bookmark) => bookmark.id === bookmarkId)
    const nextBookmarks = alreadySaved
      ? savedBookmarks.filter((bookmark) => bookmark.id !== bookmarkId)
      : [
          {
            id: bookmarkId,
            surahId,
            surahName: detail?.surah.nameLatin ?? `Surah ${surahId}`,
            surahArabic: detail?.surah.name ?? '',
            verse: verse.num,
            text: verse.arabic,
            translation: verse.translation,
            savedAt: new Date().toISOString(),
          },
          ...savedBookmarks,
        ]

    saveBookmarks(nextBookmarks)
    setBookmarked(new Set(nextBookmarks.map((bookmark) => bookmark.id)))
  }

  function saveLastReadForVerse(verse: number) {
    if (!detail) {
      return
    }

    saveLastRead({
      surahId,
      surahName: detail.surah.nameLatin,
      surahArabic: detail.surah.name,
      verse,
      totalVerses: detail.surah.verses,
      updatedAt: new Date().toISOString(),
    })
  }

  function openVerse(verse: DetailVerse) {
    setActiveVerse(activeVerse === verse.num ? null : verse.num)
    saveLastReadForVerse(verse.num)
    window.history.replaceState({ page: 'surahs', surahId, ayah: verse.num }, '', `/surah/${surahId}?ayah=${verse.num}`)
  }

  if (loading || loadError || !detail) {
    return (
      <div className="animate-fade-in min-h-screen" style={{ background: 'var(--bg)', height: '100vh', overflowY: 'auto' }}>
        <div
          className="sticky top-0 z-10 flex items-center px-4 py-4"
          style={{
            background: dark ? 'rgba(13,31,26,0.95)' : 'rgba(250,247,240,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button onClick={onBack} style={{ color: 'var(--muted-fg)' }}>
            <IconChevronLeft />
          </button>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="serif-heading" style={{ color: 'var(--fg)', fontSize: '20px', fontWeight: 600, marginBottom: 8 }}>
            {loading ? 'Memuat detail surah' : 'Detail surah belum bisa dimuat'}
          </p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '13px', lineHeight: 1.7 }}>
            {loading ? 'Mengambil data ayat dari API MyQuran.' : 'Silakan kembali ke daftar surah dan coba buka lagi.'}
          </p>
        </div>
      </div>
    )
  }

  const { surah, verses } = detail
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const updateArabicFontSize = (nextSize: number) => setArabicFontSize(Math.min(40, Math.max(18, nextSize)))

  return (
    <div ref={readingRootRef} className="animate-fade-in min-h-screen" style={{ background: 'var(--bg)', height: '100vh', overflowY: 'auto' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-4"
        style={{
          background: dark ? 'rgba(13,31,26,0.95)' : 'rgba(250,247,240,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button onClick={onBack} style={{ color: 'var(--muted-fg)' }}>
          <IconChevronLeft />
        </button>
        <div className="text-center">
          <p style={{ color: 'var(--fg)', fontWeight: 600, fontSize: '15px', fontFamily: 'Lora, serif' }}>{surah.nameLatin}</p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{surah.verses} ayat · {surah.revelation}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPlayer(!showPlayer)}
            aria-label={showPlayer ? 'Sembunyikan pemutar audio' : 'Tampilkan pemutar audio'}
            title={showPlayer ? 'Sembunyikan pemutar audio' : 'Tampilkan pemutar audio'}
            style={{
              color: showPlayer ? 'var(--primary)' : 'var(--muted-fg)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: showPlayer ? 'rgba(201,168,76,0.1)' : 'transparent',
            }}
          >
            <IconSpeaker off={!showPlayer} />
          </button>
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            aria-label={showTranslation ? 'Sembunyikan terjemahan' : 'Tampilkan terjemahan'}
            title={showTranslation ? 'Sembunyikan terjemahan' : 'Tampilkan terjemahan'}
            style={{
              color: showTranslation ? 'var(--primary)' : 'var(--muted-fg)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: showTranslation ? 'rgba(201,168,76,0.1)' : 'transparent',
            }}
          >
            <IconEye off={!showTranslation} />
          </button>
          <button
            onClick={toggle}
            aria-label={dark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
            title={dark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
            style={{
              color: 'var(--muted-fg)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: 'transparent',
            }}
          >
            {dark ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>

      {/* Bismillah header */}
      <div className="relative overflow-hidden px-6 pt-8 pb-6 text-center pattern-bg">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--header-line-gradient)' }} />
        <p className="arabic-text" style={{ fontSize: '22px', color: 'var(--accent)', marginBottom: 6 }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p style={{ color: 'var(--muted-fg)', fontSize: '12px', fontStyle: 'italic' }}>
          Dengan nama Allah Yang Maha Pengasih, Maha Penyayang
        </p>
        <p className="arabic-text mt-3" style={{ fontSize: '28px', color: 'var(--primary)', lineHeight: 1.4 }}>
          {surah.name}
        </p>
      </div>

      {/* Arabic font size */}
      <div className="flex items-center justify-between px-5 py-3">
        <span style={{ color: 'var(--muted-fg)', fontSize: '12px', fontWeight: 500 }}>Ukuran font Arab</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateArabicFontSize(arabicFontSize - 2)}
            aria-label="Perkecil font Arab"
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--muted-fg)',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            −
          </button>
          <input
            type="number"
            min={18}
            max={40}
            step={2}
            value={arabicFontSize}
            onChange={(event) => updateArabicFontSize(Number(event.target.value))}
            aria-label="Ukuran font Arab"
            style={{
              width: 54,
              height: 30,
              borderRadius: 6,
              background: 'var(--input-bg)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: 600,
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <button
            onClick={() => updateArabicFontSize(arabicFontSize + 2)}
            aria-label="Perbesar font Arab"
            style={{
              width: 30, height: 30, borderRadius: 6,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--primary)',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Verses */}
      <div className={showPlayer ? 'px-3 pb-36' : 'px-5 pb-8'}>
        {!showTranslation ? (
          <div
            className="arabic-text"
            style={{
              color: 'var(--fg)',
              fontSize: `${arabicFontSize}px`,
              lineHeight: 2.4,
              padding: '18px 8px 28px',
              textAlign: 'justify',
            }}
          >
            {verses.map((v) => (
              <span
                key={v.num}
                id={`ayah-${v.num}`}
                data-ayah={v.num}
                onClick={() => openVerse(v)}
                style={{ cursor: 'pointer', background: activeVerse === v.num ? 'var(--verse-hover)' : 'transparent' }}
              >
                {v.arabic}{' '}
                <span
                  style={{
                    color: 'var(--primary)',
                    fontSize: `${Math.max(12, arabicFontSize * 0.5)}px`,
                    margin: '0 6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ﴿{toArabicNumber(v.num)}﴾
                </span>{' '}
              </span>
            ))}
          </div>
        ) : (
          verses.map((v) => (
            <button
              key={v.num}
              id={`ayah-${v.num}`}
              data-ayah={v.num}
              onClick={() => openVerse(v)}
              className="w-full text-left"
              style={{
                background: activeVerse === v.num ? 'var(--verse-hover)' : 'transparent',
                border: `1px solid ${activeVerse === v.num ? 'var(--verse-border)' : 'transparent'}`,
                borderRadius: 12,
                padding: '10px',
                marginBottom: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}
                >
                  <span className="arabic-text" style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 600, lineHeight: 1 }}>{toArabicNumber(v.num)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBookmark(v)
                  }}
                  style={{ color: bookmarked.has(getBookmarkId(surahId, v.num)) ? 'var(--primary)' : 'var(--muted-fg)' }}
                >
                  <IconBookmark filled={bookmarked.has(getBookmarkId(surahId, v.num))} />
                </button>
              </div>
              <p className="arabic-text" style={{ fontSize: `${arabicFontSize}px`, color: 'var(--fg)', marginBottom: 16, lineHeight: 2.1 }}>
                {v.arabic}
              </p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '13px', lineHeight: 1.8, fontStyle: 'italic' }}>
                {v.translation}
              </p>
            </button>
          ))
        )}
        {loadingMore && (
          <p style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '18px 0', fontSize: '12px' }}>Memuat ayat berikutnya...</p>
        )}
        {loadMoreErrorPage && (
          <div className="px-2 py-6 text-center">
            <p style={{ color: 'var(--muted-fg)', fontSize: '12px', lineHeight: 1.7, marginBottom: 12 }}>
              Halaman {loadMoreErrorPage} belum berhasil dimuat. Ayat berikutnya tidak akan dilanjutkan dulu agar urutan ayat tetap lengkap.
            </p>
            <button
              onClick={() => setRetryLoadMoreKey((key) => key + 1)}
              className="rounded-lg px-4 py-2"
              style={{
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--primary)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Coba muat lagi
            </button>
          </div>
        )}
        {!hasMoreVerses && !loadingMore && !loadMoreErrorPage && (
          <div
            className="mt-6 rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="serif-heading" style={{ color: 'var(--fg)', fontSize: '17px', fontWeight: 600, marginBottom: 6 }}>
              {surahId < 114 ? 'Lanjut ke Surah Berikutnya' : 'Khatam Surah Terakhir'}
            </p>
            <p style={{ color: 'var(--muted-fg)', fontSize: '12px', lineHeight: 1.7, marginBottom: 14 }}>
              {surahId < 114 ? `Kamu sudah sampai akhir Surah ${surah.nameLatin}.` : 'Kamu sudah sampai akhir Surah An-Nas.'}
            </p>
            {surahId < 114 ? (
              <button
                onClick={() => onReadSurah(surahId + 1)}
                className="w-full rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  color: 'var(--primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <span>Surah berikutnya</span>
                <span style={{ transform: 'rotate(180deg)' }}><IconChevronLeft /></span>
              </button>
            ) : (
              <button
                onClick={onBack}
                className="w-full rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  color: 'var(--primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Kembali ke daftar Surah
              </button>
            )}
          </div>
        )}
      </div>

      {/* Audio Player */}
      {showPlayer && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm"
          style={{
            background: 'var(--player-bg)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border)',
            padding: '16px 24px 28px',
          }}
        >
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onEnded={() => setPlaying(false)}
            />
          )}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ color: 'var(--fg)', fontSize: '13px', fontWeight: 500 }}>
                {surah.nameLatin} — <span className="arabic-text inline-block" style={{ lineHeight: 1 }}>{surah.name}</span>
              </p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '11px', marginTop: 1 }}>{audioUrl ? 'Audio tersedia' : 'Audio belum tersedia'}</p>
            </div>
            <button
              onClick={toggleAudio}
              disabled={!audioUrl}
              className="pulse-gold w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: audioUrl ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--muted-bg)',
                color: audioUrl ? 'var(--primary-fg)' : 'var(--muted-fg)',
                opacity: audioUrl ? 1 : 0.6,
              }}
            >
              <IconPlay playing={playing} />
            </button>
          </div>
          <div className="rounded-full overflow-hidden mb-2" style={{ height: 3, background: 'var(--muted-bg)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 9999 }} />
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{formatAudioTime(currentTime)}</span>
            <span style={{ color: 'var(--muted-fg)', fontSize: '11px' }}>{formatAudioTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BookmarksScreen({ onReadSurah }: { onReadSurah: (id: number, ayah?: number) => void }) {
  const [saved, setSaved] = useState<SavedBookmark[]>(getSavedBookmarks)

  useEffect(() => {
    const syncBookmarks = () => setSaved(getSavedBookmarks())

    window.addEventListener('storage', syncBookmarks)
    window.addEventListener('focus', syncBookmarks)

    return () => {
      window.removeEventListener('storage', syncBookmarks)
      window.removeEventListener('focus', syncBookmarks)
    }
  }, [])

  return (
    <div className="animate-fade-in pb-28">
      <div className="px-6 pt-12 pb-5">
        <h1 className="serif-heading" style={{ color: 'var(--fg)', fontSize: '24px', fontWeight: 600, marginBottom: 4 }}>Tersimpan</h1>
        <p style={{ color: 'var(--muted-fg)', fontSize: '13px' }}>{saved.length} ayat tersimpan</p>
      </div>
      <div className="px-5 space-y-3">
        {saved.map((b) => (
          <button
            key={b.id}
            onClick={() => onReadSurah(b.surahId, b.verse)}
            className="w-full text-left rounded-xl p-5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--primary)' }}><IconBookmark filled /></span>
                <span style={{ color: 'var(--muted-fg)', fontSize: '12px' }}>{b.surahName} · Ayat {b.verse}</span>
              </div>
              <span className="arabic-text" style={{ color: 'var(--primary)', fontSize: '16px' }}>{b.surahArabic}</span>
            </div>
            <p className="arabic-text" style={{ fontSize: '18px', color: 'var(--fg)', marginBottom: 10, lineHeight: 2 }}>
              {b.text}
            </p>
            <p style={{ color: 'var(--muted-fg)', fontSize: '12px', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{b.translation}"
            </p>
          </button>
        ))}
        {saved.length === 0 && (
          <p style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>Belum ada ayat tersimpan.</p>
        )}
      </div>
      <div className="px-5 mt-7">
        <div className="rounded-xl p-5 grid grid-cols-3 gap-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          {[{ label: 'Surah', value: String(new Set(saved.map((b) => b.surahId)).size) }, { label: 'Ayat', value: String(saved.length) }, { label: 'Hari', value: String(new Set(saved.map((b) => b.savedAt.slice(0, 10))).size) }].map((s) => (
            <div key={s.label} className="text-center">
              <p style={{ color: 'var(--primary)', fontSize: '22px', fontWeight: 700, fontFamily: 'Lora, serif' }}>{s.value}</p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '11px', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsScreen() {
  const { dark, toggle } = useTheme()
  const [reciter, setReciter] = useState('Mishary Rashid Alafasy')
  const [translation, setTranslation] = useState('Kementerian Agama')
  const [notifications, setNotifications] = useState(true)

  const reciters = ['Mishary Rashid Alafasy', 'Abdul Basit', 'Mahmoud Khalil Al-Husary', "Sa'd Al-Ghamdi"]
  const translations = ['Kementerian Agama', 'Quraish Shihab', 'Jalalayn', 'Terjemahan Ringkas']

  return (
    <div className="animate-fade-in pb-28">
      <div className="px-6 pt-12 pb-5">
        <h1 className="serif-heading" style={{ color: 'var(--fg)', fontSize: '24px', fontWeight: 600 }}>Pengaturan</h1>
      </div>

      <div className="px-5 space-y-4">
        {/* Theme toggle */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: dark ? 'rgba(201,168,76,0.12)' : 'rgba(255,200,50,0.12)', color: 'var(--primary)' }}
            >
              {dark ? <IconMoon /> : <IconSun />}
            </div>
            <div>
              <p style={{ color: 'var(--fg)', fontSize: '13px', fontWeight: 500 }}>{dark ? 'Mode Malam' : 'Mode Siang'}</p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '11px', marginTop: 1 }}>{dark ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            style={{
              width: 52, height: 28, borderRadius: 99,
              background: dark ? 'var(--primary)' : 'var(--muted-bg)',
              border: `1px solid ${dark ? 'var(--primary)' : 'var(--border)'}`,
              position: 'relative',
              transition: 'all 0.25s',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: dark ? 26 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: dark ? 'var(--primary-fg)' : 'var(--muted-fg)',
                transition: 'all 0.25s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
              }}
            />
          </button>
        </div>

        {/* Reciter */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted-fg)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 16px 8px', fontWeight: 500 }}>Qari</p>
          {reciters.map((r, i) => (
            <button
              key={r}
              onClick={() => setReciter(r)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
            >
              <span style={{ color: reciter === r ? 'var(--fg)' : 'var(--muted-fg)', fontSize: '13px' }}>{r}</span>
              {reciter === r && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'block' }} />
              )}
            </button>
          ))}
        </div>

        {/* Translation */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted-fg)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 16px 8px', fontWeight: 500 }}>Terjemahan</p>
          {translations.map((t, i) => (
            <button
              key={t}
              onClick={() => setTranslation(t)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}
            >
              <span style={{ color: translation === t ? 'var(--fg)' : 'var(--muted-fg)', fontSize: '13px' }}>{t}</span>
              {translation === t && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'block' }} />
              )}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p style={{ color: 'var(--fg)', fontSize: '13px', fontWeight: 500 }}>Notifikasi Salat</p>
              <p style={{ color: 'var(--muted-fg)', fontSize: '11px', marginTop: 2 }}>Terima pengingat waktu salat</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              style={{
                width: 44, height: 24, borderRadius: 99,
                background: notifications ? 'var(--primary)' : 'var(--muted-bg)',
                border: `1px solid ${notifications ? 'var(--primary)' : 'var(--border)'}`,
                position: 'relative',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: notifications ? 22 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: notifications ? 'var(--primary-fg)' : 'var(--muted-fg)',
                  transition: 'all 0.2s',
                }}
              />
            </button>
          </div>
        </div>

        {/* App info */}
        <div className="rounded-xl p-5 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <p className="arabic-text" style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: 8 }}>القرآن الكريم</p>
          <p style={{ color: 'var(--fg)', fontFamily: 'Lora, serif', fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>Al-Quran Al-Karim</p>
          <p style={{ color: 'var(--muted-fg)', fontSize: '12px', marginBottom: 2 }}>Versi 2.1.0</p>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => <IconStar key={s} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Bottom Nav ---
function BottomNav({ page, navigateToPage }: { page: PageId; navigateToPage: (page: PageId) => void }) {
  const items = [
    { id: 'home', label: 'Beranda', Icon: IconHome },
    { id: 'surahs', label: 'Surah', Icon: IconBook },
    { id: 'juz', label: 'Juz', Icon: IconBook },
    { id: 'bookmarks', label: 'Tersimpan', Icon: IconBookmark },
    { id: 'settings', label: 'Pengaturan', Icon: IconSettings },
  ]

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm flex items-end justify-around z-50"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        padding: '10px 8px 20px',
      }}
    >
      {items.map(({ id, label, Icon }) => {
        const active = page === id
        return (
          <button
            key={id}
            onClick={() => navigateToPage(id)}
            className="flex flex-col items-center gap-1 px-2 py-1"
            style={{ color: active ? 'var(--primary)' : 'var(--muted-fg)' }}
          >
            <Icon active={active} />
            <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, letterSpacing: '0.04em' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// --- App ---
export default function App() {
  const [dark, setDark] = useState(getInitialTheme)
  const [page, setPage] = useState<PageId>(() => getPageFromPath(window.location.pathname))
  const [surahList, setSurahList] = useState<Surah[]>([])
  const [detailSurahId, setDetailSurahId] = useState<number | null>(() => getSurahIdFromPath(window.location.pathname))
  const [detailJuzId, setDetailJuzId] = useState<number | null>(() => getJuzIdFromPath(window.location.pathname))

  const handleReadSurah = (id: number, ayah?: number) => {
    setPage('surahs')
    setDetailSurahId(id)
    setDetailJuzId(null)
    window.history.pushState({ page: 'surahs', surahId: id, ayah }, '', `/surah/${id}${ayah ? `?ayah=${ayah}` : ''}`)
  }
  const handleReadJuz = (id: number) => {
    setPage('juz')
    setDetailJuzId(id)
    setDetailSurahId(null)
    window.history.pushState({ page: 'juz', juzId: id }, '', `/juz/${id}`)
  }
  const handleBackToSurahList = () => {
    setDetailSurahId(null)
    setPage('surahs')
    window.history.pushState({ page: 'surahs' }, '', '/surah')
  }
  const handleBackToJuzList = () => {
    setDetailJuzId(null)
    setPage('juz')
    window.history.pushState({ page: 'juz' }, '', '/juz')
  }
  const toggleTheme = () => setDark((d) => !d)
  const navigateToPage = (nextPage: PageId) => {
    const nextRoute = pages.find((route) => route.id === nextPage)

    if (!nextRoute) {
      return
    }

    setDetailSurahId(null)
    setDetailJuzId(null)
    setPage(nextPage)

    if (window.location.pathname !== nextRoute.path) {
      window.history.pushState({ page: nextPage }, '', nextRoute.path)
    }
  }

  useEffect(() => {
    function syncPageWithUrl() {
      setDetailSurahId(getSurahIdFromPath(window.location.pathname))
      setDetailJuzId(getJuzIdFromPath(window.location.pathname))
      setPage(getPageFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', syncPageWithUrl)

    return () => window.removeEventListener('popstate', syncPageWithUrl)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, dark ? 'dark' : 'light')
  }, [dark])

  return (
    <ThemeCtx.Provider value={{ dark, toggle: toggleTheme }}>
      <div
        data-theme={dark ? 'dark' : 'light'}
        style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 425,
            minHeight: '100vh',
            position: 'relative',
            background: 'var(--bg)',
            overflowX: 'hidden',
          }}
        >
          {detailSurahId !== null ? (
            <ReadingScreen surahId={detailSurahId} onBack={handleBackToSurahList} onReadSurah={handleReadSurah} />
          ) : detailJuzId !== null ? (
            <JuzDetailScreen juzId={detailJuzId} onBack={handleBackToJuzList} onReadJuz={handleReadJuz} />
          ) : (
            <>
              <div style={{ overflowY: 'auto', maxHeight: '100vh' }}>
                {page === 'home' && <HomeScreen onReadSurah={handleReadSurah} />}
                {page === 'surahs' && <SurahListScreen onReadSurah={handleReadSurah} surahList={surahList} onLoadSurahs={setSurahList} />}
                {page === 'juz' && <JuzListScreen onReadJuz={handleReadJuz} />}
                {page === 'bookmarks' && <BookmarksScreen onReadSurah={handleReadSurah} />}
                {page === 'settings' && <SettingsScreen />}
              </div>
              <BottomNav page={page} navigateToPage={navigateToPage} />
            </>
          )}
        </div>
      </div>
    </ThemeCtx.Provider>
  )
}
