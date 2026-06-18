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

  const waitingReservations = computed(() =>
    reservations.value.filter(r => r.status === 'waiting')
  )

  const totalWaiting = computed(() => waitingReservations.value.length)

  function getReservationById(id) {
    return reservations.value.find(reservation => reservation.id === id)
  }

  function getReservationsByBook(bookId) {
    return reservations.value.filter(r => r.bookId === bookId)
  }

  function getWaitingReservationsByBook(bookId) {
    return reservations.value
      .filter(r => r.bookId === bookId && r.status === 'waiting')
      .sort((a, b) => a.id - b.id)
  }

  function getFirstWaitingReservation(bookId) {
    const waiting = getWaitingReservationsByBook(bookId)
    return waiting.length > 0 ? waiting[0] : null
  }

  function getReservationsByReader(readerId) {
    return reservations.value.filter(r => r.readerId === readerId)
  }

  function addReservation(reservation) {
    const newId = reservations.value.length > 0
      ? Math.max(...reservations.value.map(r => r.id)) + 1
      : 1

    const today = new Date().toISOString().split('T')[0]

    reservations.value.push({
      ...reservation,
      id: newId,
      reserveDate: today,
      status: 'waiting',
      queuePosition: getWaitingReservationsByBook(reservation.bookId).length + 1
    })

    updateQueuePositions(reservation.bookId)
    return newId
  }

  function cancelReservation(id) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      const bookId = reservations.value[index].bookId
      reservations.value[index].status = 'cancelled'
      reservations.value[index].cancelDate = new Date().toISOString().split('T')[0]
      updateQueuePositions(bookId)
      return true
    }
    return false
  }

  function fulfillReservation(id) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      const bookId = reservations.value[index].bookId
      reservations.value[index].status = 'fulfilled'
      reservations.value[index].fulfillDate = new Date().toISOString().split('T')[0]
      updateQueuePositions(bookId)
      return true
    }
    return false
  }

  function updateQueuePositions(bookId) {
    const waiting = getWaitingReservationsByBook(bookId)
    waiting.forEach((r, index) => {
      const reservation = reservations.value.find(item => item.id === r.id)
      if (reservation) {
        reservation.queuePosition = index + 1
      }
    })
  }

  function hasReaderReserved(bookId, readerId) {
    return reservations.value.some(
      r => r.bookId === bookId && r.readerId === readerId && r.status === 'waiting'
    )
  }

  function searchReservations(keyword) {
    if (!keyword) return reservations.value
    const lowerKeyword = keyword.toLowerCase()
    return reservations.value.filter(reservation =>
      reservation.readerName.toLowerCase().includes(lowerKeyword) ||
      reservation.bookTitle.toLowerCase().includes(lowerKeyword) ||
      reservation.cardNo.toLowerCase().includes(lowerKeyword)
    )
  }

  return {
    reservations,
    loading,
    totalReservations,
    waitingReservations,
    totalWaiting,
    getReservationById,
    getReservationsByBook,
    getWaitingReservationsByBook,
    getFirstWaitingReservation,
    getReservationsByReader,
    addReservation,
    cancelReservation,
    fulfillReservation,
    hasReaderReserved,
    searchReservations
  }
})
