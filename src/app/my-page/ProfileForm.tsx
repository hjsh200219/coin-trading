'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

type ProfileFormProps = {
  currentName: string
  updateProfile: (formData: FormData) => Promise<void>
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full px-4 py-2 bg-brand text-background rounded-lg font-medium hover:bg-brand-emphasis transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? '저장 중...' : '저장'}
    </button>
  )
}

export default function ProfileForm({ currentName, updateProfile }: ProfileFormProps) {
  const [name, setName] = useState(currentName)

  return (
    <form action={updateProfile} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground/70 mb-2">
          이름
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          className="w-full px-4 py-2 bg-surface-75 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <SubmitButton disabled={!name.trim()} />
    </form>
  )
}
