import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { reservations as initialReservations } from '@/data/mockData'

const STORAGE_KEY = 'library_reservations'

export const useReservationStore = defineStore('reservation', () => {
  const loadReservations = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse stored reservations:', e)
      }
    }
    return [...initialReservations]
  }

  const reservations = ref(loadReservations())
  const loading = ref(false)

  watch(reservations, (newReservations) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newReservations))
  }, { deep: true })

  const totalWaiting = computed(() =>
    reservations.value.filter(r => r.status === 'waiting').length
  )

  const totalFulfilled = computed(() =>
    reservations.value.filter(r => r.status === 'fulfilled').length
  )

  const totalCancelled = computed(() =>
    reservations.value.filter(r => r.status === 'cancelled').length
  )

  const todayReservations = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return reservations.value.filter(r => r.reserveDate === today).length
  })

  function getReservationById(id) {
    return reservations.value.find(r => r.id === id)
  }

  function getWaitingReservationsByBook(bookId) {
    return reservations.value
      .filter(r => r.bookId === bookId && r.status === 'waiting')
      .sort((a, b) => new Date(a.reserveDate) - new Date(b.reserveDate))
  }

  function getReservationsByReader(readerId) {
    return reservations.value.filter(r => r.readerId === readerId)
  }

  function getQueuePosition(bookId, reservationId) {
    const waiting = getWaitingReservationsByBook(bookId)
    const index = waiting.findIndex(r => r.id === reservationId)
    return index !== -1 ? index + 1 : null
  }

  function hasWaitingReservation(bookId, readerId) {
    return reservations.value.some(
      r => r.bookId === bookId && r.readerId === readerId && r.status === 'waiting'
    )
  }

  function addReservation(record) {
    const newId = reservations.value.length > 0
      ? Math.max(...reservations.value.map(r => r.id)) + 1
      : 1
    const today = new Date().toISOString().split('T')[0]

    reservations.value.push({
      ...record,
      id: newId,
      reserveDate: today,
      status: 'waiting',
      fulfilledDate: null
    })
    return newId
  }

  function cancelReservation(id) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1 && reservations.value[index].status === 'waiting') {
      reservations.value[index].status = 'cancelled'
      return true
    }
    return false
  }

  function fulfillNext(bookId) {
    const waiting = getWaitingReservationsByBook(bookId)
    if (waiting.length === 0) return null

    const next = waiting[0]
    const index = reservations.value.findIndex(r => r.id === next.id)
    if (index !== -1) {
      reservations.value[index].status = 'fulfilled'
      reservations.value[index].fulfilledDate = new Date().toISOString().split('T')[0]
      return reservations.value[index]
    }
    return null
  }

  function searchReservations(keyword) {
    if (!keyword) return reservations.value
    const lowerKeyword = keyword.toLowerCase()
    return reservations.value.filter(r =>
      r.readerName.toLowerCase().includes(lowerKeyword) ||
      r.bookTitle.toLowerCase().includes(lowerKeyword) ||
      r.cardNo.toLowerCase().includes(lowerKeyword)
    )
  }

  return {
    reservations,
    loading,
    totalWaiting,
    totalFulfilled,
    totalCancelled,
    todayReservations,
    getReservationById,
    getWaitingReservationsByBook,
    getReservationsByReader,
    getQueuePosition,
    hasWaitingReservation,
    addReservation,
    cancelReservation,
    fulfillNext,
    searchReservations
  }
})
