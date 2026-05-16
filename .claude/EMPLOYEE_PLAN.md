# Employee Master Data — Frontend Plan

## Konteks

Halaman baru `Employees` untuk CRUD master data karyawan. Mengikuti pola CRUD view yang sudah ada (`UsersView`, `BranchesView`, dst) + pattern `InfiniteSelect` untuk dropdown FK + pattern `useDialog` / `useConfirmDelete`.

Berbeda dengan view lain, **add & view-detail menggunakan halaman penuh**, bukan dialog. Ini sesuai mockup kedua (form panjang dengan section Identitas/Pekerjaan/Akses sistem). Tabel di halaman list mempertahankan pola `TableComponent`.

Backend endpoint reference: `gudang-be/.claude/EMPLOYEE_PLAN.md`. Endpoint utama:
- `GET /api/v1/employees?employeeTypeId=&branchId=&q=&isActive=...`
- `POST /api/v1/employees` (body `isDraft: boolean`)
- `GET /api/v1/employees/:id` (autofill detail)
- `PUT /api/v1/employees/:id`
- `DELETE /api/v1/employees/:id`
- `GET /gen/v1/employee-types` (untuk filter chip & dropdown tipe karyawan)

## Struktur File

```
src/
├── views/
│   └── employees/
│       ├── EmployeesView.vue           # List + filter chip + tabel
│       ├── EmployeeDetailView.vue      # Form full-page (mode: ADD / VIEW)
│       ├── components/
│       │   ├── EmployeeTypeChips.vue   # Chip filter "Semua / Salesman / Finance / ..."
│       │   ├── EmployeeTypeCard.vue    # Card pilihan tipe (5 card di top form)
│       │   ├── IdentitySection.vue     # Section identitas (nama, KTP, HP, dst)
│       │   ├── EmploymentSection.vue   # Section pekerjaan (branch, dept, dst)
│       │   └── SystemAccessSection.vue # Toggle N-Command & N-Force
│       └── __tests__/
├── services/
│   └── employees.service.ts
│   └── employeeTypes.service.ts
├── types/
│   └── employee.type.ts
└── constants/
    └── api.ts                          # tambah EMPLOYEES, EMPLOYEE_TYPES
```

## Routing

`src/router/index.ts` — semua route butuh permission (MVP: hanya `SUPERADMIN` punya):

```ts
{ path: '/employees',     component: () => import('@/views/employees/EmployeesView.vue'),
  meta: { requiredPermission: PERMISSIONS.EMPLOYEE_READ } },
{ path: '/employees/new', component: () => import('@/views/employees/EmployeeDetailView.vue'),
  props: { mode: 'add' },
  meta: { requiredPermission: PERMISSIONS.EMPLOYEE_CREATE } },
{ path: '/employees/:id', component: () => import('@/views/employees/EmployeeDetailView.vue'),
  props: route => ({ mode: 'view', id: Number(route.params.id) }),
  meta: { requiredPermission: PERMISSIONS.EMPLOYEE_READ } },
```

Tambah ke `src/constants/permissions.ts` (sinkron dengan ID backend hasil migration):
```ts
EMPLOYEE_READ:        NN+1,
EMPLOYEE_CREATE:      NN+2,
EMPLOYEE_UPDATE:      NN+3,
EMPLOYEE_DELETE:      NN+4,
EMPLOYEE_TYPE_READ:   NN+5,
// ...
```

## Menu

`src/components/menu/menu.ts` — tambahkan di group `Organizations` (atau buat group baru `HR / Karyawan`):

```ts
{
  label: 'Employees',
  labelKey: 'navigation.employees',
  route: '/employees',
}
```

Tambah translation key `navigation.employees` di `en-US.ts` & `id-ID.ts`.

## Types

`src/types/employee.type.ts`:

```ts
export type EmploymentStatus = 'Kontrak' | 'Tetap' | 'Freelance'

export interface EmployeeType {
  id: number
  name: string
  description?: string
}

export interface Employee {
  id: number
  nip: string | null
  employeeTypeId: number
  employeeType?: EmployeeType
  // Identitas
  name: string
  nickname?: string
  ktpNumber?: string
  phoneNumber?: string
  email?: string
  birthDate?: string       // ISO date
  address?: string
  photoUrl?: string
  // Pekerjaan
  branchId?: number
  branch?: { id: number; name: string }
  departmentId?: number
  department?: { id: number; name: string }
  divisionId?: number
  division?: { id: number; name: string }
  salesOrganizationId?: number
  salesOrganization?: { id: number; name: string }
  joinDate?: string
  employmentStatus: EmploymentStatus
  supervisorId?: number
  supervisor?: { id: number; name: string; nip: string | null }
  isActive: boolean
  // Akses sistem
  accessNcommand: boolean
  accessNforce: boolean
  isDraft: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateEmployeeDto { /* same fields, semua optional kecuali name + employeeTypeId saat draft */ }
export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}
```

## Service

`src/services/employees.service.ts` mengikuti pola `UsersService`. Custom endpoint `/api/v1/employees`, bukan `/gen/v1/...`, karena backend punya logic NIP + draft.

```ts
export class EmployeesService {
  private static readonly BASE_URL = '/api/v1/employees'
  static list(query?: string): Promise<Base<Employee>> { ... }
  static summary(): Promise<{ active: number; inactive: number; draft: number }> { ... }
  static get(id: number): Promise<Employee> { ... }
  static create(data: CreateEmployeeDto): Promise<Employee> { ... }
  static update(id: number, data: UpdateEmployeeDto): Promise<Employee> { ... }
  static delete(id: number): Promise<void> { ... }
  static uploadPhoto(id: number, file: File): Promise<{ photoUrl: string }> { ... }
}
```

`employeeTypes.service.ts` pakai `/gen/v1/employee-types`.

`src/constants/api.ts`:
```ts
EMPLOYEES: '/api/v1/employees',
EMPLOYEE_TYPES: '/gen/v1/employee-types',
```

## Halaman List — `EmployeesView.vue`

Layout (referensi mockup #1):
1. **Header**: Judul "Karyawan" + sub-count `{N} aktif · {M} non-aktif` (cukup ini untuk MVP, **skip** "cuti · resigned"). Tombol kanan `+ Tambah karyawan` → `router.push('/employees/new')`.
2. **Chip Filter Tipe Karyawan**: chip "Semua" + 5 chip tipe (dari `EmployeeTypesService.list`). Klik chip → set filter `employeeTypeId` + reload tabel. Gunakan PrimeVue `Tag`/`Chip` atau custom button group.
3. **Filter Bar**: search input (NIK/nama/HP), dropdown cabang (`InfiniteSelect` ke `BranchesService`), dropdown department, dropdown status aktif/nonaktif. **Skip** filter "tim penjualan" — follow-up nanti.
4. **TableComponent** — kolom: foto (avatar), nama + NIP + HP (stacked), tipe (chip), cabang, **status** (Tag), aksi (tombol "Detail" → `router.push('/employees/${id}')`).

**Kolom Status (user-friendly, gabungkan `isDraft` + `isActive`)**:
- `isDraft === true` → Tag kuning/amber `⚠ Draft` (prioritas tertinggi — data belum lengkap, butuh dilengkapi). Tooltip on hover: "Data belum lengkap. Klik Detail untuk melengkapi."
- `isDraft === false && isActive === true` → Tag hijau `● Aktif`.
- `isDraft === false && isActive === false` → Tag abu-abu `○ Non-aktif`.

Helper di view:
```ts
function getStatusTag(emp: Employee) {
  if (emp.isDraft) return { severity: 'warn', icon: 'pi pi-exclamation-triangle', label: t('employees.status.draft') }
  if (emp.isActive) return { severity: 'success', label: t('employees.status.active') }
  return { severity: 'secondary', label: t('employees.status.inactive') }
}
```

Sebagai filter tambahan di filter bar: dropdown **Status** dengan opsi `Semua / Draft / Aktif / Non-aktif` → translate ke querystring (`isDraft=true` ATAU `isActive=true/false`). Default tampilkan semua kecuali yang ter-soft-delete.

Tambah translation key:
- `employees.status.draft` = "Draft" / "Draft"
- `employees.status.active` = "Aktif" / "Active"
- `employees.status.inactive` = "Non-aktif" / "Inactive"
- `employees.status.draftTooltip` = "Data belum lengkap. Klik Detail untuk melengkapi." / "Incomplete data. Click Detail to complete."

**Skip MVP**: bulk action multi-select (Export + Non-aktifkan) — follow-up nanti. Tidak perlu render checkbox kolom & action bar "X karyawan dipilih".

Untuk sub-count `aktif / non-aktif / draft`: panggil **`GET /api/v1/employees/summary`** sekali (BE returns `{ active, inactive, draft }`). Lebih ringkas daripada 3× list call. Render: `{active} aktif · {inactive} non-aktif · {draft} draft`.

Filter state digabung ke `GenericQueryBuilder` lalu di-pass ke `TableComponent` lewat prop `url` (reactive watch — set ulang URL saat filter berubah, lalu `table.value.clearSearch()` untuk refresh).

Implementasi delete pakai `useConfirmDelete` seperti view lain (tombol di kolom action / overflow menu).

## Halaman Detail — `EmployeeDetailView.vue` (full-page, BUKAN dialog)

Dua mode via prop:
- `mode: 'add'` → form kosong, tombol `Simpan sebagai Draft` + `Simpan`. NIP = input field manual (bukan autogenerated). Badge atas: `Draft · NIP wajib unik per cabang`.
- `mode: 'view'` → fetch detail by id, autofill form, tombol `Simpan` (update). User bisa edit semua field. Tombol Back/← kembali ke list.

Form pakai PrimeVue `Form` + Zod resolver (computed untuk i18n).

### Unsaved Changes Guard

Track `isDirty` state (form mutation detected). Implementasi:

```ts
import { onBeforeRouteLeave } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'

const isDirty = ref(false)
const isSubmitting = ref(false)

// Set isDirty=true di @value-change handler form, reset ke false setelah submit sukses.

onBeforeRouteLeave((to, from, next) => {
  if (!isDirty.value || isSubmitting.value) return next()
  confirm.require({
    group: 'employeeDetail',
    header: t('common.confirm.unsavedTitle'),
    message: t('common.confirm.unsavedMessage'),
    acceptLabel: t('common.actions.leave'),
    rejectLabel: t('common.actions.stay'),
    accept: () => next(),
    reject: () => next(false),
  })
})

// Browser refresh/close guard
window.addEventListener('beforeunload', (e) => {
  if (isDirty.value) { e.preventDefault(); e.returnValue = '' }
})
```

Tambah translation key `common.confirm.unsavedTitle`/`unsavedMessage`, `common.actions.leave`/`stay` di kedua locale.

### Section 1 — Tipe Karyawan
5 `EmployeeTypeCard` (Salesman / Finance / Driver / Collector / Management). Klik → set `employeeTypeId`. Disabled saat edit jika backend mengindikasikan employee sudah punya transaksi (tahap lanjut; sekarang cukup warning text di mockup).

### Section 2 — Identitas
Field: foto (uploader), nama, nickname, **NIP (input manual user, validasi unik per cabang)**, NIK (16 digit), no HP, email, tanggal lahir (PrimeVue `DatePicker`), alamat (`Textarea`).

NIP: input text biasa. Validasi unik per cabang dilakukan di backend — tampilkan error toast bila response 409/`ErrNIPDuplicateInBranch`. Tidak ada autogenerate.

Foto: upload terpisah lewat `EmployeesService.uploadPhoto` setelah employee tersimpan (butuh ID). Sebelum tersimpan, simpan `File` sementara di state lalu trigger upload di success callback. Preview via `URL.createObjectURL` saat sebelum upload, lalu ganti ke `photoUrl` dari response. **Photo URL backend** = relatif (mis. `/uploads/employees/12/abc.jpg`); prefix dengan `VITE_API_BASE_URL` saat render.

### Section 3 — Pekerjaan
- **Company → `InfiniteSelect` (`CompaniesService`)** — wajib, jadi sumber unique NIP. Saat berubah, reset NIP validation state.
- Cabang → `InfiniteSelect` (`BranchesService`) — filter `companyId == selected` via `company_branches`.
- Department → `InfiniteSelect` (`DepartmentsService`)
- Division → `InfiniteSelect` (`DivisionsService`)
- Sales Organization → `InfiniteSelect` (`SalesOrganizationsService`) — mandatory bila tipe = Salesman/Collector, optional selain itu.
- Tanggal masuk → `DatePicker` (optional)
- Status karyawan → PrimeVue `Select` (Kontrak / Tetap / Freelance) dengan `showClear` (optional).
- Atasan langsung → `InfiniteSelect` (`EmployeesService.list`) — filter `salesOrganizationId == current.salesOrganizationId` + exclude diri sendiri. Disabled bila `salesOrganizationId` belum dipilih (kecuali tipe Management → field disembunyikan/optional). Mandatory rule mengikuti matrix di bagian Validasi.
- Status aktif → `ToggleSwitch`

### Section 4 — Akses Sistem
2 toggle: `accessNcommand` (N-Command web) + `accessNforce` (N-Force mobile). Tampilkan info: "Toggle ini menandai apakah karyawan butuh akses sistem. User account & password dibuat manual di modul Access Controls > Users."

### Submit
```ts
async function onFormSubmit(e: FormSubmitEvent, asDraft = false) {
  const payload = buildPayload(e.states, asDraft)
  if (mode === 'add') {
    const created = await EmployeesService.create(payload)
    if (pendingPhoto.value) await EmployeesService.uploadPhoto(created.id, pendingPhoto.value)
    router.replace(`/employees/${created.id}`)
  } else {
    await EmployeesService.update(id, payload)
  }
  toast.add(commonSuccessToast(t('employees.messages.saved'), 'employeeDetail'))
}
```

### Validasi (Zod, computed)

**Mandatory matrix — conditional by `employeeType`** (saat save final, bukan draft):

Selalu mandatory:

| Field |
|---|
| `name`, `employeeTypeId` |
| `companyId` (dropdown wajib) |
| `nip` (unik per company — backend validasi) |
| `ktpNumber` (16 digit numerik) |
| `phoneNumber` |
| `branchId`, `departmentId`, `divisionId` |

Conditional by `employeeType.name`:

| Field | Salesman | Finance | Driver | Collector | Management |
|---|---|---|---|---|---|
| `salesOrganizationId` | ✅ | ⬜ | ⬜ | ✅ | ⬜ |
| `supervisorId` | ✅ | ✅ | ✅ | ✅ | ⬜ |

Optional untuk semua tipe: `nickname`, `email`, `birthDate`, `address`, `photo`, `joinDate`, `employmentStatus` (bila diisi → enum `Kontrak`/`Tetap`/`Freelance`).

Aturan:
- Saat draft: hanya `name` + `employeeTypeId` wajib. Sisanya bebas.
- Saat final save: Zod resolver pakai `superRefine` untuk apply conditional rules berdasarkan `employeeType`. Mandatory field per tipe ditampilkan dinamis (label asterisk muncul/hilang saat user ganti tipe).
- NIP uniqueness divalidasi backend — tangkap response error 409 / `ErrNIPDuplicateInCompany` dan tampilkan inline error di field NIP: "NIP sudah dipakai di company ini."
- Tandai label field optional dengan teks "opsional" di samping label (sesuai mockup, mis. `EMAIL  opsional`).
- Bila `salesOrganizationId` kosong, `supervisorId` dropdown harus juga kosong & disabled (helper: "Pilih Sales Organization dulu" — kecuali tipe Management yang tidak butuh supervisor).

## InfiniteSelect Notes (per existing pattern)

Atasan langsung: panggil `EmployeesService.list` dengan query `q=...&isActive=true`. Pre-populate `initial-option` dari `props.entity.supervisor` saat mode view.

## i18n

Tambah namespace `employees` di kedua locale: `title`, `addButton`, `chips.all`, `chips.salesman`, `chips.finance`, dst, `fields.{nip,name,nickname,ktpNumber,phoneNumber,email,birthDate,address,branch,department,division,salesOrg,joinDate,employmentStatus,supervisor,isActive,accessNcommand,accessNforce}`, `validation.*`, `messages.saved/deleted/draftSaved`.

## Responsif

- Tabel: kolom NIP/HP digabung dengan nama (sudah pola eksisting `hideOnMobile`).
- Form detail: section tetap stacked di mobile; cards tipe karyawan jadi `grid-cols-2` di mobile, `grid-cols-5` di desktop.
- Filter bar di list: collapse ke drawer/search component bila mobile.

## Critical Files

- `src/views/employees/EmployeesView.vue`
- `src/views/employees/EmployeeDetailView.vue` (+ subcomponents)
- `src/services/employees.service.ts`
- `src/services/employeeTypes.service.ts`
- `src/types/employee.type.ts`
- `src/constants/api.ts`
- `src/router/index.ts`
- `src/components/menu/menu.ts`
- `src/i18n/locales/{en-US,id-ID}.ts`

## Verifikasi

1. `npm run type-check` lulus.
2. `npm run lint` bersih.
3. Manual:
   - `/employees` list muncul, filter chip tipe karyawan bekerja, search/filter cabang/department reload tabel.
   - `+ Tambah karyawan` → `/employees/new`, isi minimal (nama + tipe) lalu **Simpan sebagai Draft** → toast sukses, redirect ke `/employees/{id}`, NIP terisi dari backend.
   - Edit di mode view → ubah branch + status → Simpan → reload data, autofill konsisten.
   - Toggle N-Command/N-Force → POST/PUT mengirim flag yang benar (cek network).
   - Delete dari list → confirmation dialog → row hilang.

## Keputusan Final (dikonfirmasi user)

| Topik | Keputusan |
|---|---|
| Sub-count header | `{aktif} aktif · {nonAktif} non-aktif · {draft} draft`. Sumber: `GET /api/v1/employees/summary` (1 call). Skip `cuti · resigned`. |
| Status kolom tabel | Gabungan `isDraft` + `isActive` → Tag tunggal: `Draft` (amber, prioritas) / `Aktif` (hijau) / `Non-aktif` (abu). |
| NIP | Input manual user, **unik per company** (bukan per branch). Tahan transfer cabang. Error 409 → toast + inline. |
| Mandatory matrix | Conditional by `employeeType`: Salesman/Collector wajib `salesOrganizationId`. Management bisa tanpa supervisor & sales org. |
| Akses halaman | MVP: hanya `SUPERADMIN`. Route guard pakai permission `EMPLOYEE_READ`. |
| Audit semantic delete | Soft delete di DB, tapi audit row = `Deleted` (Curr nil) — diff viewer render "Deleted" clear. |
| Upload foto | Tidak masuk audit trail (sengaja). Endpoint terpisah, non-transactional. |
| Bulk action | Skip MVP. Follow-up nanti. Tidak render checkbox kolom. |
| Detail page | Full-page (`/employees/new`, `/employees/:id`). Wajib `unsaved changes guard` via `onBeforeRouteLeave` + `beforeunload`. |
| Filter "tim penjualan" | Skip MVP. |
| NIP | Input manual user, validasi unik per cabang oleh backend (error 409 → toast + inline error). |
| Upload foto | Storage lokal BE. FE kirim `File` via multipart setelah employee tersimpan; render foto = `VITE_API_BASE_URL + photoUrl`. |
| Atasan langsung | Dropdown di-filter ke sales org yang sama (BE menjamin scope, FE pra-filter agar UX bersih). |
