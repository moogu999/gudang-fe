<template>
  <div class="page-bg">
    <div v-if="isLoading" class="dm" style="text-align: center; padding: 40px">Memuat data...</div>
    <div v-else-if="!detail" class="dm" style="text-align: center; padding: 40px">
      Data tidak ditemukan.
    </div>

    <div v-else class="paper">
      <!-- ══ HEADER ═══════════════════════════════════════════ -->
      <div class="hdr-grid" style="margin-bottom: 6px">
        <div>
          <div class="dm dm-lg bold">{{ detail.companyName ?? '—' }}</div>
          <div v-if="detail.companyAddress" class="dm dm-sm">{{ detail.companyAddress }}</div>
          <div v-if="detail.companyTaxId" class="dm dm-sm faint">
            NPWP: {{ detail.companyTaxId }}
          </div>
        </div>
        <div style="text-align: right">
          <div class="dm dm-lg bold" style="letter-spacing: 0.06em">DELIVERY ORDER</div>
          <div
            v-if="detail.isPartial"
            class="dm dm-sm bold"
            style="color: #b45309; letter-spacing: 0.06em"
          >
            — PARTIAL —
          </div>
          <div class="dm bold" style="font-size: 15px; letter-spacing: 0.02em">{{ detail.no }}</div>
          <div class="dm dm-sm faint">Tgl: {{ formatDate(detail.createdAt) }}</div>
        </div>
      </div>

      <hr class="sep2" />

      <!-- ══ META + CUSTOMER ══════════════════════════════════ -->
      <div class="outlet-grid" style="margin: 5px 0 6px">
        <div>
          <div class="dm dm-sm faint">KEPADA YTH:</div>
          <div class="dm bold" style="font-size: 14px">{{ detail.customerName }}</div>
        </div>
        <div>
          <table
            style="
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              line-height: 1.6;
              width: 100%;
            "
          >
            <tbody>
              <tr>
                <td style="white-space: nowrap; color: #888; width: 120px">No. DO</td>
                <td style="width: 8px; text-align: center">:</td>
                <td class="bold">{{ detail.no }}</td>
              </tr>
              <tr>
                <td style="color: #888">Ref. SO</td>
                <td style="text-align: center">:</td>
                <td class="bold">{{ detail.soNo }}</td>
              </tr>
              <tr v-if="detail.salesmanName">
                <td style="color: #888">Salesman</td>
                <td style="text-align: center">:</td>
                <td>{{ detail.salesmanName }}</td>
              </tr>
              <tr v-if="detail.deliveryDate">
                <td style="color: #888">Tgl. Kirim</td>
                <td style="text-align: center">:</td>
                <td class="bold">{{ formatDate(detail.deliveryDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <hr class="sep3" />

      <!-- ══ ITEMS ════════════════════════════════════════════ -->
      <table class="tbl" style="margin-top: 2px">
        <thead>
          <tr>
            <th style="width: 28px" class="c">No</th>
            <th style="width: 76px">Kode</th>
            <th>Nama Produk</th>
            <th style="width: 64px" class="r">Qty</th>
            <th style="width: 96px" class="r">Harga Satuan</th>
            <th style="width: 72px" class="r">Disc (%)</th>
            <th style="width: 112px" class="r">Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, i) in detail.lines" :key="line.productId">
            <td class="c">{{ i + 1 }}</td>
            <td>{{ line.productCode }}</td>
            <td>{{ line.productName }}</td>
            <td class="r">
              <template v-if="(resolveLineLevels(line)?.length ?? 0) > 1">
                {{ decomposeBaseQty(parseFloat(line.quantity), resolveLineLevels(line)!).join(' / ') }}
                <div v-if="getUomLabel(line)" style="font-size: 11px; color: #888">
                  {{ getUomLabel(line) }}
                </div>
              </template>
              <template v-else>{{ formatQty(line.quantity) }}</template>
            </td>
            <td class="r">{{ formatAmount(line.price) }}</td>
            <td class="r">{{ formatDiscount(line.discount) }}</td>
            <td class="r">{{ formatAmount(line.subAmount) }}</td>
          </tr>
          <tr v-for="n in fillerRows" :key="`filler-${n}`">
            <td colspan="7" style="padding: 2px 0">&nbsp;</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="bold">TOTAL</td>
            <td class="r bold">{{ totalQty }}</td>
            <td colspan="2"></td>
            <td class="r bold">{{ formatAmount(detail.subtotalAmount) }}</td>
          </tr>
        </tfoot>
      </table>

      <!-- ══ BONUS ITEMS ════════════════════════════════════════ -->
      <template v-if="detail.bonusLines && detail.bonusLines.length > 0">
        <div class="dm dm-sm bold" style="margin-top: 6px; margin-bottom: 2px; color: #166534">
          Bonus / Hadiah
        </div>
        <table class="tbl" style="margin-bottom: 2px">
          <thead>
            <tr>
              <th style="width: 28px" class="c">No</th>
              <th style="width: 120px">Kode Promo</th>
              <th style="width: 76px">Kode Produk</th>
              <th>Nama Produk</th>
              <th style="width: 64px" class="r">Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, i) in detail.bonusLines" :key="line.productId" style="color: #166534">
              <td class="c">{{ i + 1 }}</td>
              <td>{{ line.promotionCode }}</td>
              <td>{{ line.productCode }}</td>
              <td>{{ line.productName }}</td>
              <td class="r">
                <template v-if="(resolveBonusLineLevels(line)?.length ?? 0) > 1">
                  +{{ decomposeBaseQty(parseFloat(line.quantity), resolveBonusLineLevels(line)!).join(' / ') }}
                </template>
                <template v-else>+{{ formatQty(line.quantity) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <hr class="sep" style="margin-top: 4px" />

      <!-- ══ BOTTOM: TERBILANG + TOTALS + SIGN ════════════════ -->
      <div class="bottom-grid">
        <div style="display: flex; flex-direction: column; gap: 6px">
          <div class="dm dm-sm">
            Terbilang : <span class="bold ul">{{ terbilang }} Rupiah</span>
          </div>

          <div v-if="detail.remark" class="dm dm-sm faint">
            Catatan&nbsp;&nbsp;&nbsp;: {{ detail.remark }}
          </div>

          <div class="sign-grid" style="margin-top: 4px">
            <div class="sign-box">
              <div class="dm dm-sm center">Dibuat oleh,</div>
              <div class="sign-line">Admin / Kasir</div>
            </div>
            <div class="sign-box">
              <div class="dm dm-sm center">Dikirim oleh,</div>
              <div class="sign-line">Driver / Salesman</div>
              <div
                v-if="detail.salesmanName"
                class="dm center faint"
                style="font-size: 11px; margin-top: 2px"
              >
                {{ detail.salesmanName }}
              </div>
            </div>
            <div class="sign-box">
              <div class="dm dm-sm center">Diterima oleh,</div>
              <div class="sign-line">Penerima / Cap Toko</div>
              <div class="dm center faint" style="font-size: 11px; margin-top: 2px">
                Tgl: ___/___/{{ currentYear }}
              </div>
            </div>
          </div>
        </div>

        <div>
          <table class="tot-tbl">
            <tbody>
              <tr>
                <td style="color: #888">Subtotal</td>
                <td>{{ formatAmount(detail.subtotalAmount) }}</td>
              </tr>
              <tr>
                <td style="color: #888">Diskon</td>
                <td>{{ formatAmount(detail.discountAmount) }}</td>
              </tr>
              <tr>
                <td style="color: #888">Tax Base</td>
                <td>{{ formatAmount(detail.taxBaseAmount) }}</td>
              </tr>
              <tr>
                <td style="color: #888">PPN</td>
                <td>{{ formatAmount(detail.taxAmount) }}</td>
              </tr>
              <tr class="grand">
                <td>TOTAL</td>
                <td style="font-size: 15px">Rp {{ formatAmount(detail.totalAmount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ FOOTER ════════════════════════════════════════════ -->
      <hr class="sep" style="margin-top: 8px" />
      <div class="dm dm-sm faint">Dicetak: Gudang DMS &nbsp;|&nbsp; {{ printTimestamp }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { DeliveryOrdersService } from '@/services'
import { decimalToWords } from '@/utils/numberToWords'
import type {
  DeliveryOrderDetail,
  DeliveryOrderViewLine,
  DeliveryOrderBonusLine,
  DeliveryOrderUomLevel,
  UomConversionLevel,
} from '@/types'
import dayjs from 'dayjs'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'

const route = useRoute()

const detail = ref<DeliveryOrderDetail | null>(null)
const isLoading = ref(true)

const currentYear = new Date().getFullYear()
const printTimestamp = dayjs().format('DD/MM/YYYY HH:mm')

const MIN_ROWS = 10

const fillerRows = computed(() => {
  const used = detail.value?.lines.length ?? 0
  return Math.max(0, MIN_ROWS - used)
})

const totalQty = computed(() => {
  if (!detail.value) return '0'
  const sum = detail.value.lines.reduce((acc, l) => acc + parseFloat(l.quantity), 0)
  return formatQty(sum.toString())
})

const terbilang = computed(() => {
  if (!detail.value) return ''
  return decimalToWords(detail.value.totalAmount)
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return dayjs(iso).format('DD MMM YYYY')
}

function formatAmount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '—'
  return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatQty(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num)) return '—'
  return num % 1 === 0 ? num.toFixed(0) : num.toString()
}

function doLevelsToUomLevels(levels: DeliveryOrderUomLevel[]): UomConversionLevel[] {
  return levels.map((l) => ({
    id: l.id,
    uomGroupId: 0,
    levelOrder: l.levelOrder,
    uomId: 0,
    qtyPerParent: l.qtyPerParent,
    uom: { id: l.id, name: l.uomSymbol, symbol: l.uomSymbol },
  }))
}

function resolveLineLevels(line: DeliveryOrderViewLine): UomConversionLevel[] | undefined {
  return (
    pinnedToLevels(line.pinnedUom) ??
    (line.uomGroup?.levels?.length ? doLevelsToUomLevels(line.uomGroup.levels) : undefined)
  )
}

function resolveBonusLineLevels(line: DeliveryOrderBonusLine): UomConversionLevel[] | undefined {
  return (
    pinnedToLevels(line.pinnedUom) ??
    (line.uomGroup?.levels?.length ? doLevelsToUomLevels(line.uomGroup.levels) : undefined)
  )
}

function getUomLabel(line: DeliveryOrderViewLine): string | undefined {
  const levels = resolveLineLevels(line)
  if (!levels?.length) return undefined
  if (levels.length === 1) return levels[0].uom?.symbol
  return levels.map((l) => l.uom?.symbol ?? '?').join(' / ')
}

function formatDiscount(decStr: string): string {
  const num = parseFloat(decStr)
  if (isNaN(num) || num === 0) return '—'
  return `${num}%`
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (isNaN(id)) {
    isLoading.value = false
    return
  }
  try {
    detail.value = await DeliveryOrdersService.get(id)
  } catch {
    isLoading.value = false
    return
  }
  isLoading.value = false
  await nextTick()
  // Wait for the browser to finish painting the updated DOM before printing
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
  window.print()
})
</script>

<style>
/* Non-scoped: this is a dedicated standalone page with no layout wrapper */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.page-bg {
  background: #cccac2;
  font-family: 'Courier New', Courier, monospace;
  padding: 28px 24px 48px;
  min-height: 100vh;
}

/* ── PAPER — A4 landscape ──────────────────────────────── */
.paper {
  width: 1123px;
  min-height: 794px;
  margin: 0 auto 32px;
  background: #fdfcf8;
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.3);
  padding: 24px 32px 24px 32px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.dm {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #1a1a18;
}

.dm-sm {
  font-size: 11.5px;
}
.dm-lg {
  font-size: 15px;
}
.bold {
  font-weight: 700;
}
.ul {
  text-decoration: underline;
}
.faint {
  color: #888;
}
.right {
  text-align: right;
}
.center {
  text-align: center;
}

hr.sep {
  border: none;
  border-top: 1px dashed #999;
  margin: 5px 0;
}
hr.sep2 {
  border: none;
  border-top: 2px solid #1a1a18;
  margin: 5px 0;
}
hr.sep3 {
  border: none;
  border-top: 1px solid #1a1a18;
  margin: 3px 0;
}

.hdr-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 24px;
  align-items: start;
}

.outlet-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 32px;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #1a1a18;
}

.tbl th {
  font-weight: 700;
  padding: 2px 6px;
  text-align: left;
  border-top: 1.5px solid #1a1a18;
  border-bottom: 1px solid #1a1a18;
  white-space: nowrap;
}

.tbl td {
  padding: 1px 6px;
  vertical-align: top;
}
.tbl .r {
  text-align: right;
}
.tbl .c {
  text-align: center;
}
.tbl tfoot td {
  border-top: 1px solid #1a1a18;
  font-weight: 700;
  padding-top: 3px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 0 24px;
  align-items: end;
  margin-top: auto;
  padding-top: 8px;
}

.sign-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
}

.sign-box {
  padding: 0 8px;
  border-right: 1px dashed #bbb;
}
.sign-box:first-child {
  padding-left: 0;
}
.sign-box:last-child {
  padding-right: 0;
  border-right: none;
}

.sign-line {
  border-top: 1px solid #1a1a18;
  margin-top: 44px;
  padding-top: 3px;
  font-size: 12px;
  text-align: center;
  font-family: 'Courier New', Courier, monospace;
}

.tot-tbl {
  width: 100%;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.6;
}
.tot-tbl td:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tot-tbl .grand td {
  border-top: 1.5px solid #1a1a18;
  font-weight: 700;
  font-size: 14px;
  padding-top: 3px;
}

@media print {
  .page-bg {
    background: white;
    padding: 0;
    min-height: 0;
  }
  .paper {
    box-shadow: none;
    width: 100%;
    min-height: auto;
    margin: 0;
    padding: 10mm 12mm;
  }
  @page {
    size: A4 landscape;
    margin: 0;
  }
}
</style>
