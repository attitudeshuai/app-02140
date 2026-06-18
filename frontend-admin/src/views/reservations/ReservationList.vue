<template>
  <div class="reservation-list">
    <h2 class="page-title">预约管理</h2>

    <!-- 统计卡片 -->
    <a-row :gutter="[16, 16]" class="stat-row">
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich total">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <DatabaseOutlined />
            </div>
            <div class="stat-card-trend up">
              <RiseOutlined />
              <span>{{ todayReservationCount }}</span>
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ reservationStore.reservations.length }}</div>
            <div class="stat-card-label">总预约</div>
          </div>
          <div class="stat-card-footer">
            <span>今日新增 {{ todayReservationCount }} 条</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich waiting">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <ClockCircleOutlined />
            </div>
            <div class="stat-card-badge" v-if="reservationStore.totalWaiting > 0">
              <FieldTimeOutlined />
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ reservationStore.totalWaiting }}</div>
            <div class="stat-card-label">排队中</div>
          </div>
          <div class="stat-card-footer">
            <a-progress
              :percent="waitingPercent"
              :show-info="false"
              stroke-color="#faad14"
              size="small"
            />
            <span>占比 {{ waitingPercent }}%</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich fulfilled">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <CheckCircleOutlined />
            </div>
            <div class="stat-card-badge success">
              <SmileOutlined />
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ reservationStore.totalFulfilled }}</div>
            <div class="stat-card-label">已满足</div>
          </div>
          <div class="stat-card-footer">
            <a-progress
              :percent="fulfilledPercent"
              :show-info="false"
              stroke-color="#52c41a"
              size="small"
            />
            <span>满足率 {{ fulfilledPercent }}%</span>
          </div>
        </div>
      </a-col>
      <a-col :xs="12" :sm="12" :md="6">
        <div class="stat-card-rich cancelled">
          <div class="stat-card-header">
            <div class="stat-card-icon">
              <StopOutlined />
            </div>
          </div>
          <div class="stat-card-body">
            <div class="stat-card-value">{{ reservationStore.totalCancelled }}</div>
            <div class="stat-card-label">已取消</div>
          </div>
          <div class="stat-card-footer">
            <span v-if="reservationStore.totalCancelled > 0" class="text-secondary">
              <CloseCircleOutlined /> 已取消预约
            </span>
            <span v-else class="success-text">
              <CheckOutlined /> 暂无取消
            </span>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 搜索区域 -->
    <div class="search-area animate-slide-down">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <div class="search-input-wrapper">
            <a-input
              v-model:value="searchKeyword"
              placeholder="搜索读者、图书、卡号"
              allow-clear
              @input="onSearchInput"
              class="search-input"
            >
              <template #suffix>
                <SearchOutlined
                  :class="['search-icon', { 'searching': isSearching }]"
                />
              </template>
            </a-input>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-select
            v-model:value="selectedStatus"
            placeholder="选择状态"
            allow-clear
            style="width: 100%"
            @change="handleStatusChange"
          >
            <a-select-option value="waiting">排队中</a-select-option>
            <a-select-option value="fulfilled">已满足</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="24" :md="8" :lg="12" style="text-align: right;">
          <a-button type="primary" @click="showReserveModal" class="add-btn">
            <PlusOutlined /> 新增预约
          </a-button>
        </a-col>
      </a-row>

      <!-- 搜索结果提示 -->
      <transition name="fade-slide">
        <div v-if="searchKeyword || selectedStatus" class="search-result-tip">
          <span class="result-count">
            找到 <strong>{{ filteredReservations.length }}</strong> 条结果
          </span>
          <a-button type="link" size="small" @click="clearFilters" class="clear-btn">
            清除筛选
          </a-button>
        </div>
      </transition>
    </div>

    <!-- 预约表格 -->
    <div :class="['table-container', 'animate-fade-in', { 'table-loading': tableAnimating }]">
      <!-- 加载动画遮罩 -->
      <transition name="fade">
        <div v-if="tableAnimating" class="table-loading-overlay">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <span>搜索中...</span>
          </div>
        </div>
      </transition>

      <a-table
        :columns="columns"
        :data-source="filteredReservations"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10, showTotal: total => `共 ${total} 条` }"
        :row-class-name="getRowClassName"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'reader'">
            <div class="reader-cell" :style="{ animationDelay: `${index * 0.05}s` }">
              <div class="text-primary">{{ record.readerName }}</div>
              <div class="text-secondary">{{ record.cardNo }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'book'">
            <div class="book-cell">
              <div class="text-primary">{{ record.bookTitle }}</div>
              <div class="text-secondary">{{ record.isbn }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'queue'">
            <template v-if="record.status === 'waiting'">
              <a-tag color="orange" class="queue-tag">
                第 {{ reservationStore.getQueuePosition(record.bookId, record.id) }} 位
              </a-tag>
            </template>
            <span v-else class="text-secondary">—</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)" :class="['status-tag', record.status]">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-popconfirm
                v-if="record.status === 'waiting'"
                title="确定要取消该预约吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleCancel(record)"
              >
                <a-button
                  type="link"
                  size="small"
                  danger
                  class="table-action-btn cancel-btn"
                >
                  <CloseOutlined /> 取消预约
                </a-button>
              </a-popconfirm>
              <span v-if="record.status === 'fulfilled'" class="completed-text">
                <CheckCircleOutlined /> 已自动借出
              </span>
              <span v-if="record.status === 'cancelled'" class="cancelled-text">
                <StopOutlined /> 已取消
              </span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增预约弹窗 -->
    <a-modal
      v-model:open="reserveModalVisible"
      title="新增预约"
      :confirm-loading="submitLoading"
      @ok="handleReserveSubmit"
      @cancel="handleModalClose"
      width="500px"
    >
      <a-alert
        v-if="selectedBookInfo"
        type="info"
        show-icon
        :message="`《${selectedBookInfo.title}》当前库存为 0，可为其预约排队`"
        style="margin-bottom: 16px;"
      />
      <a-form
        ref="reserveFormRef"
        :model="reserveForm"
        :rules="reserveRules"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="读者" name="readerId">
          <a-select
            v-model:value="reserveForm.readerId"
            placeholder="请选择读者"
            show-search
            :filter-option="filterReader"
          >
            <a-select-option
              v-for="reader in availableReaders"
              :key="reader.id"
              :value="reader.id"
              :label="reader.name"
            >
              {{ reader.name }} ({{ reader.cardNo }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="图书" name="bookId">
          <a-select
            v-model:value="reserveForm.bookId"
            placeholder="请选择图书（仅可预约已借完的图书）"
            show-search
            :filter-option="filterBook"
            @change="onBookChange"
          >
            <a-select-option
              v-for="book in reservableBooks"
              :key="book.id"
              :value="book.id"
              :label="book.title"
            >
              {{ book.title }} (库存: {{ book.available }}/{{ book.total }})
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  CloseOutlined,
  CheckOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  SmileOutlined,
  StopOutlined,
  CloseCircleOutlined,
  RiseOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { useReservationStore } from '@/stores/reservation'
import { useReaderStore } from '@/stores/reader'
import { useBookStore } from '@/stores/book'

const reservationStore = useReservationStore()
const readerStore = useReaderStore()
const bookStore = useBookStore()

const loading = ref(false)
const searchKeyword = ref('')
const selectedStatus = ref(null)
const reserveModalVisible = ref(false)
const submitLoading = ref(false)
const reserveFormRef = ref(null)
const isSearching = ref(false)
const tableAnimating = ref(false)
let searchTimeout = null

const columns = [
  { title: '读者信息', key: 'reader', width: 160 },
  { title: '图书信息', key: 'book', width: 200 },
  { title: '预约日期', dataIndex: 'reserveDate', key: 'reserveDate', width: 110 },
  { title: '排队位置', key: 'queue', width: 100 },
  { title: '满足日期', dataIndex: 'fulfilledDate', key: 'fulfilledDate', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' }
]

const reserveForm = reactive({
  readerId: null,
  bookId: null
})

const reserveRules = {
  readerId: [{ required: true, message: '请选择读者' }],
  bookId: [{ required: true, message: '请选择图书' }]
}

const todayReservationCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return reservationStore.reservations.filter(r => r.reserveDate === today).length
})

const waitingPercent = computed(() => {
  const total = reservationStore.reservations.length
  if (total === 0) return 0
  return Math.round((reservationStore.totalWaiting / total) * 100)
})

const fulfilledPercent = computed(() => {
  const total = reservationStore.reservations.length
  if (total === 0) return 0
  return Math.round((reservationStore.totalFulfilled / total) * 100)
})

const filteredReservations = computed(() => {
  let result = reservationStore.reservations

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(r =>
      r.readerName.toLowerCase().includes(keyword) ||
      r.bookTitle.toLowerCase().includes(keyword) ||
      r.cardNo.toLowerCase().includes(keyword)
    )
  }

  if (selectedStatus.value) {
    result = result.filter(r => r.status === selectedStatus.value)
  }

  return result
})

const availableReaders = computed(() => {
  return readerStore.readers.filter(r => r.status === 'active')
})

const reservableBooks = computed(() => {
  return bookStore.books.filter(b => b.available === 0)
})

const selectedBookInfo = computed(() => {
  if (!reserveForm.bookId) return null
  return bookStore.getBookById(reserveForm.bookId)
})

function getStatusColor(status) {
  const colors = {
    waiting: 'warning',
    fulfilled: 'success',
    cancelled: 'default'
  }
  return colors[status] || 'default'
}

function getStatusText(status) {
  const texts = {
    waiting: '排队中',
    fulfilled: '已满足',
    cancelled: '已取消'
  }
  return texts[status] || status
}

function filterReader(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function filterBook(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function onBookChange() {
  nextTick(() => {
    reserveFormRef.value?.clearValidate('bookId')
  })
}

function handleStatusChange() {
  triggerSearchAnimation()
}

function onSearchInput() {
  isSearching.value = true

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    isSearching.value = false
    triggerSearchAnimation()
  }, 300)
}

function triggerSearchAnimation() {
  loading.value = true
  tableAnimating.value = true
  setTimeout(() => {
    tableAnimating.value = false
    loading.value = false
  }, 600)
}

function clearFilters() {
  searchKeyword.value = ''
  selectedStatus.value = null
  triggerSearchAnimation()
}

function getRowClassName(record, index) {
  return `table-row-animate row-${index}`
}

function handleModalClose() {
  nextTick(() => {
    reserveFormRef.value?.resetFields()
  })
}

function showReserveModal() {
  reserveForm.readerId = null
  reserveForm.bookId = null
  reserveModalVisible.value = true
  nextTick(() => {
    reserveFormRef.value?.clearValidate()
  })
}

async function handleReserveSubmit() {
  try {
    await reserveFormRef.value.validate()
    submitLoading.value = true

    const reader = readerStore.getReaderById(reserveForm.readerId)
    const book = bookStore.getBookById(reserveForm.bookId)

    if (!reader || !book) {
      message.error('读者或图书信息不存在')
      return
    }

    if (book.available > 0) {
      message.warning('该图书尚有库存，可直接借阅，无需预约')
      return
    }

    if (reservationStore.hasWaitingReservation(book.id, reader.id)) {
      message.warning('该读者已预约此图书，请勿重复预约')
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))

    reservationStore.addReservation({
      readerId: reader.id,
      readerName: reader.name,
      cardNo: reader.cardNo,
      bookId: book.id,
      bookTitle: book.title,
      isbn: book.isbn
    })

    message.success('预约成功，已加入排队')
    reserveModalVisible.value = false
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitLoading.value = false
  }
}

function handleCancel(record) {
  const success = reservationStore.cancelReservation(record.id)
  if (success) {
    message.success('预约已取消')
  } else {
    message.error('取消失败，该预约可能已处理')
  }
}
</script>

<style lang="less" scoped>
.reservation-list {
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 24px;
  }
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card-rich {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
  height: 100%;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    background: #f0f7ff;
  }

  &.total {
    border-left-color: #667eea;
    .stat-card-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .stat-card-value { color: #667eea; }
  }

  &.waiting {
    border-left-color: #faad14;
    .stat-card-icon { background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%); }
    .stat-card-value { color: #faad14; }
  }

  &.fulfilled {
    border-left-color: #52c41a;
    .stat-card-icon { background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%); }
    .stat-card-value { color: #52c41a; }
  }

  &.cancelled {
    border-left-color: #bfbfbf;
    .stat-card-icon { background: linear-gradient(135deg, #8c8c8c 0%, #bfbfbf 100%); }
    .stat-card-value { color: #8c8c8c; }
  }

  .stat-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .stat-card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #fff;
    }

    .stat-card-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;

      &.up {
        background: #f6ffed;
        color: #52c41a;
      }
    }

    .stat-card-badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      background: #fffbe6;
      color: #faad14;
      animation: pulse 1.5s infinite;

      &.success {
        background: #f6ffed;
        color: #52c41a;
        animation: none;
      }
    }
  }

  .stat-card-body {
    margin-bottom: 12px;

    .stat-card-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-card-label {
      font-size: 14px;
      color: #999;
      margin-top: 4px;
    }
  }

  .stat-card-footer {
    font-size: 12px;
    color: #999;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;

    :deep(.ant-progress) {
      margin-bottom: 4px;
    }

    .success-text {
      color: #52c41a;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .text-secondary {
      color: #999;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// ========================================
// 动画定义
// ========================================
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// ========================================
// 动画类
// ========================================
.animate-fade-in {
  animation: fadeIn 0.5s ease-out both;
}

.animate-slide-down {
  animation: slideDown 0.5s ease-out both;
}

// ========================================
// 过渡动画
// ========================================
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.search-area {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .search-input-wrapper {
    position: relative;

    .search-input {
      transition: all 0.3s ease;

      &:focus-within {
        box-shadow: 0 0 0 2px rgba(250, 173, 20, 0.2);
      }
    }

    .search-icon {
      color: rgba(0, 0, 0, 0.45);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        color: #faad14;
        transform: scale(1.1);
      }

      &.searching {
        animation: pulse 0.5s ease-in-out infinite;
        color: #faad14;
      }
    }
  }

  .add-btn {
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(250, 173, 20, 0.4);
    }
  }

  .search-result-tip {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .result-count {
      color: #666;
      font-size: 13px;

      strong {
        color: #faad14;
        font-size: 16px;
        margin: 0 4px;
      }
    }

    .clear-btn {
      font-size: 13px;

      &:hover {
        color: #ff4d4f;
      }
    }
  }
}

.table-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  &.table-loading {
    .ant-table {
      filter: blur(2px);
      pointer-events: none;
    }
  }

  .table-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: 12px;

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;

      .spinner-ring {
        width: 40px;
        height: 40px;
        border: 3px solid #f0f0f0;
        border-top-color: #faad14;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      span {
        color: #faad14;
        font-size: 14px;
      }
    }
  }

  :deep(.ant-table-tbody) {
    .ant-table-row {
      &:hover td {
        background: #fafafa !important;
      }
    }
  }

  .table-action-btn {
    padding: 2px 4px;
    height: auto;
    border-radius: 4px;
    transition: all 0.2s ease;

    &.cancel-btn:hover {
      color: #ff4d4f;
      background: #fff1f0;
    }
  }

  .completed-text {
    color: #52c41a;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .cancelled-text {
    color: #bfbfbf;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.reader-cell,
.book-cell {
  // 保持默认样式
}

.text-primary {
  font-weight: 500;
  color: #1a1a1a;
}

.text-secondary {
  font-size: 12px;
  color: #999;
}

.queue-tag {
  // 保持默认样式
}

.status-tag {
  // 保持默认样式
}
</style>
