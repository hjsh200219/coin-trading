'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { Button, Input, Card, CardBody, CardTitle } from '@/components/ui'

type ProfileCardProps = {
  profile: {
    email: string
    name: string | null
    avatar_url: string | null
    user_type: 'admin' | 'member' | 'quest'
    created_at: string
  }
  updateProfile: (formData: FormData) => Promise<void>
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <div className="flex items-center justify-center gap-3">
      <Button type="submit" disabled={pending || disabled}>
        {pending ? '저장 중...' : '저장'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => window.location.reload()}
      >
        취소
      </Button>
    </div>
  )
}

export default function ProfileCard({ profile, updateProfile }: ProfileCardProps) {
  const [name, setName] = useState(profile.name || '')

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'Admin'
      case 'member':
        return 'Member'
      case 'quest':
        return 'Guest'
      default:
        return userType
    }
  }

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-brand text-background'
      case 'member':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      case 'quest':
        return 'bg-surface-75 text-foreground/60 border border-border'
      default:
        return 'bg-surface-75 text-foreground/60'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 프로필 정보 카드 - 수정 불가 항목 */}
      <Card>
        <CardBody>
          <CardTitle className="mb-6">프로필 정보</CardTitle>

          <div className="flex flex-col items-center mb-6">
            {profile.avatar_url && (
              <Image
                src={profile.avatar_url}
                alt={profile.name || 'User'}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full mb-4"
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground/70 min-w-[80px] flex-shrink-0">
                이메일
              </label>
              <p className="text-foreground">{profile.email}</p>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground/70 min-w-[80px] flex-shrink-0">
                멤버십
              </label>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getUserTypeBadgeColor(
                  profile.user_type
                )}`}
              >
                {getUserTypeLabel(profile.user_type)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground/70 min-w-[80px] flex-shrink-0">
                가입일
              </label>
              <p className="text-foreground">
                {new Date(profile.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 프로필 수정 카드 - 수정 가능 항목 */}
      <Card>
        <CardBody>
          <CardTitle className="mb-6">프로필 수정</CardTitle>

          <form action={updateProfile} className="space-y-6">
            <Input
              type="text"
              id="name"
              name="name"
              label="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              layout="horizontal"
            />

            <SubmitButton disabled={!name.trim() || name === profile.name} />
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
