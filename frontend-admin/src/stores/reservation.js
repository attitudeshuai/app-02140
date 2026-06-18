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

  const totalReservations = computed(() =>
    reservations.value.filter(r => r.status === 'waiting').length
  )

  const totalFulfilled = computed(() =>
    reservations.value.filter(r => r.status === 'fulfilled').length
  )

  function getReservationsByBook(bookId) {
    return reservations.value.filter(
      r => r.bookId === bookId && r.status === 'waiting'
    ).sort((a, b) => new Date(a.reserveDate) - new Date(b.reserveDate))
  }

  function getReservationsByReader(readerId) {
    return reservations.value.filter(r => r.readerId === readerId)
  }

  function getFirstReservation(bookId) {
    const waitingList = getReservationsByBook(bookId)
    return waitingList.length > 0 ? waitingList[0] : null
  }

  function getReservationById(id) {
    return reservations.value.find(r => r.id === id)
  }

  function addReservation(reservation) {
    const newId = reservations.value.length > 0
      ? Math.max(...reservations.value.map(r => r.id)) + 1
      : 1
    const today = new Date().toISOString().split('T')[0]
    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() + 7)

    reservations.value.push({
      ...reservation,
      id: newId,
      reserveDate: today,
      expireDate: expireDate.toISOString().split('T')[0],
      status: 'waiting',
      queuePosition: getReservationsByBook(reservation.bookId).length
    })
    return newId
  }

  function cancelReservation(id) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reservations.value[index].status = 'cancelled'
      reservations.value[index].cancelDate = new Date().toISOString().split('T')[0]
      updateQueuePositions(reservations.value[index].bookId)
      return true
    }
    return false
  }

  function fulfillReservation(id) {
    const index = reservations.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reservations.value[index].status = 'fulfilled'
      reservations.value[index].fulfillDate = new Date().toISOString().split('T')[0]
      updateQueuePositions(reservations.value[index].bookId)
      return true
    }
    return false
  }

  function updateQueuePositions(bookId) {
    const waitingList = reservations.value
      .filter(r => r.bookId === bookId && r.status === 'waiting')
      .sort((a, b) => new Date(a.reserveDate) - new Date(b.reserveDate))

    waitingList.forEach((r, index) => {
      const idx = reservations.value.findIndex(item => item.id === r.id)
      if (idx !== -1) {
        reservations.value[idx].queuePosition = index + 1
      }
    })
  }

  function hasReservation(bookId, readerId) {
    return reservations.value.some(
      r => r.bookId === bookId && r.readerId === readerId && r.status === 'waiting'
    )
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
    totalFulfilled,
    getReservationsByBook,
    getReservationsByReader,
    getFirstReservation,
    getReservationById,
    addReservation,
    cancelReservation,
    fulfillReservation,
    hasReservation,
    searchReservations
  }
})
