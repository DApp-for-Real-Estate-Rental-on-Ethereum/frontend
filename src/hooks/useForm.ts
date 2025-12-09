"use client"

import type React from "react"

import { useState, useCallback } from "react"

export interface UseFormReturn<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  loading: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e: React.FormEvent) => Promise<void>
  setValues: (values: Partial<T>) => void
  setErrors: (errors: Partial<Record<keyof T, string>>) => void
  reset: () => void
}

/**
 * useForm hook
 *
 * Manages form state and validation
 * Usage: const { values, handleChange, handleSubmit } = useForm(initialValues)
 */
export function useForm<T extends Record<string, any>>(initialValues: T): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [loading, setLoading] = useState(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target
      setValues((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }))
    },
    [],
  )

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))
  }, [])

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => Promise<void> | void) => async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        setLoading(true)
        await onSubmit(values)
      } catch (err) {
        console.error("[v0] Form submission error:", err)
      } finally {
        setLoading(false)
      }
    },
    [values],
  )

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    loading,
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
    setErrors,
    reset,
  }
}
