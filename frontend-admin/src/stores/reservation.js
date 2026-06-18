import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

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
    return []
  }

  const reservations = ref(loadReservations())
  const loading = ref(false)

  watch(reservations, (newReservations) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newReservations))
  }, { deep: true })

  const totalReservations = computed(() => reservations.value.length)

  const activeReservations = computed(() =>
    reservations.value.filter(r => r.status === 'waiting').length
  )

  const todayReservations = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return reservations.value.filter(r => r.reserveDate === today).length
  })

  function getReservationById(id) {
    return reservations.value.find(r => r.id === id)
  }

  function getReservationsByBook(bookId) {
    return reservations.value.filter(r => r.bookId === bookId)
  }

  function getActiveReservationsByBook(bookId) {
    return reservations.value
      .filter(r => r.bookId === bookId && r.status === 'waiting')
      .sort((a, b) => a.reserveDate.localeCompare(b.reserveDate) || a.id - b.id)
  }

  function getReservationsByReader(readerId) {
    return reservations.value.filter(r => r.readerId === readerId)
  }

  function getFirstWaitingReservation(bookId) {
    const waiting = getActiveReservationsByBook(bookId)
    return waiting.length > 0 ? waiting[0] : null
  }

  function addReservation(reservation) {
    const newId = reservations.value.length > 0
      ? Math.max(...reservations.value.map(r => r.id)) + 1
      : 1
    const today = new Date().toISOString().split('T')[0]

    const newReservation = {
      ...reservation,
      id: newId,
      reserveDate: today,
      status: 'waiting',
      borrowRecordId: null
    }

    reservations.value.push(newReservation)
    return newId
  }

  function cancelReservation(id) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reservations.value[index].status = 'cancelled'
      reservations.value[index].cancelDate = new Date().toISOString().split('T')[0]
      return true
    }
    return false
  }

  function fulfillReservation(id, borrowRecordId) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reservations.value[index].status = 'fulfilled'
      reservations.value[index].fulfillDate = new Date().toISOString().split('T')[0]
      reservations.value[index].borrowRecordId = borrowRecordId
      return true
    }
    return false
  }

  function hasActiveReservation(bookId, readerId) {
    return reservations.value.some(
      r => r.bookId === bookId && r.readerId === readerId && r.status === 'waiting'
    )
  }

  function getReservationPosition(bookId, readerId) {
    const waiting = getActiveReservationsByBook(bookId)
    const index = waiting.findIndex(r => r.readerId === readerId)
    return index === -1 ? -1 : index + 1
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
    totalReservations,
    activeReservations,
    todayReservations,
    getReservationById,
    getReservationsByBook,
    getActiveReservationsByBook,
    getReservationsByReader,
    getFirstWaitingReservation,
    addReservation,
    cancelReservation,
    fulfillReservation,
    hasActiveReservation,
    getReservationPosition,
    searchReservations
  }
})
