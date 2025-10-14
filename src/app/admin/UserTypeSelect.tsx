'use client'

type UserTypeSelectProps = {
  userId: string
  currentType: 'admin' | 'member' | 'quest'
  updateUserType: (formData: FormData) => Promise<void>
}

export default function UserTypeSelect({
  userId,
  currentType,
  updateUserType,
}: UserTypeSelectProps) {
  return (
    <form action={updateUserType}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="userType"
        defaultValue={currentType}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="text-sm bg-surface-75 text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <option value="quest">게스트</option>
        <option value="member">멤버</option>
        <option value="admin">관리자</option>
      </select>
    </form>
  )
}
