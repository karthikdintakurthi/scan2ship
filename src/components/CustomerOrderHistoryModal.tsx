'use client'

import { useEffect, useRef, useState } from 'react'

export interface CustomerHistoryOrder {
  id: number
  name: string
  mobile: string
  reseller_mobile?: string | null
  reseller_name?: string | null
  address: string
  city: string
  state: string
  pincode: string
  courier_service: string
  pickup_location: string
  package_value: number
  weight: number
  total_items: number
  product_description?: string | null
  is_cod: boolean
  cod_amount?: number | null
  tracking_id?: string | null
  reference_number?: string | null
  tracking_status?: string | null
  delhivery_api_status?: string | null
  created_at: string
}

interface CustomerOrderHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  mobile: string
  days: number
  orders: CustomerHistoryOrder[]
  truncated?: boolean
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function statusLabel(order: CustomerHistoryOrder): string {
  return order.tracking_status || order.delhivery_api_status || 'pending'
}

export default function CustomerOrderHistoryModal({
  isOpen,
  onClose,
  mobile,
  days,
  orders,
  truncated = false
}: CustomerOrderHistoryModalProps) {
  // `null` = list view; otherwise the id of the order being inspected.
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const selected = selectedId === null
    ? null
    : orders.find(o => o.id === selectedId) ?? null

  // Reset to the list whenever the modal is reopened, so a previous drill-in
  // doesn't persist into the next customer's history.
  useEffect(() => {
    if (isOpen) setSelectedId(null)
  }, [isOpen])

  // Escape closes the detail view first, then the modal. Uses a ref-free
  // dependency on the current view so the handler never goes stale.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (selectedId !== null) setSelectedId(null)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, selectedId, onClose])

  // Focus management: move focus in on open, restore it on close.
  useEffect(() => {
    if (!isOpen) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-history-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="customer-history-title" className="text-lg font-semibold text-gray-900">
              {selected ? `Order #${selected.id}` : 'Existing orders for this customer'}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {selected
                ? `Placed ${formatDate(selected.created_at)}`
                : `${orders.length} order${orders.length === 1 ? '' : 's'} for ${mobile} in the last ${days} day${days === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close customer order history"
            className="ml-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {selected ? (
            <OrderDetail order={selected} />
          ) : (
            <>
              <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Check these before creating a new order — this customer may already have one in progress.
              </p>
              <ul className="divide-y divide-gray-200">
                {orders.map(order => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          #{order.id} · {order.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {formatDate(order.created_at)} · {order.courier_service}
                          {order.tracking_id ? ` · ${order.tracking_id}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {statusLabel(order)}
                        </span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {truncated && (
                <p className="mt-3 text-xs text-gray-500">
                  Showing the most recent {orders.length} orders only. There may be more.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to orders
            </button>
          ) : (
            <span className="text-xs text-gray-500">Select an order to see its details</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue creating order
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-words">{value ?? '—'}</dd>
    </div>
  )
}

function OrderDetail({ order }: { order: CustomerHistoryOrder }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Customer" value={order.name} />
      <Field label="Mobile" value={order.mobile} />
      <div className="sm:col-span-2">
        <Field
          label="Address"
          value={`${order.address}, ${order.city}, ${order.state} - ${order.pincode}`}
        />
      </div>
      <Field label="Courier" value={order.courier_service} />
      <Field label="Pickup location" value={order.pickup_location} />
      <Field label="Tracking ID" value={order.tracking_id || '—'} />
      <Field label="Reference" value={order.reference_number || '—'} />
      <Field label="Status" value={statusLabel(order)} />
      <Field label="Payment" value={order.is_cod ? `COD — ₹${order.cod_amount ?? 0}` : 'Prepaid'} />
      <Field label="Package value" value={`₹${order.package_value}`} />
      <Field label="Weight" value={`${order.weight} g`} />
      <Field label="Total items" value={order.total_items} />
      {order.product_description && (
        <div className="sm:col-span-2">
          <Field label="Product" value={order.product_description} />
        </div>
      )}
      {order.reseller_name || order.reseller_mobile ? (
        <div className="sm:col-span-2">
          <Field
            label="Reseller"
            value={`${order.reseller_name || '—'}${order.reseller_mobile ? ` (${order.reseller_mobile})` : ''}`}
          />
        </div>
      ) : null}
    </dl>
  )
}
